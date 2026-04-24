const express = require('express');
const router = express.Router();
const Repo = require('../models/Repo');
const Chunk = require('../models/Chunk');

/**
 * GET /api/graph/:repoId
 * Response: { nodes: [{id, label, type, filePath}], edges: [{from, to, type}] }
 */
router.get('/:repoId', async (req, res, next) => {
  try {
    const repo = await Repo.findById(req.params.repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });

    // Return stored graph (built during ingestion)
    const graph = repo.graph || { nodes: [], edges: [] };

    // Enrich with chunk-level details
    const chunks = await Chunk.find({ repoId: repo._id })
      .select('filePath type name startLine endLine');

    // Group by file
    const fileMap = {};
    chunks.forEach(c => {
      if (!fileMap[c.filePath]) fileMap[c.filePath] = [];
      if (c.name) fileMap[c.filePath].push({ name: c.name, type: c.type, startLine: c.startLine });
    });

    res.json({
      ...graph,
      fileDetails: fileMap
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;