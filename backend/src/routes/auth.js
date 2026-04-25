const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  signAccess, signRefresh, verifyRefresh,
  hashToken, setAccessCookie, setRefreshCookie, clearAuthCookies,
} = require('../utils/jwt');
const logger = require('../utils/logger');

// ── Rate limiters ─────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests.' },
});

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ error: 'name, email, and password are required.' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const user = await User.create({ name: name.trim(), email, password });

    const accessToken = signAccess({ id: user._id, email: user.email, name: user.name, plan: user.plan });
    const refreshToken = signRefresh({ id: user._id });

    // Store hashed refresh token
    user.refreshTokens = [hashToken(refreshToken)];
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    logger.info(`[auth] New user registered: ${user.email}`);
    return res.status(201).json({
      message: 'Account created successfully.',
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan },
      accessToken,
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password.' });

    const accessToken = signAccess({ id: user._id, email: user.email, name: user.name, plan: user.plan });
    const refreshToken = signRefresh({ id: user._id });

    // Keep only last 5 refresh tokens (multi-device support)
    const hashed = hashToken(refreshToken);
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), hashed];
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    logger.info(`[auth] Login: ${user.email}`);
    return res.json({
      message: 'Logged in successfully.',
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan, hasGithubToken: user.hasGithubToken },
      accessToken,
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', tokenLimiter, async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token.' });

    let decoded;
    try { decoded = verifyRefresh(token); }
    catch (_) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token. Please log in again.' });
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user) return res.status(401).json({ error: 'User not found.' });

    const hashed = hashToken(token);
    if (!user.refreshTokens?.includes(hashed)) {
      // Token reuse — possible theft, invalidate all sessions
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
      clearAuthCookies(res);
      logger.warn(`[auth] Refresh token reuse detected for user ${user.email}`);
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    // Rotate refresh token
    const newAccessToken = signAccess({ id: user._id, email: user.email, name: user.name, plan: user.plan });
    const newRefreshToken = signRefresh({ id: user._id });

    user.refreshTokens = user.refreshTokens.filter(t => t !== hashed);
    user.refreshTokens.push(hashToken(newRefreshToken));
    await user.save({ validateBeforeSave: false });

    setAccessCookie(res, newAccessToken);
    setRefreshCookie(res, newRefreshToken);

    return res.json({ message: 'Token refreshed.' });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', protect, async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      const user = await User.findById(req.user.id).select('+refreshTokens');
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter(t => t !== hashToken(token));
        await user.save({ validateBeforeSave: false });
      }
    }
    clearAuthCookies(res);
    return res.json({ message: 'Logged out.' });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+_githubToken');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
      hasGithubToken: user.hasGithubToken,
      repoLimit: user.repoLimit,
      createdAt: user.createdAt,
    });
  } catch (err) { next(err); }
});

// ── PATCH /api/auth/github-token ──────────────────────────────────────────
// Store an encrypted GitHub personal access token
router.patch('/github-token', protect, async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await User.findById(req.user.id).select('+_githubToken');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (!token) {
      // Remove token
      user.setGithubToken(null);
      user.githubUsername = null;
      user.avatarUrl = null;
      await user.save({ validateBeforeSave: false });
      return res.json({ message: 'GitHub token removed.' });
    }

    // Validate token against GitHub API
    let githubUser;
    try {
      const axios = require('axios');
      const ghRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'RepoInsight' },
        timeout: 8000,
      });
      githubUser = ghRes.data;
    } catch (ghErr) {
      const status = ghErr.response?.status;
      if (status === 401) return res.status(400).json({ error: 'Invalid GitHub token. Please check and try again.' });
      if (status === 403) return res.status(400).json({ error: 'GitHub token lacks required permissions.' });
      return res.status(400).json({ error: 'Could not verify GitHub token. Check your internet connection.' });
    }

    user.setGithubToken(token);
    user.githubUsername = githubUser.login;
    user.avatarUrl = githubUser.avatar_url;
    await user.save({ validateBeforeSave: false });

    logger.info(`[auth] GitHub token saved for user ${user.email} (${githubUser.login})`);
    return res.json({
      message: 'GitHub token saved successfully.',
      githubUsername: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });
  } catch (err) { next(err); }
});

// ── GET /api/auth/github-token/status ─────────────────────────────────────
router.get('/github-token/status', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+_githubToken');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({
      hasToken: user.hasGithubToken,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) { next(err); }
});

// ── PATCH /api/auth/profile ────────────────────────────────────────────────
router.patch('/profile', protect, async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (name?.trim()) user.name = name.trim();

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: 'currentPassword is required to set a new password.' });
      if (!(await user.comparePassword(currentPassword)))
        return res.status(401).json({ error: 'Current password is incorrect.' });
      if (newPassword.length < 8)
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      user.password = newPassword;
    }

    user.updatedAt = new Date();
    await user.save();

    return res.json({ message: 'Profile updated.', user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) { next(err); }
});

module.exports = router;