const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const TypeScript = require('tree-sitter-typescript').typescript;
const fs = require('fs');

const PARSERS = {
  js: () => { const p = new Parser(); p.setLanguage(JavaScript); return p; },
  jsx: () => { const p = new Parser(); p.setLanguage(JavaScript); return p; },
  ts: () => { const p = new Parser(); p.setLanguage(TypeScript); return p; },
  tsx: () => { const p = new Parser(); p.setLanguage(TypeScript); return p; }
};

/**
 * Parse a file and extract semantic chunks.
 * Returns: Array of { content, type, name, startLine, endLine, imports, exports }
 */
function parseFile(filePath) {
  const ext = filePath.split('.').pop();
  const parserFactory = PARSERS[ext];
  if (!parserFactory) return null; // Unsupported language

  const source = fs.readFileSync(filePath, 'utf-8');
  const parser = parserFactory();
  const tree = parser.parse(source);
  const lines = source.split('\n');
  const chunks = [];
  const imports = [];
  const exports = [];

  function visit(node) {
    switch (node.type) {
      case 'import_declaration': {
        const text = source.slice(node.startIndex, node.endIndex);
        imports.push(text);
        chunks.push({
          content: text,
          type: 'import',
          name: null,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          imports: [text],
          exports: []
        });
        break;
      }
      case 'function_declaration':
      case 'arrow_function':
      case 'method_definition': {
        const nameNode = node.childForFieldName('name');
        const name = nameNode ? source.slice(nameNode.startIndex, nameNode.endIndex) : null;
        const content = source.slice(node.startIndex, node.endIndex);
        chunks.push({
          content,
          type: 'function',
          name,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          imports: [],
          exports: []
        });
        break;
      }
      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const name = nameNode ? source.slice(nameNode.startIndex, nameNode.endIndex) : null;
        const content = source.slice(node.startIndex, node.endIndex);
        chunks.push({
          content,
          type: 'class',
          name,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          imports: [],
          exports: []
        });
        return; // Don't recurse into class body – it'll be a full chunk
      }
      case 'export_statement': {
        const text = source.slice(node.startIndex, node.endIndex);
        const nameNode = node.firstNamedChild;
        const name = nameNode ? source.slice(nameNode.startIndex, nameNode.endIndex) : null;
        exports.push(name || text);
        // Fall through to also capture inner function/class
        node.children.forEach(visit);
        return;
      }
    }
    node.children.forEach(visit);
  }

  visit(tree.rootNode);

  // If no AST chunks found (e.g. just a config file), create one generic chunk
  if (chunks.length === 0) {
    chunks.push({
      content: source.slice(0, 3000), // Max 3KB for generic chunk
      type: 'generic',
      name: null,
      startLine: 1,
      endLine: lines.length,
      imports: [],
      exports: []
    });
  }

  return { chunks, imports, exports };
}

module.exports = { parseFile };