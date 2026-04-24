const express  = require('express');
const router   = express.Router();
const aiClient = require('../services/aiClient');
const Repo     = require('../models/Repo');
const Chunk    = require('../models/Chunk');

router.post('/', async (req, res, next) => {
  try {
    const { repoId, filePath, selection } = req.body;
    if (!repoId || !filePath)
      return res.status(400).json({ error: 'repoId and filePath required.' });

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });

    const chunks = await Chunk.find({ repoId, filePath });

    const result = await aiClient.explain({
      filePath, selection,
      chunks: chunks.map(c => ({
        content: c.content, type: c.type,
        name: c.name, startLine: c.startLine, endLine: c.endLine
      })),
      faissIndexId: repo.faissIndexId,
      repoName: repo.name
    });

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;