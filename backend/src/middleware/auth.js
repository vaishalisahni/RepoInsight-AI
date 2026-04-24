const { verifyAccess } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Protect routes: reads JWT from cookie (or Authorization header as fallback).
 * Attaches req.user = { id, email, name, plan }
 */
async function protect(req, res, next) {
  try {
    let token = req.cookies?.access_token;

    // Fallback: Bearer token in Authorization header (for VS Code extension / API clients)
    if (!token) {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }

    const decoded = verifyAccess(token);
    // Attach minimal user info — avoid DB hit on every request
    req.user = { id: decoded.id, email: decoded.email, name: decoded.name, plan: decoded.plan };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please refresh your token.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Optionally attach user (don't block if no token).
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (token) {
      const decoded = verifyAccess(token);
      req.user = { id: decoded.id, email: decoded.email, name: decoded.name, plan: decoded.plan };
    }
  } catch (_) {}
  next();
}

module.exports = { protect, optionalAuth };