const express = require('express');
const router = express.Router();
const aiClient = require('../services/aiClient');
const Repo = require('../models/Repo');

/**
 * POST /api/trace
 * Body: { repoId, entryPoint: "src/index.js", functionName?: "handleLogin" }
 * Response: { steps: [{file, function, line, description}], mermaidDiagram }
 */
router.post('/', async (req, res, next) => {
  try {
    const { repoId, entryPoint, functionName } = req.body;
    if (!repoId || !entryPoint) {
      return res.status(400).json({ error: 'repoId and entryPoint required.' });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });

    const result = await aiClient.trace({
      faissIndexId: repo.faissIndexId,
      graph: repo.graph,
      entryPoint,
      functionName,
      repoName: repo.name
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;