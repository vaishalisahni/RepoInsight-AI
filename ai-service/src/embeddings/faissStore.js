const faiss = require('faiss-node');
const fs    = require('fs');
const path  = require('path');

const BASE = process.env.FAISS_INDEX_PATH || './data/faiss_index';
const DIM  = parseInt(process.env.EMBEDDINGS_DIM || '384');

function paths(ns) {
  const dir = path.join(BASE, ns);
  fs.mkdirSync(dir, { recursive: true });
  return { idx: path.join(dir, 'index.faiss'), meta: path.join(dir, 'meta.json') };
}

function loadOrCreate(ns) {
  const { idx } = paths(ns);
  if (fs.existsSync(idx)) {
    try { return faiss.IndexFlatL2.read(idx); } catch(_) {}
  }
  return new faiss.IndexFlatL2(DIM);
}

async function addVectors(ns, vectors) {
  const index   = loadOrCreate(ns);
  const startId = index.ntotal();

  // faiss-node .add() wants a plain flat JS Array (not Float32Array, not nested)
  const flat = [];
  for (const vec of vectors) {
    for (const val of vec) {
      flat.push(Number(val));
    }
  }

  index.add(flat);
  index.write(paths(ns).idx);
  return startId;
}

async function search(ns, queryVec, topK = 8) {
  const { idx } = paths(ns);
  if (!fs.existsSync(idx)) return [];
  const index = faiss.IndexFlatL2.read(idx);

  // Also pass a plain flat Array for search
  const flat = Array.from(queryVec).map(Number);

  const result = index.search(flat, topK);
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

module.exports = { addVectors, search, saveMeta, loadMeta };
