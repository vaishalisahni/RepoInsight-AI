const express  = require('express');
const router   = express.Router();
const Repo     = require('../models/Repo');
const aiClient = require('../services/aiClient');

/**
 * POST /api/impact
 * Body: { repoId, filePath }
 * Response: { analysis, relatedFiles }
 */
router.post('/', async (req, res, next) => {
  try {
    const { repoId, filePath } = req.body;
    if (!repoId || !filePath)
      return res.status(400).json({ error: 'repoId and filePath are required.' });

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    if (repo.status !== 'ready')
      return res.status(409).json({ error: 'Repo is still being indexed.' });

    const result = await aiClient.impact({
      faissIndexId: repo.faissIndexId,
      filePath,
      repoName: repo.name
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;