const express = require('express');
const router = express.Router();
const Repo = require('../models/Repo');
const Session = require('../models/Session');
const aiClient = require('../services/aiClient');

/**
 * POST /api/query
 * Body: { repoId, question, sessionId? }
 * Response: { answer, sources: [{filePath, startLine, endLine, snippet}], sessionId }
 */
router.post('/', async (req, res, next) => {
  try {
    const { repoId, question, sessionId } = req.body;
    if (!repoId || !question) {
      return res.status(400).json({ error: 'repoId and question are required.' });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: 'Repo not found.' });
    if (repo.status !== 'ready') {
      return res.status(409).json({ error: 'Repo is still being indexed. Try again shortly.' });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await Session.findById(sessionId);
    }
    if (!session) {
      session = await Session.create({ repoId, messages: [] });
    }

    // Get conversation history (last 10 messages for context)
    const history = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Call AI service
    const result = await aiClient.query({
      faissIndexId: repo.faissIndexId,
      question,
      history,
      repoName: repo.name
    });

    // Persist messages
    session.messages.push({ role: 'user', content: question });
    session.messages.push({
      role: 'assistant',
      content: result.answer,
      sources: result.sources
    });
    session.updatedAt = new Date();
    await session.save();

    res.json({
      answer: result.answer,
      sources: result.sources,
      sessionId: session._id
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;