require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json({ limit: '100mb' }));

const ingestPipeline = require('./pipeline/ingestPipeline');
const queryPipeline  = require('./pipeline/queryPipeline');

app.post('/ingest', async (req, res, next) => {
  try {
    const { repoId, localPath, faissIndexId } = req.body;
    if (!localPath || !faissIndexId)
      return res.status(400).json({ error: 'localPath and faissIndexId required.' });
    const result = await ingestPipeline.run(localPath, faissIndexId);
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/query', async (req, res, next) => {
  try { res.json(await queryPipeline.query(req.body)); }
  catch (err) { next(err); }
});

app.post('/explain', async (req, res, next) => {
  try { res.json(await queryPipeline.explain(req.body)); }
  catch (err) { next(err); }
});

app.post('/trace', async (req, res, next) => {
  try { res.json(await queryPipeline.trace(req.body)); }
  catch (err) { next(err); }
});

app.post('/impact', async (req, res, next) => {
  try { res.json(await queryPipeline.impact(req.body)); }
  catch (err) { next(err); }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AI Service on port ${PORT}`));