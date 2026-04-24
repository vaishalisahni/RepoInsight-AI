const Parser     = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const fs         = require('fs');

// TypeScript grammar is optional — gracefully fall back to JS parser
let TypeScript = null;
try {
  TypeScript = require('tree-sitter-typescript').typescript;
} catch (_) {
  console.warn('[parser] tree-sitter-typescript not available, using JS parser for .ts files');
}

const PARSERS = {
  js:  () => { const p = new Parser(); p.setLanguage(JavaScript); return p; },
  jsx: () => { const p = new Parser(); p.setLanguage(JavaScript); return p; },
  ts:  () => { const p = new Parser(); p.setLanguage(TypeScript || JavaScript); return p; },
  tsx: () => { const p = new Parser(); p.setLanguage(TypeScript || JavaScript); return p; }
};

function parseFile(filePath) {
  const ext     = filePath.split('.').pop().toLowerCase();
  const factory = PARSERS[ext];
  if (!factory) return null;

  let source;
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
    return null;
  }

  // Skip huge files (>500KB) — return one generic chunk
  if (source.length > 500000) {
    return {
      chunks: [{
        content: source.slice(0, 3000), type: 'generic', name: null,
        startLine: 1, endLine: 50, imports: [], exports: []
      }],
      imports: [], exports: []
    };
  }

  let tree;
  try {
    const parser = factory();
    tree = parser.parse(source);
  } catch (e) {
    // Parser crash — return generic chunk with raw source preview
    return {
      chunks: [{
        content: source.slice(0, 3000), type: 'generic', name: null,
        startLine: 1, endLine: source.split('\n').length, imports: [], exports: []
      }],
      imports: [], exports: []
    };
  }

  const chunks  = [];
  const imports = [];
  const exports = [];

  function visit(node) {
    switch (node.type) {
      case 'import_declaration': {
        const text = source.slice(node.startIndex, node.endIndex);
        imports.push(text);
        chunks.push({
          content: text, type: 'import', name: null,
          startLine: node.startPosition.row + 1,
          endLine:   node.endPosition.row + 1,
          imports: [text], exports: []
        });
        return; // no need to recurse into imports
      }

      case 'function_declaration':
      case 'method_definition': {
        const nameNode = node.childForFieldName('name');
        const name     = nameNode ? source.slice(nameNode.startIndex, nameNode.endIndex) : null;
        const content  = source.slice(node.startIndex, node.endIndex);
        if (content.length < 10000) { // skip absurdly large generated functions
          chunks.push({
            content, type: 'function', name,
            startLine: node.startPosition.row + 1,
            endLine:   node.endPosition.row + 1,
            imports: [], exports: []
          });
        }
        return;
      }

      case 'arrow_function': {
        // Only capture named arrow functions (assigned to const/let)
        const parent = node.parent;
        if (parent && (parent.type === 'variable_declarator' || parent.type === 'assignment_expression')) {
          const nameNode = parent.childForFieldName('name');
          const name     = nameNode ? source.slice(nameNode.startIndex, nameNode.endIndex) : null;
          const content  = source.slice(node.startIndex, node.endIndex);
          if (content.length < 10000) {
            chunks.push({
              content, type: 'function', name,
              startLine: node.startPosition.row + 1,
              endLine:   node.endPosition.row + 1,
              imports: [], exports: []
            });
          }
        }
        return;
      }

      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const name     = nameNode ? source.slice(nameNode.startIndex, nameNode.endIndex) : null;
        const content  = source.slice(node.startIndex, node.endIndex);
        chunks.push({
          content: content.slice(0, 8000), type: 'class', name,
          startLine: node.startPosition.row + 1,
          endLine:   node.endPosition.row + 1,
          imports: [], exports: []
        });
        return; // don't recurse — class body is captured whole
      }

      case 'export_statement': {
        // Capture export names
        const text = source.slice(node.startIndex, node.endIndex);
        const nameNode = node.firstNamedChild;
        if (nameNode) exports.push(source.slice(nameNode.startIndex, nameNode.endIndex));
        // Fall through to recurse into inner declarations
        break;
      }
    }

    node.children.forEach(visit);
  }

  visit(tree.rootNode);

  // Fallback: if nothing was extracted, return a single generic chunk
  if (chunks.length === 0) {
    chunks.push({
      content: source.slice(0, 3000), type: 'generic', name: null,
      startLine: 1, endLine: source.split('\n').length,
      imports: [], exports: []
    });
  }

  return { chunks, imports, exports };
}

module.exports = { parseFile };