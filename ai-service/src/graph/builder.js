/**
 * builder.js — Universal dependency graph builder
 * Understands import/require patterns for JS, TS, Python, Go, Rust, Java, etc.
 */

function build(fileParseResults) {
  const nodes    = [];
  const edges    = [];
  const fileIndex = new Set(Object.keys(fileParseResults));

  Object.entries(fileParseResults).forEach(([filePath, result]) => {
    const lang      = result.language || detectLangFromPath(filePath);
    const functions = result.chunks.filter(c => c.type === 'function' && c.name).map(c => c.name);
    const classes   = result.chunks.filter(c => c.type === 'class'    && c.name).map(c => c.name);

    nodes.push({
      id:       filePath,
      label:    filePath.split('/').pop(),
      type:     detectFileType(filePath, lang),
      filePath,
      language: lang,
      functions,
      classes,
      exports:  result.exports || [],
    });

    // Extract imports based on language
    const importLines = extractImports(result, filePath, lang);
    importLines.forEach(({ rawPath }) => {
      const resolved = resolveImport(rawPath, filePath, fileIndex, lang);
      if (resolved) edges.push({ from: filePath, to: resolved, type: 'imports' });
    });
  });

  return { nodes, edges };
}

/* ─── Import extraction per language ─────────────────────────────────────── */
function extractImports(result, filePath, lang) {
  const imports = [];

  // From parsed import chunks
  result.chunks
    .filter(c => c.type === 'import')
    .forEach(chunk => {
      const content = chunk.content || '';
      const paths   = extractPathsFromContent(content, lang);
      paths.forEach(p => imports.push({ rawPath: p }));
    });

  // Also scan all chunks for inline requires / imports
  result.chunks.forEach(chunk => {
    if (chunk.type === 'import') return;
    const content = chunk.content || '';
    const paths   = extractPathsFromContent(content, lang);
    paths.forEach(p => imports.push({ rawPath: p }));
  });

  return imports;
}

function extractPathsFromContent(content, lang) {
  const paths = [];

  switch (lang) {
    case 'javascript':
    case 'typescript': {
      // ES import: import ... from '...'
      const esm = /\bfrom\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = esm.exec(content))) paths.push(m[1]);
      // CommonJS require
      const cjs = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((m = cjs.exec(content))) paths.push(m[1]);
      break;
    }
    case 'python': {
      // from x import y  /  import x
      const fromImp = /^from\s+([\w.]+)\s+import/gm;
      const imp     = /^import\s+([\w.]+)/gm;
      let m;
      while ((m = fromImp.exec(content))) paths.push(m[1].replace(/\./g, '/'));
      while ((m = imp.exec(content)))     paths.push(m[1].replace(/\./g, '/'));
      break;
    }
    case 'go': {
      // import "pkg/sub"  or  import ( "pkg/sub" )
      const goImp = /["']([^"']+)["']/g;
      let m;
      while ((m = goImp.exec(content))) paths.push(m[1]);
      break;
    }
    case 'rust': {
      // use crate::module;  use super::something;
      const useRe = /\buse\s+([\w:]+)/g;
      let m;
      while ((m = useRe.exec(content))) paths.push(m[1].replace(/::/g, '/'));
      break;
    }
    case 'java':
    case 'kotlin': {
      // import com.example.Foo;
      const javaImp = /\bimport\s+([\w.]+)/g;
      let m;
      while ((m = javaImp.exec(content))) paths.push(m[1].replace(/\./g, '/'));
      break;
    }
    case 'ruby': {
      const rbImp = /\brequire(?:_relative)?\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = rbImp.exec(content))) paths.push(m[1]);
      break;
    }
    case 'php': {
      const phpImp = /\b(?:require|include)(?:_once)?\s+['"]([^'"]+)['"]/g;
      const useRe  = /\buse\s+([\w\\]+)/g;
      let m;
      while ((m = phpImp.exec(content))) paths.push(m[1]);
      while ((m = useRe.exec(content)))  paths.push(m[1].replace(/\\/g, '/'));
      break;
    }
    case 'c':
    case 'cpp': {
      const cInc = /#include\s+["<]([^">]+)[">]/g;
      let m;
      while ((m = cInc.exec(content))) paths.push(m[1]);
      break;
    }
    case 'elixir': {
      const exImp = /\b(?:import|alias|use|require)\s+([\w.]+)/g;
      let m;
      while ((m = exImp.exec(content))) paths.push(m[1].replace(/\./g, '/'));
      break;
    }
    case 'swift': {
      const swImp = /\bimport\s+(\w+)/g;
      let m;
      while ((m = swImp.exec(content))) paths.push(m[1]);
      break;
    }
    case 'dart': {
      const dartImp = /\bimport\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = dartImp.exec(content))) paths.push(m[1]);
      break;
    }
    case 'lua': {
      const luaImp = /\brequire\s*\(?['"]([^'"]+)['"]\)?/g;
      let m;
      while ((m = luaImp.exec(content))) paths.push(m[1].replace(/\./g, '/'));
      break;
    }
    default:
      break;
  }

  return [...new Set(paths)].filter(p =>
    p && p.length > 0 && p.length < 200 && !p.includes('\n')
  );
}

/* ─── Import resolution ──────────────────────────────────────────────────── */
function resolveImport(importPath, fromFile, fileIndex, lang) {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    // Absolute / package imports — try to find within repo
    // E.g. Python: "myapp.utils" → look for myapp/utils.py
    const candidates = buildCandidates(importPath, lang);
    return candidates.find(c => fileIndex.has(c)) || null;
  }

  // Relative import
  const dir = fromFile.split('/').slice(0, -1).join('/');
  const base = normalizePath(`${dir}/${importPath}`);
  const candidates = buildCandidates(base, lang);
  return candidates.find(c => fileIndex.has(c)) || null;
}

function buildCandidates(base, lang) {
  switch (lang) {
    case 'javascript':
    case 'typescript':
      return [
        `${base}.js`, `${base}.ts`, `${base}.jsx`, `${base}.tsx`,
        `${base}/index.js`, `${base}/index.ts`, `${base}/index.jsx`, `${base}/index.tsx`,
        base,
      ];
    case 'python':
      return [`${base}.py`, `${base}/__init__.py`, base];
    case 'go':
      return [`${base}.go`, base];
    case 'rust':
      return [`${base}.rs`, `${base}/mod.rs`, base];
    case 'ruby':
      return [`${base}.rb`, `${base}/index.rb`, base];
    case 'php':
      return [`${base}.php`, base];
    case 'c':
    case 'cpp':
      return [base, `${base}.c`, `${base}.cpp`, `${base}.h`, `${base}.hpp`];
    case 'dart':
      return [base, `${base}.dart`];
    default:
      return [base];
  }
}

/* ─── File type detection ────────────────────────────────────────────────── */
function detectFileType(filePath, lang) {
  const p = filePath.toLowerCase();

  if (p.includes('route') || p.includes('controller') || p.includes('handler')) return 'route';
  if (p.includes('service') || p.includes('_service'))  return 'service';
  if (p.includes('model')   || p.includes('schema') || p.includes('entity')) return 'model';
  if (p.includes('middleware') || p.includes('interceptor')) return 'middleware';
  if (p.includes('util') || p.includes('helper') || p.includes('lib/')) return 'utility';
  if (p.includes('test') || p.includes('spec') || p.includes('_test.') || p.includes('.test.')) return 'test';
  if (p.includes('index') || p.includes('main') || p.includes('app.') || p.includes('server.')) return 'entry';
  if (p.includes('config') || p.includes('setting') || p.includes('.env')) return 'config';
  if (p.includes('migration') || p.includes('seed')) return 'migration';
  if (p.includes('component') || p.includes('.jsx') || p.includes('.tsx') || p.includes('.vue') || p.includes('.svelte')) return 'component';
  if (p.includes('hook') || p.includes('use_')) return 'hook';
  if (p.includes('store') || p.includes('redux') || p.includes('zustand')) return 'store';

  switch (lang) {
    case 'python': return 'python-module';
    case 'go':     return 'go-package';
    case 'rust':   return 'rust-module';
    case 'java':   return 'java-class';
    case 'ruby':   return 'ruby-module';
    case 'php':    return 'php-module';
    case 'c':      return 'c-module';
    case 'cpp':    return 'cpp-module';
    default:       return 'module';
  }
}

function detectLangFromPath(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', pyw: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    rb: 'ruby',
    php: 'php',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
    cs: 'csharp',
    swift: 'swift',
    dart: 'dart',
    ex: 'elixir', exs: 'elixir',
  };
  return map[ext] || 'unknown';
}

function normalizePath(p) {
  const parts  = p.split('/');
  const result = [];
  parts.forEach(part => {
    if (part === '..') result.pop();
    else if (part !== '.') result.push(part);
  });
  return result.join('/');
}

module.exports = { build };