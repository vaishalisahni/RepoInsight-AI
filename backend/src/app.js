require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const ingestRoutes = require('./routes/ingest');
const queryRoutes  = require('./routes/query');
const explainRoutes = require('./routes/explain');
const traceRoutes  = require('./routes/trace');
const graphRoutes  = require('./routes/graph');
const impactRoutes = require('./routes/impact');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use('/api/ingest',  ingestRoutes);
app.use('/api/query',   queryRoutes);
app.use('/api/explain', explainRoutes);
app.use('/api/trace',   traceRoutes);
app.use('/api/graph',   graphRoutes);
app.use('/api/impact',  impactRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`Backend running on port ${PORT}`));

module.exports = app;