const mongoose = require('mongoose');

const RepoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String },                      // GitHub URL or null for upload
  localPath: { type: String, required: true }, // Cloned path on server
  status: {
    type: String,
    enum: ['pending', 'indexing', 'ready', 'error'],
    default: 'pending'
  },
  language: { type: String, default: 'javascript' },
  totalFiles: { type: Number, default: 0 },
  totalChunks: { type: Number, default: 0 },
  faissIndexId: { type: String },             // Identifier for FAISS namespace
  graph: { type: mongoose.Schema.Types.Mixed }, // Adjacency list: { nodes, edges }
  summary: { type: String },                  // LLM-generated summary
  keyFiles: [{ type: String }],               // Most important files
  webhookSecret: { type: String },
  lastSyncedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Repo', RepoSchema);