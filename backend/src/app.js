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
const webhookRoutes = require('./routes/webhook');

const { protect } = require('./middleware/auth');

const app = express();

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// NOTE: express.raw() for GitHub webhooks must come BEFORE express.json()
// The webhook route uses its own express.raw() parser inline.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();

// ── Public routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Webhook route — GitHub endpoint is public (verified by HMAC signature).
// The /setup sub-route is protected inline via req.user check.
app.use('/api/webhook', (req, res, next) => {
  // Attach user if available (for /setup endpoints), but don't block public webhook
  const auth = req.headers.authorization;
  const jwt  = require('./utils/jwt');
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verifyAccess(auth.slice(7));
    } catch (_) {}
  } else if (req.cookies?.access_token) {
    try {
      req.user = jwt.verifyAccess(req.cookies.access_token);
    } catch (_) {}
  }
  next();
}, webhookRoutes);

// ── Protected routes ─────────────────────────────────────────────────────
app.use('/api/ingest',  ingestRoutes);
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