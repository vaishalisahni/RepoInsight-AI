const path              = require('path');
const { glob }          = require('glob');          // glob v10 named export
const { parseFile }     = require('../parser/astParser');
const { embedTexts }    = require('../embeddings/embedder');
const faissStore        = require('../embeddings/faissStore');
const graphBuilder      = require('../graph/builder');
const { generateSummary } = require('./queryPipeline');

const EXTS   = ['js', 'jsx', 'ts', 'tsx'];
const IGNORE = [
  '**/node_modules/**', '**/dist/**', '**/build/**',
  '**/.git/**', '**/*.min.js', '**/*.test.*', '**/*.spec.*'
];

async function run(localPath, faissIndexId) {
  console.log(`[ingest] Starting: ${localPath}`);

  // 1. Find all supported files (glob v10 returns a Promise)
  const files = [];
  for (const ext of EXTS) {
    const found = await glob(`**/*.${ext}`, {
      cwd:      localPath,
      ignore:   IGNORE,
      absolute: true
    });
    files.push(...found);
  }
  console.log(`[ingest] Found ${files.length} files`);

  if (files.length === 0) {
    return {
      totalFiles: 0, totalChunks: 0,
      graph: { nodes: [], edges: [] },
      summary: 'No indexable JS/TS files found.',
      keyFiles: []
    };
  }

  // 2. Parse all files with AST
  const allChunks       = [];
  const fileParseResults = {};

  for (const fp of files) {
    try {
      const rel    = path.relative(localPath, fp);
      const result = parseFile(fp);
      if (!result) continue;
      fileParseResults[rel] = result;
      result.chunks.forEach((chunk, idx) => {
        allChunks.push({ filePath: rel, chunkIndex: idx, ...chunk });
      });
    } catch (e) {
      console.warn(`[ingest] Parse error ${fp}: ${e.message}`);
    }
  }
  console.log(`[ingest] Parsed ${allChunks.length} chunks`);

  if (allChunks.length === 0) {
    return {
      totalFiles: files.length, totalChunks: 0,
      graph: { nodes: [], edges: [] },
      summary: 'Files found but no parseable chunks extracted.',
      keyFiles: []
    };
  }

  // 3. Generate embeddings
  const texts = allChunks.map(c =>
    `// File: ${c.filePath}${c.name ? `\n// ${c.type}: ${c.name}` : ''}\n${c.content}`
  );

  console.log(`[ingest] Embedding ${texts.length} chunks...`);
  const vectors = await embedTexts(texts);
  console.log(`[ingest] Embeddings done. Storing in FAISS...`);

  // 4. Store in FAISS
  const startId = await faissStore.addVectors(faissIndexId, vectors);
  const meta    = allChunks.map((c, i) => ({
    faissId:    startId + i,
    filePath:   c.filePath,
    chunkIndex: c.chunkIndex,
    type:       c.type,
    name:       c.name,
    startLine:  c.startLine,
    endLine:    c.endLine,
    content:    (c.content || '').slice(0, 500)
  }));
  faissStore.saveMeta(faissIndexId, meta);
  console.log(`[ingest] FAISS stored ${vectors.length} vectors`);

  // 5. Build dependency graph
  const graph = graphBuilder.build(fileParseResults);

  // 6. Generate repo summary via LLM
  const sampleText = Object.keys(fileParseResults).slice(0, 5).map(f =>
    `${f}:\n${fileParseResults[f].chunks.slice(0, 2).map(c => (c.content||'').slice(0, 300)).join('\n')}`
  ).join('\n\n');
  const summary = await generateSummary(sampleText);

  // Key files = highest export count
  const keyFiles = Object.entries(fileParseResults)
    .sort((a, b) => (b[1].exports?.length || 0) - (a[1].exports?.length || 0))
    .slice(0, 10)
    .map(([f]) => f);

  console.log(`[ingest] Done. ${files.length} files, ${allChunks.length} chunks.`);
  return {
    totalFiles:  files.length,
    totalChunks: allChunks.length,
    graph,
    summary,
    keyFiles
  };
}

module.exports = { run };