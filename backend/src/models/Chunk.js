const mongoose = require('mongoose');

const ChunkSchema = new mongoose.Schema({
  repoId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
  filePath:   { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  content:    { type: String, required: true },
  type:       { type: String, enum: ['function','class','module','import','comment','generic'], default: 'generic' },
  name:       { type: String },
  startLine:  { type: Number },
  endLine:    { type: Number },
  language:   { type: String, default: 'javascript' },
  imports:    [{ type: String }],
  exports:    [{ type: String }],
  faissId:    { type: Number },
  createdAt:  { type: Date, default: Date.now }
});

ChunkSchema.index({ repoId: 1, filePath: 1 });

module.exports = mongoose.model('Chunk', ChunkSchema);