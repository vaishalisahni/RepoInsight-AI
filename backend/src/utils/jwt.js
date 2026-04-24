const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_SECRET        || 'change-me-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret';
const ACCESS_EXPIRY  = process.env.JWT_EXPIRES_IN     || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// Hash refresh token before storing (so stolen DB won't expose raw tokens)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path:     '/',
};

function setAccessCookie(res, token) {
  res.cookie('access_token', token, {
    ...COOKIE_OPTS,
    maxAge: 15 * 60 * 1000, // 15 min
  });
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    ...COOKIE_OPTS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path:   '/api/auth/refresh', // scope refresh cookie strictly
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { ...COOKIE_OPTS });
  res.clearCookie('refresh_token', { ...COOKIE_OPTS, path: '/api/auth/refresh' });
}

module.exports = {
  signAccess, signRefresh,
  verifyAccess, verifyRefresh,
  hashToken,
  setAccessCookie, setRefreshCookie, clearAuthCookies,
};