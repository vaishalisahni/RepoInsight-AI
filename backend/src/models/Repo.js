const mongoose = require('mongoose');

const RepoSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:         { type: String, required: true },
  url:          { type: String },
  localPath:    { type: String, required: true },
  status:       { type: String, enum: ['pending','indexing','ready','error'], default: 'pending' },
  totalFiles:   { type: Number, default: 0 },
  totalChunks:  { type: Number, default: 0 },
  faissIndexId: { type: String },
  graph:        { type: mongoose.Schema.Types.Mixed },
  summary:      { type: String },
  keyFiles:     [{ type: String }],
  techStack:    { type: mongoose.Schema.Types.Mixed, default: {} },
  languages:    { type: mongoose.Schema.Types.Mixed, default: {} },
  errorMessage: { type: String },
  webhookSecret:{ type: String },
  lastSyncedAt: { type: Date },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

RepoSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Repo', RepoSchema);