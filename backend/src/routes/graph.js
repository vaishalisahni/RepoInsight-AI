const express = require('express');
const router  = express.Router();
const Repo    = require('../models/Repo');

/** GET /api/graph/:repoId — return stored dependency graph */
router.get('/:repoId', async (req, res, next) => {
  try {
    const repo = await Repo.findById(req.params.repoId).select('graph status name');
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    if (repo.status !== 'ready')
      return res.status(409).json({ error: `Repo status is "${repo.status}". Wait until indexing is complete.` });
    if (!repo.graph || !repo.graph.nodes)
      return res.status(404).json({ error: 'No graph data available. Re-index the repository.' });

    res.json(repo.graph);
  } catch (err) { next(err); }
});

module.exports = router;