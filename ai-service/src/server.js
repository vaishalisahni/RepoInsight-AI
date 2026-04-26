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

// ── Streaming query endpoint ─────────────────────────────────────────────────
// Returns SSE (text/event-stream). Each event is: data: {"token":"..."}\n\n
// Final event is: data: {"done":true,"sources":[...]}\n\n
app.post('/query/stream', async (req, res, next) => {
  try {
    // Pass res directly so queryStream can write SSE headers + tokens
    await queryPipeline.queryStream({ ...req.body, res });
  } catch (err) {
    // Headers may already be sent; try to send error event
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
    }
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
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