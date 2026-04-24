const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const unzipper = require('unzipper');
const { v4: uuidv4 } = require('uuid');
const simpleGit = require('simple-git');
const Repo     = require('../models/Repo');
const aiClient = require('../services/aiClient');
const logger   = require('../utils/logger');

const upload = multer({ dest: '/tmp/uploads/' });

/**
 * POST /api/ingest
 * JSON: { url, branch? }
 * Multipart: file (ZIP), name
 */
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { url, branch = 'main', name } = req.body;
    const repoId    = uuidv4();
    const localPath = `/tmp/repos/${repoId}`;
    fs.mkdirSync(localPath, { recursive: true });

    let repoName = name;

    if (url) {
      repoName = repoName || url.split('/').slice(-2).join('/');
      logger.info(`Cloning ${url} to ${localPath}`);
      const git = simpleGit();
      const cloneUrl = process.env.GITHUB_TOKEN
        ? url.replace('https://', `https://${process.env.GITHUB_TOKEN}@`)
        : url;
      await git.clone(cloneUrl, localPath, ['--depth', '1', '--branch', branch]);
    } else if (req.file) {
      repoName = repoName || req.file.originalname.replace('.zip', '');
      await fs.createReadStream(req.file.path)
        .pipe(unzipper.Extract({ path: localPath }))
        .promise();
      fs.unlinkSync(req.file.path);
    } else {
      return res.status(400).json({ error: 'Provide a GitHub URL or ZIP file.' });
    }

    const repo = await Repo.create({
      name: repoName,
      url: url || null,
      localPath,
      status: 'indexing',
      faissIndexId: repoId
    });

    res.json({ repoId: repo._id, status: 'indexing', message: 'Ingestion started.' });

    // Non-blocking indexing
    aiClient.ingest(repo._id.toString(), localPath, repoId)
      .then(async (result) => {
        await Repo.findByIdAndUpdate(repo._id, {
          status: 'ready',
          totalFiles:  result.totalFiles,
          totalChunks: result.totalChunks,
          graph:       result.graph,
          summary:     result.summary,
          keyFiles:    result.keyFiles,
          updatedAt:   new Date()
        });
        logger.info(`Repo ${repo._id} indexed: ${result.totalChunks} chunks`);
      })
      .catch(async (err) => {
        await Repo.findByIdAndUpdate(repo._id, { status: 'error' });
        logger.error(`Indexing failed for ${repo._id}: ${err.message}`);
      });

  } catch (err) { next(err); }
});

/** GET /api/ingest/:repoId/status */
router.get('/:repoId/status', async (req, res, next) => {
  try {
    const repo = await Repo.findById(req.params.repoId)
      .select('name status totalFiles totalChunks summary keyFiles createdAt');
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    res.json(repo);
  } catch (err) { next(err); }
});

/** GET /api/ingest - list all repos */
router.get('/', async (req, res, next) => {
  try {
    const repos = await Repo.find({})
      .select('name status totalFiles totalChunks createdAt url summary')
      .sort({ createdAt: -1 });
    res.json(repos);
  } catch (err) { next(err); }
});

/** DELETE /api/ingest/:repoId */
router.delete('/:repoId', async (req, res, next) => {
  try {
    const repo = await Repo.findByIdAndDelete(req.params.repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;