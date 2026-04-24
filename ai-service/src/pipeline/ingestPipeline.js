const path = require('path');
const glob = require('glob');
const { parseFile } = require('../parser/astParser');
const { embedTexts } = require('../embeddings/embedder');
const faissStore = require('../embeddings/faissStore');
const graphBuilder = require('../graph/builder');
const { generateSummary } = require('./queryPipeline');

const SUPPORTED_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'];
const IGNORE_PATTERNS = ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/*.min.js'];

/**
 * Full ingestion pipeline.
 * 1. Walk repo directory
 * 2. Parse each file with AST
 * 3. Embed all chunks in batches
 * 4. Store in FAISS + return metadata
 * 5. Build dependency graph
 * 6. Generate repo summary
 */
async function run(localPath, faissIndexId) {
  console.log(`[ingest] Starting ingestion for ${localPath}`);

  // 1. Find all supported files
  const files = [];
  for (const ext of SUPPORTED_EXTENSIONS) {
    const found = glob.sync(`**/*.${ext}`, {
      cwd: localPath,
      ignore: IGNORE_PATTERNS,
      absolute: true
    });
    files.push(...found);
  }
  console.log(`[ingest] Found ${files.length} files`);

  // 2. Parse all files
  const allChunks = [];
  const fileParseResults = {};

  for (const filePath of files) {
    try {
      const relPath = path.relative(localPath, filePath);
      const result = parseFile(filePath);
      if (!result) continue;

      fileParseResults[relPath] = result;
      result.chunks.forEach((chunk, idx) => {
        allChunks.push({
          filePath: relPath,
          chunkIndex: idx,
          ...chunk
        });
      });
    } catch (err) {
      console.warn(`[ingest] Parse error in ${filePath}: ${err.message}`);
    }
  }

  console.log(`[ingest] Parsed ${allChunks.length} chunks`);

  // 3. Generate embeddings in batches
  const texts = allChunks.map(c =>
    `// File: ${c.filePath}${c.name ? `\n// ${c.type}: ${c.name}` : ''}\n${c.content}`
  );

  const vectors = await embedTexts(texts);

  // 4. Store in FAISS
  const startId = await faissStore.addVectors(faissIndexId, vectors);
  const meta = allChunks.map((chunk, i) => ({
    faissId: startId + i,
    filePath: chunk.filePath,
    chunkIndex: chunk.chunkIndex,
    type: chunk.type,
    name: chunk.name,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    content: chunk.content.slice(0, 500) // Store a preview in meta
  }));
  faissStore.saveMeta(faissIndexId, meta);

  // 5. Build dependency graph
  const graph = graphBuilder.build(fileParseResults);

  // 6. Generate repo summary
  const topFiles = Object.keys(fileParseResults).slice(0, 5);
  const summaryContext = topFiles.map(f => `${f}:\n${fileParseResults[f].chunks.slice(0, 2).map(c => c.content.slice(0, 300)).join('\n')}`).join('\n\n');
  const summary = await generateSummary(summaryContext, faissIndexId);

  // Key files = files with most exports / dependencies
  const keyFiles = Object.entries(fileParseResults)
    .sort((a, b) => (b[1].exports?.length || 0) - (a[1].exports?.length || 0))
    .slice(0, 10)
    .map(([f]) => f);

  return {
    totalFiles: files.length,
    totalChunks: allChunks.length,
    graph,
    summary,
    keyFiles
  };
}

module.exports = { run };