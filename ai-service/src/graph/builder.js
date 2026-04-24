/**
 * Build a dependency graph from parsed file results.
 * Input: { [filePath]: { chunks, imports, exports } }
 * Output: { nodes: [...], edges: [...] }
 */
function build(fileParseResults) {
  const nodes = [];
  const edges = [];
  const fileIndex = new Set(Object.keys(fileParseResults));

  Object.entries(fileParseResults).forEach(([filePath, result]) => {
    // Add node
    const functions = result.chunks
      .filter(c => c.type === 'function' && c.name)
      .map(c => c.name);
    const classes = result.chunks
      .filter(c => c.type === 'class' && c.name)
      .map(c => c.name);

    nodes.push({
      id: filePath,
      label: filePath.split('/').pop(),
      type: detectFileType(filePath),
      filePath,
      functions,
      classes,
      exports: result.exports || []
    });

    // Extract import paths and add edges
    const importChunks = result.chunks.filter(c => c.type === 'import');
    importChunks.forEach(chunk => {
      const match = chunk.content.match(/from\s+['"](.+)['"]/);
      if (!match) return;

      let importPath = match[1];
      // Resolve relative imports
      if (importPath.startsWith('.')) {
        const dir = filePath.split('/').slice(0, -1).join('/');
        importPath = normalizePath(`${dir}/${importPath}`);
        // Try with extensions
        const candidates = [`${importPath}.js`, `${importPath}.ts`, `${importPath}/index.js`];
        const resolved = candidates.find(c => fileIndex.has(c));
        if (resolved) {
          edges.push({ from: filePath, to: resolved, type: 'imports' });
        }
      }
    });
  });

  return { nodes, edges };
}

function detectFileType(filePath) {
  if (filePath.includes('route') || filePath.includes('controller')) return 'route';
  if (filePath.includes('service') || filePath.includes('Service')) return 'service';
  if (filePath.includes('model') || filePath.includes('Model')) return 'model';
  if (filePath.includes('middleware')) return 'middleware';
  if (filePath.includes('util') || filePath.includes('helper')) return 'utility';
  if (filePath.includes('test') || filePath.includes('spec')) return 'test';
  if (filePath.includes('index')) return 'entry';
  return 'module';
}

function normalizePath(p) {
  const parts = p.split('/');
  const result = [];
  parts.forEach(part => {
    if (part === '..') result.pop();
    else if (part !== '.') result.push(part);
  });
  return result.join('/');
}

module.exports = { build };