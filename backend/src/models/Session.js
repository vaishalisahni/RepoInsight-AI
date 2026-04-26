const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user','assistant'], required: true },
  content: { type: String, required: true },
  sources: [{
    filePath:  String,
    startLine: Number,
    endLine:   Number,
    snippet:   String,   // ← added: stores the code snippet for the code viewer modal
  }],
  createdAt: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  repoId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // added for ownership checks
  title:     { type: String, default: '' }, // first user message, set on first save
  messages:  [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SessionSchema.index({ repoId: 1, updatedAt: -1 });
SessionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Session', SessionSchema);