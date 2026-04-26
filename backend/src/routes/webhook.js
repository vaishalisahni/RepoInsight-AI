/**
 * webhook.js — GitHub webhook handler for automatic re-indexing on push
 *
 * Setup on GitHub:
 *   Payload URL: https://your-domain.com/api/webhook/github
 *   Content type: application/json
 *   Secret: (same as repo.webhookSecret)
 *   Events: Just the push event
 */

const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const simpleGit = require('simple-git');
const Repo      = require('../models/Repo');
const aiClient  = require('../services/aiClient');
const logger    = require('../utils/logger');

// ── Helpers ───────────────────────────────────────────────────────────────

function verifySignature(secret, payload, sigHeader) {
  if (!sigHeader) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sigHeader),
      Buffer.from(expected)
    );
  } catch (_) {
    return false;
  }
}

/**
 * Pull latest commits into an already-cloned local repo.
 * Uses the same safe env setup as the initial clone (no askpass, no editor).
 * Returns true on success, false on failure (we don't block re-index on failure).
 */
async function gitPull(localPath, repoId) {
  try {
    const git = simpleGit(localPath).env({
      HOME:    process.env.HOME    || '/root',
      PATH:    process.env.PATH    || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      USER:    process.env.USER    || 'root',
      LOGNAME: process.env.LOGNAME || 'root',
      LANG:    'C',
      LC_ALL:  'C',
      GIT_TERMINAL_PROMPT: '0',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME:     'RepoInsight',
      GIT_AUTHOR_EMAIL:    'bot@repoinsight.ai',
      GIT_COMMITTER_NAME:  'RepoInsight',
      GIT_COMMITTER_EMAIL: 'bot@repoinsight.ai',
      // Conditionally pass TLS cert env vars if set
      ...(process.env.SSL_CERT_FILE  ? { SSL_CERT_FILE:  process.env.SSL_CERT_FILE  } : {}),
      ...(process.env.SSL_CERT_DIR   ? { SSL_CERT_DIR:   process.env.SSL_CERT_DIR   } : {}),
      ...(process.env.CURL_CA_BUNDLE ? { CURL_CA_BUNDLE: process.env.CURL_CA_BUNDLE } : {}),
    });

    await git.pull();
    logger.info(`[webhook] git pull OK for repo ${repoId}`);
    return true;
  } catch (pullErr) {
    // Scrub any embedded token from the error message before logging
    const safeMsg = (pullErr.message || '').replace(/https?:\/\/[^@\s]+@/g, 'https://[token]@');
    logger.warn(`[webhook] git pull failed for repo ${repoId}: ${safeMsg} — will re-index existing clone`);
    return false;
  }
}

// ── POST /api/webhook/github ───────────────────────────────────────────────
router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig   = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  const raw   = req.body;
  const body  = JSON.parse(raw.toString('utf8'));

  if (event !== 'push') {
    return res.json({ ignored: true, reason: `event=${event}` });
  }

  const repoUrl      = body.repository?.clone_url || body.repository?.html_url;
  const repoName     = body.repository?.full_name;
  const pushedBranch = (body.ref || '').replace('refs/heads/', '');

  if (!repoUrl) {
    return res.status(400).json({ error: 'No repository URL in payload.' });
  }

  const repos = await Repo.find({
    url: { $regex: repoName, $options: 'i' },
    status: { $in: ['ready', 'error'] },
  }).lean();

  if (!repos.length) {
    return res.json({ ignored: true, reason: 'No matching indexed repos found.' });
  }

  let processed = 0;
  for (const repo of repos) {
    // Verify HMAC signature if a secret is configured
    if (repo.webhookSecret) {
      if (!verifySignature(repo.webhookSecret, raw, sig)) {
        logger.warn(`[webhook] Signature mismatch for repo ${repo._id}`);
        continue;
      }
    }

    if (repo.status === 'indexing') {
      logger.info(`[webhook] Repo ${repo._id} already indexing, skipping.`);
      continue;
    }

    if (!repo.localPath) {
      logger.warn(`[webhook] Repo ${repo._id} has no localPath, skipping.`);
      continue;
    }

    logger.info(`[webhook] Push to ${repoName} (branch: ${pushedBranch}) — pulling + re-indexing repo ${repo._id}`);

    await Repo.findByIdAndUpdate(repo._id, {
      status:       'indexing',
      errorMessage: null,
      lastSyncedAt: new Date(),
    });

    // Run async — don't await in request handler
    (async () => {
      // ── 1. Pull latest code ──────────────────────────────────────────
      await gitPull(repo.localPath, repo._id);

      // ── 2. Re-index (ingestPipeline now clears FAISS before re-indexing)
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
          logger.info(`[webhook] ✓ Re-indexed ${repo._id} after push to ${repoName}`);
        })
        .catch(async err => {
          await Repo.findByIdAndUpdate(repo._id, { status: 'error', errorMessage: err.message });
          logger.error(`[webhook] ✗ Re-index failed for ${repo._id}: ${err.message}`);
        });
    })();

    processed++;
  }

  res.json({ received: true, processed, repoName, branch: pushedBranch });
});

// ── POST /api/webhook/setup/:repoId ───────────────────────────────────────
router.post('/setup/:repoId', async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const repo = await Repo.findOne({ _id: repoId, userId });
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });

    const secret = crypto.randomBytes(32).toString('hex');
    repo.webhookSecret = secret;
    await repo.save({ validateBeforeSave: false });

    const webhookUrl = `${process.env.FRONTEND_URL?.replace(':3000', ':4000') || 'http://localhost:4000'}/api/webhook/github`;

    res.json({
      webhookUrl,
      secret,
      instructions: [
        `1. Go to your GitHub repo → Settings → Webhooks → Add webhook`,
        `2. Set Payload URL to: ${webhookUrl}`,
        `3. Set Content type to: application/json`,
        `4. Set Secret to the value above`,
        `5. Choose "Just the push event"`,
        `6. Enable and save`,
      ],
    });
  } catch (err) { next(err); }
});

// ── DELETE /api/webhook/setup/:repoId ─────────────────────────────────────
router.delete('/setup/:repoId', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    await Repo.findOneAndUpdate(
      { _id: req.params.repoId, userId },
      { $unset: { webhookSecret: '' } }
    );
    res.json({ message: 'Webhook secret removed.' });
  } catch (err) { next(err); }
});

module.exports = router;