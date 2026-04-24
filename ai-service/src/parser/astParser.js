/**
 * astParser.js — Universal multi-language code parser
 * Supports: JS, TS, JSX, TSX (via tree-sitter)
 *           Python, Go, Rust, Java, Ruby, PHP, C, C++ (regex-based fallback)
 *           Any other file: raw-text chunker
 */

const Parser     = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const fs         = require('fs');
const path       = require('path');

/* ─── Optional tree-sitter grammars ─────────────────────────────────────── */
let TypeScript = null;
try { TypeScript = require('tree-sitter-typescript').typescript; } catch (_) {}

let Python = null;
try { Python = require('tree-sitter-python'); } catch (_) {}

/* ─── Extension → language metadata ─────────────────────────────────────── */
const EXT_MAP = {
  // JavaScript family
  js:   { lang: 'javascript',  parser: 'treesitter-js'  },
  jsx:  { lang: 'javascript',  parser: 'treesitter-js'  },
  mjs:  { lang: 'javascript',  parser: 'treesitter-js'  },
  cjs:  { lang: 'javascript',  parser: 'treesitter-js'  },
  ts:   { lang: 'typescript',  parser: 'treesitter-ts'  },
  tsx:  { lang: 'typescript',  parser: 'treesitter-ts'  },
  // Python
  py:   { lang: 'python',      parser: 'treesitter-py'  },
  pyw:  { lang: 'python',      parser: 'treesitter-py'  },
  // Everything else — regex-based
  go:   { lang: 'go',          parser: 'regex'  },
  rs:   { lang: 'rust',        parser: 'regex'  },
  java: { lang: 'java',        parser: 'regex'  },
  kt:   { lang: 'kotlin',      parser: 'regex'  },
  rb:   { lang: 'ruby',        parser: 'regex'  },
  php:  { lang: 'php',         parser: 'regex'  },
  c:    { lang: 'c',           parser: 'regex'  },
  cpp:  { lang: 'cpp',         parser: 'regex'  },
  cc:   { lang: 'cpp',         parser: 'regex'  },
  cxx:  { lang: 'cpp',         parser: 'regex'  },
  h:    { lang: 'c',           parser: 'regex'  },
  hpp:  { lang: 'cpp',         parser: 'regex'  },
  cs:   { lang: 'csharp',      parser: 'regex'  },
  swift:{ lang: 'swift',       parser: 'regex'  },
  dart: { lang: 'dart',        parser: 'regex'  },
  r:    { lang: 'r',           parser: 'regex'  },
  scala:{ lang: 'scala',       parser: 'regex'  },
  lua:  { lang: 'lua',         parser: 'regex'  },
  ex:   { lang: 'elixir',      parser: 'regex'  },
  exs:  { lang: 'elixir',      parser: 'regex'  },
  hs:   { lang: 'haskell',     parser: 'regex'  },
  // Config / data
  json: { lang: 'json',        parser: 'text'   },
  yaml: { lang: 'yaml',        parser: 'text'   },
  yml:  { lang: 'yaml',        parser: 'text'   },
  toml: { lang: 'toml',        parser: 'text'   },
  xml:  { lang: 'xml',         parser: 'text'   },
  html: { lang: 'html',        parser: 'text'   },
  css:  { lang: 'css',         parser: 'text'   },
  scss: { lang: 'scss',        parser: 'text'   },
  sass: { lang: 'sass',        parser: 'text'   },
  less: { lang: 'less',        parser: 'text'   },
  sql:  { lang: 'sql',         parser: 'text'   },
  sh:   { lang: 'shell',       parser: 'regex'  },
  bash: { lang: 'shell',       parser: 'regex'  },
  zsh:  { lang: 'shell',       parser: 'regex'  },
  md:   { lang: 'markdown',    parser: 'text'   },
  mdx:  { lang: 'markdown',    parser: 'text'   },
  txt:  { lang: 'text',        parser: 'text'   },
  env:  { lang: 'env',         parser: 'text'   },
  dockerfile: { lang: 'dockerfile', parser: 'text' },
};

/* ─── Regex patterns per language ───────────────────────────────────────── */
const REGEX_PATTERNS = {
  python: {
    function: /^(?:async\s+)?def\s+(\w+)\s*\(/m,
    class:    /^class\s+(\w+)[\s(:]/m,
    import:   /^(?:import|from)\s+\S+/m,
    block:    /^(?:(?:async\s+)?def |class )/m,
  },
  go: {
    function: /^func\s+(?:\([\w\s*]+\)\s+)?(\w+)\s*\(/m,
    class:    /^type\s+(\w+)\s+struct/m,
    import:   /^import\s+(?:\(|")/m,
    block:    /^func\s/m,
  },
  rust: {
    function: /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[<(]/m,
    class:    /^(?:pub\s+)?(?:struct|enum|trait|impl)\s+(\w+)/m,
    import:   /^use\s+\S+/m,
    block:    /^(?:pub\s+)?(?:async\s+)?fn\s/m,
  },
  java: {
    function: /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(/m,
    class:    /(?:public|private|protected)?\s+(?:class|interface|enum)\s+(\w+)/m,
    import:   /^import\s+[\w.]+;/m,
    block:    /(?:public|private|protected)/m,
  },
  kotlin: {
    function: /^(?:fun|suspend fun)\s+(\w+)\s*[(<]/m,
    class:    /^(?:class|object|interface|data class)\s+(\w+)/m,
    import:   /^import\s+\S+/m,
    block:    /^(?:fun|suspend fun)\s/m,
  },
  ruby: {
    function: /^\s*def\s+(self\.)?\s*(\w+)/m,
    class:    /^class\s+(\w+)/m,
    import:   /^require(?:_relative)?\s+/m,
    block:    /^\s*def\s/m,
  },
  php: {
    function: /^(?:public|private|protected|static|\s)*function\s+(\w+)\s*\(/m,
    class:    /^(?:abstract\s+)?class\s+(\w+)/m,
    import:   /^(?:require|include|use)\s+/m,
    block:    /function\s+\w+\s*\(/m,
  },
  c: {
    function: /^(?:static\s+)?(?:inline\s+)?[\w\s*]+\s+(\w+)\s*\([^;{]*\)\s*\{/m,
    class:    /^(?:typedef\s+)?struct\s+(\w+)/m,
    import:   /^#include\s+[<"]/m,
    block:    /^[\w\s*]+\s+\w+\s*\(/m,
  },
  cpp: {
    function: /^(?:static\s+)?(?:inline\s+)?[\w\s:*<>]+\s+(\w+)\s*\([^;{]*\)\s*(?:const\s*)?\{/m,
    class:    /^(?:class|struct)\s+(\w+)/m,
    import:   /^#include\s+[<"]/m,
    block:    /^(?:class|struct|\w+ \w+\()/m,
  },
  csharp: {
    function: /(?:public|private|protected|static|\s)+[\w<>\[\]?]+\s+(\w+)\s*\(/m,
    class:    /(?:public|private|protected)?\s+(?:class|interface|struct|enum)\s+(\w+)/m,
    import:   /^using\s+[\w.]+;/m,
    block:    /(?:public|private|protected)/m,
  },
  swift: {
    function: /^(?:func|override func|class func|static func)\s+(\w+)\s*[<(]/m,
    class:    /^(?:class|struct|enum|protocol|extension)\s+(\w+)/m,
    import:   /^import\s+\w+/m,
    block:    /^(?:func|class|struct)\s/m,
  },
  dart: {
    function: /^(?:Future<\w+>|void|String|int|bool|\w+)\s+(\w+)\s*\([^)]*\)\s*(?:async\s*)?\{/m,
    class:    /^(?:abstract\s+)?class\s+(\w+)/m,
    import:   /^import\s+'[^']+'/m,
    block:    /^\w+\s+\w+\s*\(/m,
  },
  shell: {
    function: /^(\w+)\s*\(\s*\)\s*\{/m,
    class:    null,
    import:   /^(?:source|\.\s+)\S+/m,
    block:    /^\w+\s*\(\)/m,
  },
  elixir: {
    function: /^(?:def|defp|defmacro)\s+(\w+)/m,
    class:    /^defmodule\s+(\S+)/m,
    import:   /^(?:import|require|use|alias)\s+/m,
    block:    /^(?:def|defp|defmodule)\s/m,
  },
  scala: {
    function: /^(?:def)\s+(\w+)/m,
    class:    /^(?:class|object|trait|case class)\s+(\w+)/m,
    import:   /^import\s+\S+/m,
    block:    /^(?:def|class|object)\s/m,
  },
  lua: {
    function: /^(?:local\s+)?function\s+(\w+)\s*\(/m,
    class:    null,
    import:   /^require\s*\(/m,
    block:    /^(?:local\s+)?function\s/m,
  },
  haskell: {
    function: /^(\w+)\s+::/m,
    class:    /^(?:data|newtype|class)\s+(\w+)/m,
    import:   /^import\s+\S+/m,
    block:    /^\w+\s+::/m,
  },
  r: {
    function: /^(\w+)\s*<-\s*function\s*\(/m,
    class:    /^setClass\s*\("/m,
    import:   /^(?:library|require)\s*\(/m,
    block:    /\bfunction\s*\(/m,
  },
};

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
function readSource(filePath) {
  try {
    const s = fs.readFileSync(filePath, 'utf-8');
    // Reject binary-looking content
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0e-\x1f]/.test(s.slice(0, 512))) return null;
    return s;
  } catch (_) { return null; }
}

function genericChunk(source, lang) {
  const lines  = source.split('\n');
  const chunks = [];
  const SIZE   = 60; // lines per chunk
  for (let i = 0; i < lines.length; i += SIZE) {
    const slice = lines.slice(i, i + SIZE).join('\n');
    chunks.push({
      content:   slice.slice(0, 4000),
      type:      'generic',
      name:      null,
      startLine: i + 1,
      endLine:   Math.min(i + SIZE, lines.length),
      imports:   [],
      exports:   [],
      language:  lang,
    });
  }
  return chunks.length ? chunks : [{
    content:   source.slice(0, 4000),
    type:      'generic', name: null,
    startLine: 1, endLine: lines.length,
    imports: [], exports: [], language: lang,
  }];
}

/* ─── Tree-sitter JS/TS parser ──────────────────────────────────────────── */
function parseWithTreeSitter(source, language) {
  const parser = new Parser();
  parser.setLanguage(language);

  let tree;
  try { tree = parser.parse(source); }
  catch (_) { return null; }

  const chunks  = [];
  const imports = [];
  const exports = [];

  function visit(node) {
    switch (node.type) {
      case 'import_declaration': {
        const text = source.slice(node.startIndex, node.endIndex);
        imports.push(text);
        chunks.push({ content: text, type: 'import', name: null,
          startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1,
          imports: [text], exports: [], language: 'javascript' });
        return;
      }
      case 'function_declaration':
      case 'method_definition':
      case 'function_expression': {
        const nameNode = node.childForFieldName('name');
        const name     = nameNode ? source.slice(nameNode.startIndex, nameNode.endIndex) : null;
        const content  = source.slice(node.startIndex, node.endIndex);
        if (content.length < 12000)
          chunks.push({ content, type: 'function', name,
            startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1,
            imports: [], exports: [], language: 'javascript' });
        return;
      }
      case 'arrow_function': {
        const p = node.parent;
        if (p && (p.type === 'variable_declarator' || p.type === 'assignment_expression')) {
          const nn = p.childForFieldName('name');
          const name = nn ? source.slice(nn.startIndex, nn.endIndex) : null;
          const content = source.slice(node.startIndex, node.endIndex);
          if (content.length < 12000)
            chunks.push({ content, type: 'function', name,
              startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1,
              imports: [], exports: [], language: 'javascript' });
        }
        return;
      }
      case 'class_declaration': {
        const nn   = node.childForFieldName('name');
        const name = nn ? source.slice(nn.startIndex, nn.endIndex) : null;
        const content = source.slice(node.startIndex, node.endIndex);
        chunks.push({ content: content.slice(0, 8000), type: 'class', name,
          startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1,
          imports: [], exports: [], language: 'javascript' });
        return;
      }
      case 'export_statement': {
        const nn = node.firstNamedChild;
        if (nn) exports.push(source.slice(nn.startIndex, nn.endIndex));
        break;
      }
    }
    node.children.forEach(visit);
  }

  visit(tree.rootNode);
  return { chunks, imports, exports };
}

/* ─── Python tree-sitter parser ─────────────────────────────────────────── */
function parseWithTreeSitterPython(source) {
  if (!Python) return null;
  const parser = new Parser();
  try { parser.setLanguage(Python); } catch (_) { return null; }

  let tree;
  try { tree = parser.parse(source); } catch (_) { return null; }

  const chunks  = [];
  const imports = [];
  const exports = [];

  function visit(node) {
    switch (node.type) {
      case 'import_statement':
      case 'import_from_statement': {
        const text = source.slice(node.startIndex, node.endIndex);
        imports.push(text);
        chunks.push({ content: text, type: 'import', name: null,
          startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1,
          imports: [text], exports: [], language: 'python' });
        return;
      }
      case 'function_definition':
      case 'async_function_definition': {
        const nn = node.childForFieldName('name');
        const name = nn ? source.slice(nn.startIndex, nn.endIndex) : null;
        const content = source.slice(node.startIndex, node.endIndex);
        if (content.length < 12000)
          chunks.push({ content, type: 'function', name,
            startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1,
            imports: [], exports: [], language: 'python' });
        return;
      }
      case 'class_definition': {
        const nn = node.childForFieldName('name');
        const name = nn ? source.slice(nn.startIndex, nn.endIndex) : null;
        const content = source.slice(node.startIndex, node.endIndex);
        chunks.push({ content: content.slice(0, 8000), type: 'class', name,
          startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1,
          imports: [], exports: [], language: 'python' });
        return;
      }
    }
    node.children.forEach(visit);
  }

  visit(tree.rootNode);
  return { chunks, imports, exports };
}

/* ─── Regex-based parser (fallback for most languages) ──────────────────── */
function parseWithRegex(source, lang) {
  const patterns = REGEX_PATTERNS[lang];
  const lines    = source.split('\n');
  const chunks   = [];
  const imports  = [];
  const exports  = [];

  if (!patterns) return { chunks: genericChunk(source, lang), imports, exports };

  // Collect import lines
  lines.forEach((line, i) => {
    if (patterns.import && patterns.import.test(line)) {
      imports.push(line.trim());
      chunks.push({ content: line, type: 'import', name: null,
        startLine: i + 1, endLine: i + 1, imports: [line], exports: [], language: lang });
    }
  });

  // Chunk by function/class blocks using indentation or brace counting
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isFn    = patterns.function && patterns.function.test(line);
    const isCls   = patterns.class    && patterns.class.test(line);

    if (isFn || isCls) {
      const type    = isFn ? 'function' : 'class';
      const match   = isFn
        ? (patterns.function.exec(line) || [])
        : (patterns.class?.exec(line)   || []);
      const name    = match[1] || match[2] || null;
      const startLine = i + 1;

      // Capture block: collect until blank line or dedent
      let end = i + 1;
      let braces = 0;

      // Count opening braces/brackets on first line
      for (const ch of line) {
        if (ch === '{' || ch === '(') braces++;
        if (ch === '}' || ch === ')') braces--;
      }

      // Languages using braces: scan until balanced
      const braceStyle = [
        'go','rust','java','kotlin','php','c','cpp','csharp','swift','dart','scala','lua'
      ].includes(lang);

      if (braceStyle) {
        while (end < lines.length && (braces > 0 || end === i + 1)) {
          if (end > i) {
            for (const ch of lines[end]) {
              if (ch === '{') braces++;
              if (ch === '}') braces--;
            }
          }
          end++;
          if (end - i > 300) break; // cap
        }
      } else {
        // Indentation style (Python, Ruby, Elixir, Haskell, etc.)
        const baseIndent = line.match(/^(\s*)/)[1].length;
        while (end < lines.length) {
          const l = lines[end];
          if (l.trim() === '') { end++; continue; }
          const indent = l.match(/^(\s*)/)[1].length;
          if (indent <= baseIndent && end > i + 1) break;
          end++;
          if (end - i > 200) break;
        }
      }

      const blockLines = lines.slice(i, end);
      const content    = blockLines.join('\n').slice(0, 10000);

      if (content.length > 5)
        chunks.push({ content, type, name, startLine, endLine: end,
          imports: [], exports: [], language: lang });

      i = end;
    } else {
      i++;
    }
  }

  // If nothing found, fall back to chunked text
  if (chunks.filter(c => c.type !== 'import').length === 0) {
    return { chunks: [...chunks, ...genericChunk(source, lang)], imports, exports };
  }

  return { chunks, imports, exports };
}

/* ─── Text chunker (JSON, YAML, HTML, CSS, etc.) ────────────────────────── */
function parseAsText(source, lang) {
  return {
    chunks:  genericChunk(source, lang),
    imports: [],
    exports: [],
  };
}

/* ─── Public API ─────────────────────────────────────────────────────────── */
function getLanguage(filePath) {
  const base = path.basename(filePath).toLowerCase();

  // Special filenames
  if (base === 'dockerfile' || base.startsWith('dockerfile.'))
    return { lang: 'dockerfile', parser: 'text' };
  if (base === 'makefile' || base === 'makefile.am')
    return { lang: 'makefile', parser: 'text' };
  if (base === '.env' || base.startsWith('.env.'))
    return { lang: 'env', parser: 'text' };
  if (base === 'gemfile')
    return { lang: 'ruby', parser: 'regex' };
  if (base === 'requirements.txt' || base === 'setup.py' || base === 'setup.cfg')
    return { lang: 'python', parser: 'text' };
  if (base === 'go.mod' || base === 'go.sum')
    return { lang: 'go', parser: 'text' };

  const ext = base.split('.').pop();
  return EXT_MAP[ext] || null;
}

function parseFile(filePath) {
  const langInfo = getLanguage(filePath);
  if (!langInfo) return null; // unknown extension — skip

  const source = readSource(filePath);
  if (!source) return null;

  // Skip huge files
  if (source.length > 800_000) {
    return {
      chunks: [{ content: source.slice(0, 4000), type: 'generic', name: null,
        startLine: 1, endLine: 80, imports: [], exports: [], language: langInfo.lang }],
      imports: [], exports: [], language: langInfo.lang,
    };
  }

  let result = null;

  switch (langInfo.parser) {
    case 'treesitter-js': {
      const tsLang = ['ts','tsx'].includes(filePath.split('.').pop())
        ? (TypeScript || JavaScript) : JavaScript;
      result = parseWithTreeSitter(source, tsLang);
      break;
    }
    case 'treesitter-ts': {
      result = parseWithTreeSitter(source, TypeScript || JavaScript);
      break;
    }
    case 'treesitter-py': {
      result = parseWithTreeSitterPython(source);
      break;
    }
    case 'regex': {
      result = parseWithRegex(source, langInfo.lang);
      break;
    }
    case 'text':
    default: {
      result = parseAsText(source, langInfo.lang);
      break;
    }
  }

  if (!result) result = parseAsText(source, langInfo.lang);
  if (!result.chunks.length) result.chunks = genericChunk(source, langInfo.lang);

  return { ...result, language: langInfo.lang };
}

/**
 * Return the set of supported extensions (for glob patterns).
 */
function getSupportedExtensions() {
  return Object.keys(EXT_MAP);
}

module.exports = { parseFile, getLanguage, getSupportedExtensions };