const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user','assistant'], required: true },
  content: { type: String, required: true },
  sources: [{ filePath: String, startLine: Number, endLine: Number }],
  createdAt: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  repoId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true },
  messages:  [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);