const faiss = require('faiss-node');
const fs    = require('fs');
const path  = require('path');

const BASE = process.env.FAISS_INDEX_PATH || './data/faiss_index';
const DIM  = parseInt(process.env.EMBEDDINGS_DIM || '384');

function paths(ns) {
  const dir = path.join(BASE, ns);
  fs.mkdirSync(dir, { recursive: true });
  return {
    idx:  path.join(dir, 'index.faiss'),
    meta: path.join(dir, 'meta.json')
  };
}

function loadOrCreate(ns) {
  const { idx } = paths(ns);
  if (fs.existsSync(idx)) {
    try { return faiss.IndexFlatL2.read(idx); } catch (_) {}
  }
  return new faiss.IndexFlatL2(DIM);
}

async function addVectors(ns, vectors) {
  const index   = loadOrCreate(ns);
  const startId = index.ntotal();

  const flat = [];
  for (const vec of vectors)
    for (const val of vec)
      flat.push(Number(val));

  index.add(flat);
  index.write(paths(ns).idx);
  return startId;
}

async function search(ns, queryVec, topK = 8) {
  const { idx } = paths(ns);
  if (!fs.existsSync(idx)) return [];
  const index  = faiss.IndexFlatL2.read(idx);
  const flat   = Array.from(queryVec).map(Number);
  const result = index.search(flat, Math.min(topK, index.ntotal()));
  return Array.from(result.labels).filter(l => l >= 0);
}

function saveMeta(ns, meta) {
  const { meta: mp } = paths(ns);
  const existing = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf-8')) : [];
  fs.writeFileSync(mp, JSON.stringify([...existing, ...meta]));
}

function loadMeta(ns) {
  const { meta: mp } = paths(ns);
  return fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf-8')) : [];
}

/**
 * BUG FIX: The original code did `meta[label]` which is WRONG after re-indexing.
 *
 * FAISS labels are the absolute vector position (0, 1, 2, ..., ntotal-1).
 * After clearIndex + re-index, labels restart at 0 but match the new meta array.
 * However, if you ever append to an existing index (startId > 0), labels from
 * a new batch start at startId, but meta array positions start at 0 for the
 * appended slice.
 *
 * FIX: Store faissId on each meta entry and use it for O(1) lookup via a Map.
 * This is correct whether we clear-and-rebuild OR append.
 */
function searchMeta(ns, faissLabels) {
  const meta = loadMeta(ns);

  // Build faissId → meta entry map for O(1) lookup
  const byFaissId = new Map();
  for (const entry of meta) {
    byFaissId.set(entry.faissId, entry);
  }

  return faissLabels
    .filter(l => l >= 0)
    .map(l => byFaissId.get(l))
    .filter(Boolean);
}

function clearIndex(ns) {
  const { idx, meta: mp } = paths(ns);
  if (fs.existsSync(idx)) fs.unlinkSync(idx);
  if (fs.existsSync(mp))  fs.unlinkSync(mp);
}

module.exports = { addVectors, search, searchMeta, saveMeta, loadMeta, clearIndex };