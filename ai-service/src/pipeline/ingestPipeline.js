const path              = require('path');
const { glob }          = require('glob');
const { parseFile, getSupportedExtensions } = require('../parser/astParser');
const { embedTexts }    = require('../embeddings/embedder');
const faissStore        = require('../embeddings/faissStore');
const graphBuilder      = require('../graph/builder');
const { generateSummary } = require('./queryPipeline');
const techDetector      = require('../utils/techDetector');

const IGNORE = [
  '**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**',
  '**/vendor/**', '**/venv/**', '**/.venv/**', '**/env/**',
  '**/target/**', '**/out/**', '**/__pycache__/**', '**/.cache/**',
  '**/*.min.js', '**/*.min.css', '**/*.map',
  '**/coverage/**', '**/.nyc_output/**',
  '**/migrations/**.sql',
];

const MAX_FILES = 2000;

async function run(localPath, faissIndexId) {
  console.log(`[ingest] Starting: ${localPath}`);

  // ── 0. Clear old index first to prevent duplicate vectors on re-index ──────
  // This is safe — clearIndex removes the .faiss file and meta.json so we
  // start completely fresh. Without this, every re-index appends duplicate
  // vectors and the FAISS store grows unboundedly.
  faissStore.clearIndex(faissIndexId);
  console.log(`[ingest] Cleared old FAISS index: ${faissIndexId}`);

  // ── 1. Discover all supported files ─────────────────────────────────────
  const exts  = getSupportedExtensions();
  const pattern = `**/*.{${exts.join(',')}}`;

  let files = await glob(pattern, {
    cwd:      localPath,
    ignore:   IGNORE,
    absolute: true,
    nocase:   true,
  });

  const specialGlob = await glob(
    '{Dockerfile,Makefile,Gemfile,Pipfile,*.env,.env,go.mod,go.sum,requirements.txt,setup.py,setup.cfg}',
    { cwd: localPath, ignore: IGNORE, absolute: true }
  );
  files = [...new Set([...files, ...specialGlob])];

  if (files.length > MAX_FILES) {
    console.warn(`[ingest] Too many files (${files.length}), capping at ${MAX_FILES}`);
    files = files.slice(0, MAX_FILES);
  }

  console.log(`[ingest] Found ${files.length} files`);

  if (files.length === 0) {
    return {
      totalFiles: 0, totalChunks: 0,
      graph: { nodes: [], edges: [] },
      summary: 'No indexable files found.',
      keyFiles: [],
      techStack: {},
      languages: {},
    };
  }

  // ── 2. Parse files ───────────────────────────────────────────────────────
  const allChunks        = [];
  const fileParseResults = {};
  const langCounts       = {};

  for (const fp of files) {
    try {
      const rel    = path.relative(localPath, fp);
      const result = parseFile(fp);
      if (!result || !result.chunks?.length) continue;

      fileParseResults[rel] = result;
      const lang = result.language || 'unknown';
      langCounts[lang] = (langCounts[lang] || 0) + 1;

      result.chunks.forEach((chunk, idx) => {
        allChunks.push({ filePath: rel, chunkIndex: idx, ...chunk });
      });
    } catch (e) {
      console.warn(`[ingest] Parse error ${fp}: ${e.message}`);
    }
  }
  console.log(`[ingest] Parsed ${allChunks.length} chunks from ${Object.keys(fileParseResults).length} files`);
  console.log(`[ingest] Languages:`, langCounts);

  if (allChunks.length === 0) {
    return {
      totalFiles: files.length, totalChunks: 0,
      graph: { nodes: [], edges: [] },
      summary: 'Files found but no parseable chunks extracted.',
      keyFiles: [],
      techStack: {},
      languages: langCounts,
    };
  }

  // ── 3. Embed & store ─────────────────────────────────────────────────────
  const texts = allChunks.map(c =>
    `// File: ${c.filePath} [${c.language || 'code'}]${c.name ? `\n// ${c.type}: ${c.name}` : ''}\n${c.content}`
  );

  console.log(`[ingest] Embedding ${texts.length} chunks...`);
  const vectors = await embedTexts(texts);

  const startId = await faissStore.addVectors(faissIndexId, vectors);
  const meta    = allChunks.map((c, i) => ({
    faissId:    startId + i,
    filePath:   c.filePath,
    chunkIndex: c.chunkIndex,
    type:       c.type,
    name:       c.name,
    startLine:  c.startLine,
    endLine:    c.endLine,
    language:   c.language,
    content:    (c.content || '').slice(0, 500),
  }));
  faissStore.saveMeta(faissIndexId, meta);
  console.log(`[ingest] FAISS stored ${vectors.length} vectors`);

  // ── 4. Build dependency graph ────────────────────────────────────────────
  const graph = graphBuilder.build(fileParseResults);

  // ── 5. Detect tech stack ─────────────────────────────────────────────────
  const techStack = techDetector.detect(localPath, Object.keys(fileParseResults));

  // ── 6. Generate AI summary ───────────────────────────────────────────────
  const sampleText = Object.keys(fileParseResults).slice(0, 8).map(f =>
    `${f} [${fileParseResults[f].language}]:\n${
      fileParseResults[f].chunks.slice(0, 2).map(c => (c.content || '').slice(0, 300)).join('\n')
    }`
  ).join('\n\n');

  const summary = await generateSummary(sampleText, techStack, langCounts);

  // ── 7. Key files ─────────────────────────────────────────────────────────
  const keyFiles = Object.entries(fileParseResults)
    .sort((a, b) => (b[1].exports?.length || 0) - (a[1].exports?.length || 0))
    .slice(0, 12)
    .map(([f]) => f);

  console.log(`[ingest] Done. ${files.length} files, ${allChunks.length} chunks, stack: ${JSON.stringify(techStack.frameworks)}`);

  return {
    totalFiles:  files.length,
    totalChunks: allChunks.length,
    graph,
    summary,
    keyFiles,
    techStack,
    languages: langCounts,
  };
}

module.exports = { run };