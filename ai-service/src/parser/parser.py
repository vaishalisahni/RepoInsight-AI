"""
parser.py — Universal multi-language code parser using regex.
Extracts functions, classes, imports from 20+ languages.
Returns same structure as the Node version so the pipeline is identical.
"""

import os
import re
from pathlib import Path
from typing import Optional

# ── Extension → language map ──────────────────────────────────────────────────

EXT_MAP = {
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
    "hs": "haskell",
    "scala": "scala",
    "lua": "lua",
    "r": "r",
    # Config / data
    "json": "json", "yaml": "yaml", "yml": "yaml",
    "toml": "toml", "xml": "xml", "html": "html",
    "css": "css", "scss": "scss", "sass": "sass",
    "sql": "sql", "md": "markdown", "txt": "text",
    "sh": "shell", "bash": "shell", "zsh": "shell",
    "env": "env",
}

# ── Regex patterns per language ───────────────────────────────────────────────

PATTERNS = {
    "python": {
        "function": re.compile(r"^(?:async\s+)?def\s+(\w+)\s*\(", re.MULTILINE),
        "class":    re.compile(r"^class\s+(\w+)[\s(:]", re.MULTILINE),
        "import":   re.compile(r"^(?:import|from)\s+\S+", re.MULTILINE),
    },
    "javascript": {
        "function": re.compile(r"(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\()", re.MULTILINE),
        "class":    re.compile(r"^class\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^(?:import|const\s+\w+\s*=\s*require)", re.MULTILINE),
    },
    "typescript": {
        "function": re.compile(r"(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\()", re.MULTILINE),
        "class":    re.compile(r"^(?:export\s+)?class\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^import\s+", re.MULTILINE),
    },
    "go": {
        "function": re.compile(r"^func\s+(?:\([\w\s*]+\)\s+)?(\w+)\s*\(", re.MULTILINE),
        "class":    re.compile(r"^type\s+(\w+)\s+struct", re.MULTILINE),
        "import":   re.compile(r"^import\s+", re.MULTILINE),
    },
    "rust": {
        "function": re.compile(r"^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)", re.MULTILINE),
        "class":    re.compile(r"^(?:pub\s+)?(?:struct|enum|trait|impl)\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^use\s+", re.MULTILINE),
    },
    "java": {
        "function": re.compile(r"(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(", re.MULTILINE),
        "class":    re.compile(r"(?:public\s+)?(?:class|interface|enum)\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^import\s+", re.MULTILINE),
    },
    "ruby": {
        "function": re.compile(r"^\s*def\s+(?:self\.)?(\w+)", re.MULTILINE),
        "class":    re.compile(r"^class\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^require", re.MULTILINE),
    },
    "php": {
        "function": re.compile(r"^(?:public|private|protected|static|\s)*function\s+(\w+)", re.MULTILINE),
        "class":    re.compile(r"^(?:abstract\s+)?class\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^(?:require|include|use)\s+", re.MULTILINE),
    },
    "csharp": {
        "function": re.compile(r"(?:public|private|protected|static|\s)+[\w<>\[\]?]+\s+(\w+)\s*\(", re.MULTILINE),
        "class":    re.compile(r"(?:public\s+)?(?:class|interface|struct|enum)\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^using\s+", re.MULTILINE),
    },
    "swift": {
        "function": re.compile(r"^(?:func|override func|class func|static func)\s+(\w+)", re.MULTILINE),
        "class":    re.compile(r"^(?:class|struct|enum|protocol)\s+(\w+)", re.MULTILINE),
        "import":   re.compile(r"^import\s+", re.MULTILINE),
    },
    "shell": {
        "function": re.compile(r"^(\w+)\s*\(\s*\)\s*\{", re.MULTILINE),
        "class":    None,
        "import":   re.compile(r"^(?:source|\.\s+)\S+", re.MULTILINE),
    },
    "elixir": {
        "function": re.compile(r"^(?:def|defp)\s+(\w+)", re.MULTILINE),
        "class":    re.compile(r"^defmodule\s+(\S+)", re.MULTILINE),
        "import":   re.compile(r"^(?:import|require|use|alias)\s+", re.MULTILINE),
    },
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_source(file_path: str) -> Optional[str]:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        # Skip binary-looking files
        if "\x00" in content[:512]:
            return None
        return content
    except Exception:
        return None


def _generic_chunks(source: str, lang: str) -> list[dict]:
    """Split file into 60-line generic chunks (fallback)."""
    lines = source.split("\n")
    chunks = []
    size = 60
    for i in range(0, len(lines), size):
        slice_text = "\n".join(lines[i: i + size])
        chunks.append({
            "content":   slice_text[:4000],
            "type":      "generic",
            "name":      None,
            "startLine": i + 1,
            "endLine":   min(i + size, len(lines)),
            "language":  lang,
        })
    return chunks or [{"content": source[:4000], "type": "generic", "name": None,
                       "startLine": 1, "endLine": len(lines), "language": lang}]


def _parse_with_regex(source: str, lang: str) -> dict:
    patterns = PATTERNS.get(lang) or PATTERNS.get("javascript")
    lines = source.split("\n")
    chunks = []

    # Collect import lines
    if patterns.get("import"):
        for i, line in enumerate(lines):
            if patterns["import"].match(line):
                chunks.append({
                    "content": line,
                    "type": "import",
                    "name": None,
                    "startLine": i + 1,
                    "endLine": i + 1,
                    "language": lang,
                })

    # Extract function/class blocks
    i = 0
    while i < len(lines):
        line = lines[i]
        fn_match  = patterns["function"].search(line) if patterns.get("function") else None
        cls_match = patterns["class"].search(line) if patterns.get("class") else None

        if fn_match or cls_match:
            chunk_type = "function" if fn_match else "class"
            match      = fn_match or cls_match
            # Get first non-None group
            name = next((g for g in match.groups() if g), None) if match else None
            start = i

            # Collect block by brace counting or indentation
            brace_langs = {"go", "rust", "java", "kotlin", "php", "c", "cpp",
                           "csharp", "swift", "dart", "scala", "javascript",
                           "typescript", "lua"}
            end = i + 1
            if lang in brace_langs:
                braces = line.count("{") - line.count("}")
                while end < len(lines) and (braces > 0 or end == i + 1):
                    braces += lines[end].count("{") - lines[end].count("}")
                    end += 1
                    if end - i > 300:
                        break
            else:
                base_indent = len(line) - len(line.lstrip())
                while end < len(lines):
                    l = lines[end]
                    if l.strip() == "":
                        end += 1
                        continue
                    indent = len(l) - len(l.lstrip())
                    if indent <= base_indent and end > i + 1:
                        break
                    end += 1
                    if end - i > 200:
                        break

            block = "\n".join(lines[start:end])
            if len(block) > 5:
                chunks.append({
                    "content":   block[:10000],
                    "type":      chunk_type,
                    "name":      name,
                    "startLine": start + 1,
                    "endLine":   end,
                    "language":  lang,
                })
            i = end
        else:
            i += 1

    non_import = [c for c in chunks if c["type"] != "import"]
    if not non_import:
        chunks = chunks + _generic_chunks(source, lang)

    return {"chunks": chunks, "language": lang}


def _parse_as_text(source: str, lang: str) -> dict:
    return {"chunks": _generic_chunks(source, lang), "language": lang}


# ── Public API ────────────────────────────────────────────────────────────────

def get_language(file_path: str) -> Optional[str]:
    base = os.path.basename(file_path).lower()
    # Special filenames
    specials = {
        "dockerfile": "dockerfile", "makefile": "makefile",
        "gemfile": "ruby", "go.mod": "go", "go.sum": "go",
        "cargo.toml": "rust", "requirements.txt": "python",
    }
    if base in specials:
        return specials[base]
    if base.startswith(".env"):
        return "env"

    ext = base.rsplit(".", 1)[-1] if "." in base else ""
    return EXT_MAP.get(ext)


def parse_file(file_path: str) -> Optional[dict]:
    lang = get_language(file_path)
    if not lang:
        return None

    source = _read_source(file_path)
    if not source:
        return None

    # Skip huge files
    if len(source) > 800_000:
        return {
            "chunks": [{"content": source[:4000], "type": "generic", "name": None,
                        "startLine": 1, "endLine": 80, "language": lang}],
            "language": lang,
        }

    # Text-only formats — just chunk them
    text_langs = {"json", "yaml", "toml", "xml", "html", "css", "scss",
                  "sql", "markdown", "text", "env", "dockerfile", "makefile"}
    if lang in text_langs:
        return _parse_as_text(source, lang)

    return _parse_with_regex(source, lang)


def get_supported_extensions() -> list[str]:
    return list(EXT_MAP.keys())