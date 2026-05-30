"""
builder.py
Universal dependency graph builder — Python port of builder.js.
Understands import/require patterns for JS, TS, Python, Go, Rust, Java, etc.
"""

import re
import os
from pathlib import Path


# ── Language detection from extension ────────────────────────────────────────

EXT_LANG = {
    "js": "javascript", "jsx": "javascript", "mjs": "javascript", "cjs": "javascript",
    "ts": "typescript", "tsx": "typescript",
    "py": "python", "pyw": "python",
    "go": "go",
    "rs": "rust",
    "java": "java",
    "kt": "kotlin",
    "rb": "ruby",
    "php": "php",
    "c": "c", "h": "c",
    "cpp": "cpp", "cc": "cpp", "cxx": "cpp", "hpp": "cpp",
    "cs": "csharp",
    "swift": "swift",
    "dart": "dart",
    "ex": "elixir", "exs": "elixir",
}


def detect_lang_from_path(file_path: str) -> str:
    ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""
    return EXT_LANG.get(ext, "unknown")


# ── File type detection ───────────────────────────────────────────────────────

def detect_file_type(file_path: str, lang: str) -> str:
    p = file_path.lower()
    if any(x in p for x in ["route", "controller", "handler"]):   return "route"
    if any(x in p for x in ["service", "_service"]):              return "service"
    if any(x in p for x in ["model", "schema", "entity"]):        return "model"
    if any(x in p for x in ["middleware", "interceptor"]):         return "middleware"
    if any(x in p for x in ["util", "helper", "lib/"]):           return "utility"
    if any(x in p for x in ["test", "spec", "_test.", ".test."]):  return "test"
    if any(x in p for x in ["index", "main", "app.", "server."]):  return "entry"
    if any(x in p for x in ["config", "setting", ".env"]):        return "config"
    if any(x in p for x in ["migration", "seed"]):                return "migration"
    if any(x in p for x in ["component", ".jsx", ".tsx", ".vue", ".svelte"]): return "component"
    if any(x in p for x in ["hook", "use_"]):                     return "hook"
    if any(x in p for x in ["store", "redux", "zustand"]):        return "store"

    lang_defaults = {
        "python": "python-module", "go": "go-package", "rust": "rust-module",
        "java": "java-class", "ruby": "ruby-module", "php": "php-module",
        "c": "c-module", "cpp": "cpp-module",
    }
    return lang_defaults.get(lang, "module")


# ── Import path extraction per language ───────────────────────────────────────

def extract_paths_from_content(content: str, lang: str) -> list[str]:
    paths = set()

    if lang in ("javascript", "typescript"):
        for m in re.finditer(r'\bfrom\s+[\'"]([^\'"]+)[\'"]', content):
            paths.add(m.group(1))
        for m in re.finditer(r'\brequire\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)', content):
            paths.add(m.group(1))

    elif lang == "python":
        for m in re.finditer(r'^from\s+([\w.]+)\s+import', content, re.MULTILINE):
            paths.add(m.group(1).replace(".", "/"))
        for m in re.finditer(r'^import\s+([\w.]+)', content, re.MULTILINE):
            paths.add(m.group(1).replace(".", "/"))

    elif lang == "go":
        for m in re.finditer(r'["\']([^"\']+)["\']', content):
            paths.add(m.group(1))

    elif lang == "rust":
        for m in re.finditer(r'\buse\s+([\w:]+)', content):
            paths.add(m.group(1).replace("::", "/"))

    elif lang in ("java", "kotlin"):
        for m in re.finditer(r'\bimport\s+([\w.]+)', content):
            paths.add(m.group(1).replace(".", "/"))

    elif lang == "ruby":
        for m in re.finditer(r'\brequire(?:_relative)?\s+[\'"]([^\'"]+)[\'"]', content):
            paths.add(m.group(1))

    elif lang == "php":
        for m in re.finditer(r'\b(?:require|include)(?:_once)?\s+[\'"]([^\'"]+)[\'"]', content):
            paths.add(m.group(1))
        for m in re.finditer(r'\buse\s+([\w\\]+)', content):
            paths.add(m.group(1).replace("\\", "/"))

    elif lang in ("c", "cpp"):
        for m in re.finditer(r'#include\s+["<]([^">]+)[">]', content):
            paths.add(m.group(1))

    elif lang == "elixir":
        for m in re.finditer(r'\b(?:import|alias|use|require)\s+([\w.]+)', content):
            paths.add(m.group(1).replace(".", "/"))

    elif lang == "swift":
        for m in re.finditer(r'\bimport\s+(\w+)', content):
            paths.add(m.group(1))

    elif lang == "dart":
        for m in re.finditer(r'\bimport\s+[\'"]([^\'"]+)[\'"]', content):
            paths.add(m.group(1))

    elif lang == "lua":
        for m in re.finditer(r'\brequire\s*\(?[\'"]([^\'"]+)[\'"]\)?', content):
            paths.add(m.group(1).replace(".", "/"))

    return [p for p in paths if p and len(p) < 200 and "\n" not in p]


def extract_imports(result: dict, file_path: str, lang: str) -> list[dict]:
    imports = []
    for chunk in result.get("chunks", []):
        content = chunk.get("content", "")
        for raw_path in extract_paths_from_content(content, lang):
            imports.append({"rawPath": raw_path})
    return imports


# ── Import resolution ─────────────────────────────────────────────────────────

def _build_candidates(base: str, lang: str) -> list[str]:
    if lang in ("javascript", "typescript"):
        return [
            f"{base}.js", f"{base}.ts", f"{base}.jsx", f"{base}.tsx",
            f"{base}/index.js", f"{base}/index.ts",
            f"{base}/index.jsx", f"{base}/index.tsx",
            base,
        ]
    elif lang == "python":
        return [f"{base}.py", f"{base}/__init__.py", base]
    elif lang == "go":
        return [f"{base}.go", base]
    elif lang == "rust":
        return [f"{base}.rs", f"{base}/mod.rs", base]
    elif lang == "ruby":
        return [f"{base}.rb", base]
    elif lang == "php":
        return [f"{base}.php", base]
    elif lang in ("c", "cpp"):
        return [base, f"{base}.c", f"{base}.cpp", f"{base}.h", f"{base}.hpp"]
    elif lang == "dart":
        return [base, f"{base}.dart"]
    else:
        return [base]


def _normalize_path(p: str) -> str:
    parts = p.split("/")
    result = []
    for part in parts:
        if part == "..":
            if result:
                result.pop()
        elif part and part != ".":
            result.append(part)
    return "/".join(result)


def resolve_import(import_path: str, from_file: str, file_index: set, lang: str) -> str | None:
    if not import_path.startswith(".") and not import_path.startswith("/"):
        # Absolute/package import — try to match within repo
        candidates = _build_candidates(import_path, lang)
        return next((c for c in candidates if c in file_index), None)

    # Relative import
    dir_parts = from_file.rsplit("/", 1)
    directory = dir_parts[0] if len(dir_parts) > 1 else ""
    base = _normalize_path(f"{directory}/{import_path}" if directory else import_path)
    candidates = _build_candidates(base, lang)
    return next((c for c in candidates if c in file_index), None)


# ── Public API ────────────────────────────────────────────────────────────────

def build(file_parse_results: dict) -> dict:
    """
    Build a dependency graph from parsed file results.

    Args:
        file_parse_results: dict mapping relative file path -> parse result
                            (each result has 'chunks', 'language', etc.)

    Returns:
        {"nodes": [...], "edges": [...]}
    """
    nodes = []
    edges = []
    file_index = set(file_parse_results.keys())

    for file_path, result in file_parse_results.items():
        lang = result.get("language") or detect_lang_from_path(file_path)
        chunks = result.get("chunks", [])

        functions = [c["name"] for c in chunks if c.get("type") == "function" and c.get("name")]
        classes   = [c["name"] for c in chunks if c.get("type") == "class"    and c.get("name")]

        nodes.append({
            "id":        file_path,
            "label":     Path(file_path).name,
            "type":      detect_file_type(file_path, lang),
            "filePath":  file_path,
            "language":  lang,
            "functions": functions,
            "classes":   classes,
            "exports":   result.get("exports", []),
        })

        # Resolve imports to edges
        for imp in extract_imports(result, file_path, lang):
            resolved = resolve_import(imp["rawPath"], file_path, file_index, lang)
            if resolved:
                edges.append({"from": file_path, "to": resolved, "type": "imports"})

    # Deduplicate edges
    seen = set()
    unique_edges = []
    for edge in edges:
        key = (edge["from"], edge["to"])
        if key not in seen:
            seen.add(key)
            unique_edges.append(edge)

    return {"nodes": nodes, "edges": unique_edges}