const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // must be 32-byte hex string

function encrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(data) {
  if (!data) return null;
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const [ivHex, authTagHex, encrypted] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const UserSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, select: false },
  // Encrypted GitHub token
  _githubToken: { type: String, select: false },
  githubUsername: { type: String },
  avatarUrl:    { type: String },
  plan:         { type: String, enum: ['free', 'pro'], default: 'free' },
  repoLimit:    { type: Number, default: 5 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
  lastLoginAt:  { type: Date },
  refreshTokens: [{ type: String, select: false }], // store hashed refresh tokens
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// GitHub token virtuals
UserSchema.methods.setGithubToken = function (token) {
  this._githubToken = token ? encrypt(token) : null;
};

UserSchema.methods.getGithubToken = function () {
  return this._githubToken ? decrypt(this._githubToken) : null;
};

// Mask token for API responses
UserSchema.virtual('hasGithubToken').get(function () {
  return !!this._githubToken;
});

UserSchema.set('toJSON', { virtuals: true, transform: (_, ret) => {
  delete ret.password;
  delete ret._githubToken;
  delete ret.refreshTokens;
  delete ret.__v;
  return ret;
}});

module.exports = mongoose.model('User', UserSchema);