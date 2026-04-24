const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const fs        = require('fs');
const unzipper  = require('unzipper');
const { v4: uuidv4 } = require('uuid');
const simpleGit = require('simple-git');
const Repo      = require('../models/Repo');
const User      = require('../models/User');
const aiClient  = require('../services/aiClient');
const logger    = require('../utils/logger');
const { protect } = require('../middleware/auth');

const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip'))
      return cb(null, true);
    cb(new Error('Only ZIP files are allowed.'));
  },
});

router.use(protect);

/**
 * WHY THIS WORKS:
 *
 * git 2.35.2+ blocks a growing list of env vars unless you opt-in:
 *   GIT_ASKPASS / SSH_ASKPASS  → requires allowUnsafeAskPass
 *   EDITOR / VISUAL / GIT_EDITOR → requires allowUnsafeEditor
 *   core.askPass (via config)  → requires allowUnsafeAskPass
 *
 * The only safe solution: don't set ANY of those vars.
 * Authentication is done entirely by embedding the PAT in the clone URL:
 *   https://TOKEN@github.com/owner/repo
 * git uses HTTP Basic Auth automatically — no prompts, no askpass needed.
 *
 * GIT_TERMINAL_PROMPT=0 is safe (not on the blocked list) and prevents
 * git from opening a TTY prompt if somehow no token is available.
 * GIT_CONFIG_NOSYSTEM=1 stops /etc/gitconfig from injecting its own
 * core.askPass or core.editor back into the process.
 */
function makeGit() {
  return simpleGit().env({
    // Paths git needs to locate itself and make HTTPS requests
    HOME:    process.env.HOME    || '/root',
    PATH:    process.env.PATH    || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    USER:    process.env.USER    || 'root',
    LOGNAME: process.env.LOGNAME || 'root',

    // Predictable locale (avoids garbled error messages)
    LANG:   'C',
    LC_ALL: 'C',

    // TLS cert chain — required for HTTPS on some Linux distros
    ...(process.env.SSL_CERT_FILE  ? { SSL_CERT_FILE:  process.env.SSL_CERT_FILE  } : {}),
    ...(process.env.SSL_CERT_DIR   ? { SSL_CERT_DIR:   process.env.SSL_CERT_DIR   } : {}),
    ...(process.env.CURL_CA_BUNDLE ? { CURL_CA_BUNDLE: process.env.CURL_CA_BUNDLE } : {}),

    // Disable terminal prompt — safe, not on git's blocked list
    GIT_TERMINAL_PROMPT: '0',

    // Ignore /etc/gitconfig so it cannot inject core.askPass or core.editor
    GIT_CONFIG_NOSYSTEM: '1',

    // Dummy identity (prevents "Author identity unknown" on any incidental commits)
    GIT_AUTHOR_NAME:     'RepoInsight',
    GIT_AUTHOR_EMAIL:    'bot@repoinsight.ai',
    GIT_COMMITTER_NAME:  'RepoInsight',
    GIT_COMMITTER_EMAIL: 'bot@repoinsight.ai',

    // ── INTENTIONALLY NOT SET (git blocks these) ───────────────────────
    // GIT_ASKPASS   → allowUnsafeAskPass required → clone error
    // SSH_ASKPASS   → allowUnsafeAskPass required → clone error
    // EDITOR        → allowUnsafeEditor  required → clone error
    // VISUAL        → allowUnsafeEditor  required → clone error
    // GIT_EDITOR    → allowUnsafeEditor  required → clone error
  });
}

/**
 * Embed PAT into the clone URL for credential-free HTTPS auth.
 * https://github.com/owner/repo  →  https://TOKEN@github.com/owner/repo
 */
function buildCloneUrl(rawUrl, token) {
  if (!token) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.username = token;
    u.password = '';   // PAT as username + empty password = GitHub PAT auth
    return u.toString();
  } catch (_) {
    return rawUrl.replace('https://', `https://${encodeURIComponent(token)}@`);
  }
}

// ── POST /api/ingest ───────────────────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { url, branch = 'main', name } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).select('+_githubToken repoLimit');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const repoCount = await Repo.countDocuments({ userId, status: { $ne: 'error' } });
    if (repoCount >= (user.repoLimit || 5)) {
      return res.status(403).json({
        error: `Repo limit reached (${user.repoLimit || 5}). Delete existing repos to add more.`,
        limit: user.repoLimit || 5,
        code:  'REPO_LIMIT',
      });
    }

    const repoId    = uuidv4();
    const localPath = `/tmp/repos/${repoId}`;
    fs.mkdirSync(localPath, { recursive: true });

    let repoName = name?.trim();

    // ── GitHub URL clone ────────────────────────────────────────────────
    if (url) {
      const cleanUrl = url.trim();
      repoName = repoName || cleanUrl.split('/').slice(-2).join('/').replace(/\.git$/, '');

      const githubToken = user.getGithubToken?.() || process.env.GITHUB_TOKEN || null;
      const cloneUrl    = buildCloneUrl(cleanUrl, githubToken);

      logger.info(
        `[ingest] Cloning ${cleanUrl} (branch: ${branch}) ` +
        `for user ${userId} [token: ${githubToken ? 'yes' : 'no'}]`
      );

      try {
        await makeGit().clone(cloneUrl, localPath, [
          '--depth',        '1',
          '--branch',       branch,
          '--single-branch',
        ]);
      } catch (gitErr) {
        fs.rmSync(localPath, { recursive: true, force: true });

        const msg = (gitErr.message || '').toLowerCase();

        if (
          msg.includes('repository not found') ||
          msg.includes('not found')            ||
          msg.includes('does not exist')
        )
          return res.status(404).json({
            error: 'Repository not found. Check the URL. For private repos, add a GitHub token in Settings.',
            code:  'REPO_NOT_FOUND',
          });

        if (
          msg.includes('authentication failed')    ||
          msg.includes('403')                      ||
          msg.includes('could not read username')  ||
          msg.includes('invalid username or password')
        )
          return res.status(403).json({
            error:     'Authentication failed. This is a private repository — go to Settings and add your GitHub Personal Access Token.',
            code:      'AUTH_FAILED',
            actionUrl: '/settings',
          });

        if (
          msg.includes('remote branch') &&
          (msg.includes('not found') || msg.includes("wasn't found"))
        )
          return res.status(400).json({
            error: `Branch "${branch}" does not exist in this repository.`,
            code:  'BAD_BRANCH',
          });

        if (msg.includes('timeout') || msg.includes('timed out'))
          return res.status(408).json({
            error: 'Git clone timed out. Check your internet connection.',
            code:  'TIMEOUT',
          });

        logger.error(`[ingest] Git error for ${cleanUrl}: ${gitErr.message}`);
        return res.status(400).json({
          error: `Clone failed: ${gitErr.message.slice(0, 300)}`,
          code:  'CLONE_FAILED',
        });
      }

    // ── ZIP upload ──────────────────────────────────────────────────────
    } else if (req.file) {
      repoName = repoName || req.file.originalname.replace(/\.zip$/, '');
      try {
        await fs.createReadStream(req.file.path)
          .pipe(unzipper.Extract({ path: localPath }))
          .promise();
      } catch (_) {
        return res.status(400).json({
          error: 'Failed to extract ZIP. Make sure it is a valid archive.',
        });
      } finally {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }

    } else {
      return res.status(400).json({ error: 'Provide a GitHub URL or ZIP file.' });
    }

    // ── Persist + kick off async indexing ───────────────────────────────
    const repo = await Repo.create({
      userId,
      name:         repoName,
      url:          url?.trim() || null,
      localPath,
      status:       'indexing',
      faissIndexId: repoId,
    });

    res.json({ repoId: repo._id, status: 'indexing', message: 'Ingestion started.' });

    aiClient.ingest(repo._id.toString(), localPath, repoId)
      .then(async result => {
        await Repo.findByIdAndUpdate(repo._id, {
          status:       'ready',
          totalFiles:   result.totalFiles,
          totalChunks:  result.totalChunks,
          graph:        result.graph,
          summary:      result.summary,
          keyFiles:     result.keyFiles,
          techStack:    result.techStack  || {},
          languages:    result.languages  || {},
          updatedAt:    new Date(),
          errorMessage: null,
        });
        logger.info(`[ingest] ✓ ${repo._id} — ${result.totalChunks} chunks indexed`);
      })
      .catch(async err => {
        await Repo.findByIdAndUpdate(repo._id, { status: 'error', errorMessage: err.message });
        logger.error(`[ingest] ✗ ${repo._id}: ${err.message}`);
      });

  } catch (err) { next(err); }
});

// ── GET /api/ingest/:repoId/status ─────────────────────────────────────────
router.get('/:repoId/status', async (req, res, next) => {
  try {
    const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.user.id })
      .select('name status totalFiles totalChunks summary keyFiles techStack languages createdAt errorMessage');
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    res.json(repo);
  } catch (err) { next(err); }
});

// ── GET /api/ingest ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const repos = await Repo.find({ userId: req.user.id })
      .select('name status totalFiles totalChunks createdAt url summary techStack languages errorMessage')
      .sort({ createdAt: -1 });
    res.json(repos);
  } catch (err) { next(err); }
});

// ── DELETE /api/ingest/:repoId ──────────────────────────────────────────────
router.delete('/:repoId', async (req, res, next) => {
  try {
    const repo = await Repo.findOneAndDelete({ _id: req.params.repoId, userId: req.user.id });
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });

    if (repo.localPath && fs.existsSync(repo.localPath))
      fs.rmSync(repo.localPath, { recursive: true, force: true });

    const faissDir = `./ai-service/data/faiss_index/${repo.faissIndexId}`;
    if (fs.existsSync(faissDir))
      fs.rmSync(faissDir, { recursive: true, force: true });

    res.json({ message: 'Deleted.' });
  } catch (err) { next(err); }
});

// ── POST /api/ingest/:repoId/reindex ───────────────────────────────────────
router.post('/:repoId/reindex', async (req, res, next) => {
  try {
    const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.user.id });
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    if (repo.status === 'indexing')
      return res.status(409).json({ error: 'Already indexing.' });
    if (!repo.localPath || !fs.existsSync(repo.localPath))
      return res.status(400).json({
        error: 'Local clone not found. Please re-ingest from source URL.',
      });

    await Repo.findByIdAndUpdate(repo._id, { status: 'indexing', errorMessage: null });
    res.json({ message: 'Re-indexing started.' });

    aiClient.ingest(repo._id.toString(), repo.localPath, repo.faissIndexId)
      .then(async result => {
        await Repo.findByIdAndUpdate(repo._id, {
          status:       'ready',
          totalFiles:   result.totalFiles,
          totalChunks:  result.totalChunks,
          graph:        result.graph,
          summary:      result.summary,
          keyFiles:     result.keyFiles,
          techStack:    result.techStack  || {},
          languages:    result.languages  || {},
          updatedAt:    new Date(),
          errorMessage: null,
        });
      })
      .catch(async err => {
        await Repo.findByIdAndUpdate(repo._id, { status: 'error', errorMessage: err.message });
      });
  } catch (err) { next(err); }
});

module.exports = router;