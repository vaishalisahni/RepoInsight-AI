require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const cookieParser  = require('cookie-parser');
const helmet        = require('helmet');
const { connectDB } = require('./config/db');
const errorHandler  = require('./middleware/errorHandler');
const logger        = require('./utils/logger');

const authRoutes    = require('./routes/auth');
const ingestRoutes  = require('./routes/ingest');
const queryRoutes   = require('./routes/query');
const explainRoutes = require('./routes/explain');
const traceRoutes   = require('./routes/trace');
const graphRoutes   = require('./routes/graph');
const impactRoutes  = require('./routes/impact');

const { protect } = require('./middleware/auth');

const app = express();

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow vis-network / external fonts
  contentSecurityPolicy: false,     // set separately if needed
}));

// CORS — allow credentials so cookies flow
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies

connectDB();

// ── Public routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Protected routes ─────────────────────────────────────────────────────
app.use('/api/ingest',  ingestRoutes);   // auth enforced inside route
app.use('/api/query',   protect, queryRoutes);
app.use('/api/explain', protect, explainRoutes);
app.use('/api/trace',   protect, traceRoutes);
app.use('/api/graph',   protect, graphRoutes);
app.use('/api/impact',  protect, impactRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`Backend running on port ${PORT}`));

module.exports = app;