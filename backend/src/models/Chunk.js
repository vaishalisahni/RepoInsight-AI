const mongoose = require('mongoose');

const ChunkSchema = new mongoose.Schema({
  repoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
  filePath: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },   // Raw code text
  type: {
    type: String,
    enum: ['function', 'class', 'module', 'import', 'comment', 'generic'],
    default: 'generic'
  },
  name: { type: String },                      // Function/class name if applicable
  startLine: { type: Number },
  endLine: { type: Number },
  language: { type: String, default: 'javascript' },
  imports: [{ type: String }],                 // Files this chunk imports
  exports: [{ type: String }],                 // Named exports from this chunk
  faissId: { type: Number },                   // Row index in FAISS
  createdAt: { type: Date, default: Date.now }
});

ChunkSchema.index({ repoId: 1, filePath: 1 });

module.exports = mongoose.model('Chunk', ChunkSchema);