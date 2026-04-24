let pipeline = null;
const MODEL = process.env.EMBEDDINGS_MODEL || 'Xenova/all-MiniLM-L6-v2';

async function getModel() {
  if (pipeline) return pipeline;
  console.log(`[embedder] Loading ${MODEL}... (first run downloads ~90MB)`);
  const { pipeline: p } = await import('@xenova/transformers');
  pipeline = await p('feature-extraction', MODEL, { cache_dir: './data/models' });
  console.log('[embedder] Ready ✓');
  return pipeline;
}

async function embedTexts(texts) {
  const model   = await getModel();
  const results = [];
  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32);
    const out   = await model(batch, { pooling: 'mean', normalize: true });
    const size  = out.dims[out.dims.length - 1];
    for (let j = 0; j < batch.length; j++)
      results.push(Array.from(out.data.slice(j * size, (j + 1) * size)));
  }
  return results;
}

async function embedSingle(text) {
  return (await embedTexts([text]))[0];
}

module.exports = { embedTexts, embedSingle };