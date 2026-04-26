const express  = require('express');
const router   = express.Router();
const Repo     = require('../models/Repo');
const Session  = require('../models/Session');
const aiClient = require('../services/aiClient');

// ── POST /api/query ── standard (non-streaming) query ─────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { repoId, question, sessionId } = req.body;
    if (!repoId || !question)
      return res.status(400).json({ error: 'repoId and question are required.' });

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    if (repo.status !== 'ready')
      return res.status(409).json({ error: 'Repo is still being indexed. Try again shortly.' });

    let session = sessionId ? await Session.findById(sessionId) : null;
    if (!session) {
      session = await Session.create({
        repoId,
        userId: req.user.id,
        title:  question.slice(0, 60),
        messages: [],
      });
    }

    const history = session.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    const result = await aiClient.query({
      faissIndexId: repo.faissIndexId,
      question,
      history,
      repoName: repo.name
    });

    session.messages.push({ role: 'user', content: question });
    session.messages.push({
      role:    'assistant',
      content: result.answer,
      // ← save snippet so CodeViewerModal can show it
      sources: result.sources.map(s => ({
        filePath:  s.filePath,
        startLine: s.startLine,
        endLine:   s.endLine,
        snippet:   s.snippet,
      })),
    });
    session.updatedAt = new Date();
    await session.save();

    res.json({ answer: result.answer, sources: result.sources, sessionId: session._id });
  } catch (err) { next(err); }
});

// ── POST /api/query/stream ── SSE streaming query ─────────────────────────
// Proxies the SSE stream from ai-service, then saves the completed message.
router.post('/stream', async (req, res, next) => {
  try {
    const { repoId, question, sessionId } = req.body;
    if (!repoId || !question)
      return res.status(400).json({ error: 'repoId and question are required.' });

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    if (repo.status !== 'ready')
      return res.status(409).json({ error: 'Repo is still being indexed.' });

    let session = sessionId ? await Session.findById(sessionId) : null;
    if (!session) {
      session = await Session.create({
        repoId,
        userId: req.user.id,
        title:  question.slice(0, 60),
        messages: [],
      });
    }

    const history = session.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Stream from ai-service using node-fetch / axios stream
    const axios = require('axios');
    const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:5000';

    let fullAnswer = '';
    let sources    = [];

    try {
      const aiRes = await axios({
        method:       'post',
        url:          `${AI_BASE}/query/stream`,
        data:         { faissIndexId: repo.faissIndexId, question, history, repoName: repo.name },
        responseType: 'stream',
        timeout:      180000,
      });

      // Forward SSE tokens to client, collect full answer
      await new Promise((resolve, reject) => {
        let buffer = '';

        aiRes.data.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                fullAnswer += data.token;
                res.write(`data: ${JSON.stringify({ token: data.token })}\n\n`);
              }
              if (data.done) {
                sources = data.sources || [];
                res.write(`data: ${JSON.stringify({ done: true, sources, sessionId: session._id })}\n\n`);
              }
              if (data.error) {
                res.write(`data: ${JSON.stringify({ error: data.error })}\n\n`);
              }
            } catch (_) {}
          }
        });

        aiRes.data.on('end',   resolve);
        aiRes.data.on('error', reject);
      });
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
      res.end();
      return;
    }

    res.end();

    // ── Save to DB after stream completes ─────────────────────────────────
    if (fullAnswer) {
      session.messages.push({ role: 'user', content: question });
      session.messages.push({
        role:    'assistant',
        content: fullAnswer,
        sources: sources.map(s => ({
          filePath:  s.filePath,
          startLine: s.startLine,
          endLine:   s.endLine,
          snippet:   s.snippet,
        })),
      });
      session.updatedAt = new Date();
      await session.save();
    }
  } catch (err) { next(err); }
});

// ── GET /api/query/sessions/:repoId ── list sessions for a repo ───────────
router.get('/sessions/:repoId', async (req, res, next) => {
  try {
    const sessions = await Session.find({
      repoId: req.params.repoId,
      userId: req.user.id,     // only return sessions owned by this user
    })
      .select('title createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json(sessions);
  } catch (err) { next(err); }
});

// ── DELETE /api/query/sessions/:sessionId ── delete one session ───────────
router.delete('/sessions/:sessionId', async (req, res, next) => {
  try {
    const session = await Session.findOneAndDelete({
      _id:    req.params.sessionId,
      userId: req.user.id,   // ensure ownership
    });
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json({ message: 'Session deleted.' });
  } catch (err) { next(err); }
});

// ── DELETE /api/query/sessions/repo/:repoId ── clear ALL sessions for a repo
router.delete('/sessions/repo/:repoId', async (req, res, next) => {
  try {
    const result = await Session.deleteMany({
      repoId: req.params.repoId,
      userId: req.user.id,
    });
    res.json({ message: `Deleted ${result.deletedCount} session(s).` });
  } catch (err) { next(err); }
});

module.exports = router;