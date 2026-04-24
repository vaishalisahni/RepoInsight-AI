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
 * Build a git instance that NEVER prompts for credentials.
 * GIT_TERMINAL_PROMPT=0 and GIT_ASKPASS=echo both prevent interactive auth.
 */
function makeGit() {
  return simpleGit({
    config: ['core.askPass='],         // disable credential helper prompts
  }).env({
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',          // git: never prompt
    GIT_ASKPASS: 'echo',               // return empty string for any password prompt
    SSH_ASKPASS: 'echo',
    GCM_INTERACTIVE: 'Never',          // Git Credential Manager
  });
}

/**
 * Inject token into HTTPS URL.
 * https://github.com/owner/repo  →  https://TOKEN@github.com/owner/repo
 * Handles trailing .git too.
 */
function buildCloneUrl(rawUrl, token) {
  if (!token) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.username = token;
    u.password = '';            // token-only auth (PAT acts as username)
    return u.toString();
  } catch (_) {
    // Fallback for malformed URLs
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

    // Enforce per-user repo limit
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

    if (url) {
      const cleanUrl = url.trim();
      repoName = repoName || cleanUrl.split('/').slice(-2).join('/').replace(/\.git$/, '');

      // Prefer user's personal token, fall back to server env token
      const githubToken = user.getGithubToken?.() || process.env.GITHUB_TOKEN || null;
      const cloneUrl    = buildCloneUrl(cleanUrl, githubToken);

      logger.info(`[ingest] Cloning ${cleanUrl} (branch: ${branch}) for user ${userId} [token: ${githubToken ? 'yes' : 'no'}]`);

      try {
        await makeGit().clone(cloneUrl, localPath, [
          '--depth',  '1',
          '--branch', branch,
          '--single-branch',
        ]);
      } catch (gitErr) {
        fs.rmSync(localPath, { recursive: true, force: true });

        const msg = (gitErr.message || '').toLowerCase();

        if (msg.includes('repository not found') || msg.includes('not found') || msg.includes('does not exist'))
          return res.status(404).json({
            error: 'Repository not found. Check the URL. For private repos, add a GitHub token in Settings.',
            code:  'REPO_NOT_FOUND',
          });

        if (msg.includes('authentication failed') || msg.includes('403') || msg.includes('could not read username'))
          return res.status(403).json({
            error: 'Authentication failed. This is a private repository — go to Settings and add your GitHub Personal Access Token.',
            code:  'AUTH_FAILED',
            actionUrl: '/settings',
          });

        if (msg.includes('remote branch') && (msg.includes('not found') || msg.includes("wasn't found")))
          return res.status(400).json({
            error: `Branch "${branch}" does not exist in this repository.`,
            code:  'BAD_BRANCH',
          });

        if (msg.includes('timeout') || msg.includes('timed out'))
          return res.status(408).json({ error: 'Git clone timed out. Check your internet connection.', code: 'TIMEOUT' });

        logger.error(`[ingest] Git error for ${cleanUrl}: ${gitErr.message}`);
        return res.status(400).json({ error: `Clone failed: ${gitErr.message.slice(0, 300)}`, code: 'CLONE_FAILED' });
      }
    } else if (req.file) {
      repoName = repoName || req.file.originalname.replace(/\.zip$/, '');
      try {
        await fs.createReadStream(req.file.path)
          .pipe(unzipper.Extract({ path: localPath }))
          .promise();
      } catch (_) {
        return res.status(400).json({ error: 'Failed to extract ZIP. Make sure it is a valid archive.' });
      } finally {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }
    } else {
      return res.status(400).json({ error: 'Provide a GitHub URL or ZIP file.' });
    }

    const repo = await Repo.create({
      userId,
      name:         repoName,
      url:          url?.trim() || null,
      localPath,
      status:       'indexing',
      faissIndexId: repoId,
    });

    res.json({ repoId: repo._id, status: 'indexing', message: 'Ingestion started.' });

    // Non-blocking indexing
    aiClient.ingest(repo._id.toString(), localPath, repoId)
      .then(async result => {
        await Repo.findByIdAndUpdate(repo._id, {
          status: 'ready', totalFiles: result.totalFiles, totalChunks: result.totalChunks,
          graph: result.graph, summary: result.summary, keyFiles: result.keyFiles,
          techStack: result.techStack || {}, languages: result.languages || {},
          updatedAt: new Date(), errorMessage: null,
        });
        logger.info(`[ingest] ✓ ${repo._id} — ${result.totalChunks} chunks`);
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

// ── GET /api/ingest — list user's repos ────────────────────────────────────
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
    if (fs.existsSync(faissDir)) fs.rmSync(faissDir, { recursive: true, force: true });

    res.json({ message: 'Deleted.' });
  } catch (err) { next(err); }
});

// ── POST /api/ingest/:repoId/reindex ───────────────────────────────────────
router.post('/:repoId/reindex', async (req, res, next) => {
  try {
    const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.user.id });
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    if (repo.status === 'indexing') return res.status(409).json({ error: 'Already indexing.' });
    if (!repo.localPath || !fs.existsSync(repo.localPath))
      return res.status(400).json({ error: 'Local clone not found. Please re-ingest from source URL.' });

    await Repo.findByIdAndUpdate(repo._id, { status: 'indexing', errorMessage: null });
    res.json({ message: 'Re-indexing started.' });

    aiClient.ingest(repo._id.toString(), repo.localPath, repo.faissIndexId)
      .then(async result => {
        await Repo.findByIdAndUpdate(repo._id, {
          status: 'ready', totalFiles: result.totalFiles, totalChunks: result.totalChunks,
          graph: result.graph, summary: result.summary, keyFiles: result.keyFiles,
          techStack: result.techStack || {}, languages: result.languages || {},
          updatedAt: new Date(), errorMessage: null,
        });
      })
      .catch(async err => {
        await Repo.findByIdAndUpdate(repo._id, { status: 'error', errorMessage: err.message });
      });
  } catch (err) { next(err); }
});

module.exports = router;