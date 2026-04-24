require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json({ limit: '100mb' }));

const ingestPipeline = require('./pipeline/ingestPipeline');
const queryPipeline = require('./pipeline/queryPipeline');

app.post('/ingest', async (req, res, next) => {
  try {
    const { repoId, localPath, faissIndexId } = req.body;
    const result = await ingestPipeline.run(localPath, faissIndexId);
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/query', async (req, res, next) => {
  try {
    const result = await queryPipeline.query(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/explain', async (req, res, next) => {
  try {
    const result = await queryPipeline.explain(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/trace', async (req, res, next) => {
  try {
    const result = await queryPipeline.trace(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/impact', async (req, res, next) => {
  try {
    const result = await queryPipeline.impact(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AI Service on port ${PORT}`));