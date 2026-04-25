/**
 * webhook.js — GitHub webhook handler for automatic re-indexing on push
 *
 * Setup on GitHub:
 *   Payload URL: https://your-domain.com/api/webhook/github
 *   Content type: application/json
 *   Secret: (same as repo.webhookSecret)
 *   Events: Just the push event
 *
 * The Repo document already has a `webhookSecret` field. Generate one per repo
 * and store it; GitHub will HMAC-sign the payload with it.
 */

const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const Repo      = require('../models/Repo');
const aiClient  = require('../services/aiClient');
const logger    = require('../utils/logger');

/**
 * Verify GitHub's HMAC-SHA256 signature.
 * Returns true if valid, false otherwise.
 */
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
 * POST /api/webhook/github
 *
 * GitHub sends a push event. We find the matching Repo by clone URL,
 * verify the signature, and kick off a re-index.
 */
router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig   = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  const raw   = req.body;                       // Buffer (because of express.raw)
  const body  = JSON.parse(raw.toString('utf8'));

  // Only handle push events
  if (event !== 'push') {
    return res.json({ ignored: true, reason: `event=${event}` });
  }

  const repoUrl   = body.repository?.clone_url || body.repository?.html_url;
  const repoName  = body.repository?.full_name;
  const pushedBranch = (body.ref || '').replace('refs/heads/', '');

  if (!repoUrl) {
    return res.status(400).json({ error: 'No repository URL in payload.' });
  }

  // Find all matching repos (multiple users could have the same public repo indexed)
  const repos = await Repo.find({
    url: { $regex: repoName, $options: 'i' },
    status: { $in: ['ready', 'error'] },
  }).lean();

  if (!repos.length) {
    return res.json({ ignored: true, reason: 'No matching indexed repos found.' });
  }

  let processed = 0;
  for (const repo of repos) {
    // Verify signature if secret is set
    if (repo.webhookSecret) {
      if (!verifySignature(repo.webhookSecret, raw, sig)) {
        logger.warn(`[webhook] Signature mismatch for repo ${repo._id}`);
        continue;
      }
    }

    // Skip if the push is to a branch we don't have cloned
    // (We don't store the branch, so allow all pushes to trigger re-index)

    // Skip if already indexing
    if (repo.status === 'indexing') {
      logger.info(`[webhook] Repo ${repo._id} already indexing, skipping.`);
      continue;
    }

    if (!repo.localPath) {
      logger.warn(`[webhook] Repo ${repo._id} has no localPath, skipping.`);
      continue;
    }

    logger.info(`[webhook] Push to ${repoName} (branch: ${pushedBranch}) — re-indexing repo ${repo._id}`);

    // Mark as indexing
    await Repo.findByIdAndUpdate(repo._id, { status: 'indexing', errorMessage: null, lastSyncedAt: new Date() });

    // Run async — don't await
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

    processed++;
  }

  res.json({ received: true, processed, repoName, branch: pushedBranch });
});

/**
 * POST /api/webhook/setup/:repoId
 * Generate (or regenerate) a webhook secret for a repo and return it.
 * The user pastes this secret into GitHub's webhook settings.
 */
router.post('/setup/:repoId', async (req, res, next) => {
  try {
    const { repoId } = req.params;
    // Require auth — attach the protect middleware in app.js or inline here:
    // (We'll rely on app.js applying `protect` to /api/webhook)
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

/**
 * DELETE /api/webhook/setup/:repoId
 * Remove the webhook secret (disables webhook verification but keeps it working unsigned).
 */
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