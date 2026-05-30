"""
ingest_pipeline.py
Scans a cloned repo, parses all files, embeds chunks, stores in FAISS.
Identical behaviour to the Node version.
"""

import os
import glob as glob_module
from pathlib import Path
from src.parser.parser import parse_file, get_supported_extensions
from src.embeddings.embedder import embed_texts
from src.embeddings import faiss_store
from src.pipeline.query_pipeline import generate_summary
from src.graph.builder import build as build_graph

MAX_FILES = 2000

IGNORE_DIRS = {
    "node_modules", "dist", "build", ".git", "vendor",
    "venv", ".venv", "env", "target", "out", "__pycache__",
    ".cache", "coverage", ".nyc_output",
}


def _discover_files(local_path: str) -> list[str]:
    """Walk directory tree and return all parseable files."""
    extensions = set(get_supported_extensions())
    files = []

    for root, dirs, filenames in os.walk(local_path):
        # Skip ignored directories in-place
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

        for filename in filenames:
            # Skip minified files
            if filename.endswith((".min.js", ".min.css", ".map")):
                continue
            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            # Also accept special filenames with no extension
            special = {"dockerfile", "makefile", "gemfile", "go.mod", "go.sum",
                       "requirements.txt", "setup.py", "cargo.toml"}
            if ext in extensions or filename.lower() in special:
                files.append(os.path.join(root, filename))

    return files[:MAX_FILES]


def run_ingest(local_path: str, faiss_index_id: str) -> dict:
    print(f"[ingest] Starting: {local_path}")

    # Clear old index to prevent duplicate vectors on re-index
    faiss_store.clear_index(faiss_index_id)
    print(f"[ingest] Cleared old FAISS index: {faiss_index_id}")

    # 1. Discover files
    files = _discover_files(local_path)
    print(f"[ingest] Found {len(files)} files")

    if not files:
        return {
            "totalFiles": 0, "totalChunks": 0,
            "graph": {"nodes": [], "edges": []},
            "summary": "No indexable files found.",
            "keyFiles": [], "techStack": {}, "languages": {},
        }

    # 2. Parse files
    all_chunks         = []
    file_parse_results = {}
    lang_counts        = {}

    for fp in files:
        try:
            rel    = os.path.relpath(fp, local_path)
            result = parse_file(fp)
            if not result or not result.get("chunks"):
                continue
            file_parse_results[rel] = result
            lang = result.get("language", "unknown")
            lang_counts[lang] = lang_counts.get(lang, 0) + 1
            for idx, chunk in enumerate(result["chunks"]):
                all_chunks.append({
                    "filePath":   rel,
                    "chunkIndex": idx,
                    **chunk,
                })
        except Exception as e:
            print(f"[ingest] Parse error {fp}: {e}")

    print(f"[ingest] Parsed {len(all_chunks)} chunks from {len(file_parse_results)} files")
    print(f"[ingest] Languages: {lang_counts}")

    if not all_chunks:
        return {
            "totalFiles": len(files), "totalChunks": 0,
            "graph": {"nodes": [], "edges": []},
            "summary": "Files found but no parseable chunks extracted.",
            "keyFiles": [], "techStack": {}, "languages": lang_counts,
        }

    # 3. Embed & store
    texts = [
        f"// File: {c['filePath']} [{c.get('language', 'code')}]"
        + (f"\n// {c['type']}: {c['name']}" if c.get("name") else "")
        + f"\n{c['content']}"
        for c in all_chunks
    ]

    print(f"[ingest] Embedding {len(texts)} chunks...")
    vectors  = embed_texts(texts)
    start_id = faiss_store.add_vectors(faiss_index_id, vectors)

    meta = [
        {
            "faissId":    start_id + i,
            "filePath":   c["filePath"],
            "chunkIndex": c["chunkIndex"],
            "type":       c.get("type"),
            "name":       c.get("name"),
            "startLine":  c.get("startLine"),
            "endLine":    c.get("endLine"),
            "language":   c.get("language"),
            "content":    c["content"][:500],
        }
        for i, c in enumerate(all_chunks)
    ]
    faiss_store.save_meta(faiss_index_id, meta)
    print(f"[ingest] FAISS stored {len(vectors)} vectors")

    # 4. Build dependency graph (nodes + edges via builder.py)
    graph = build_graph(file_parse_results)
    print(f"[ingest] Graph: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges")

    # 5. Detect tech stack from config files
    tech_stack = _detect_tech_stack(local_path, list(file_parse_results.keys()))

    # 6. AI summary
    sample_files = list(file_parse_results.keys())[:8]
    sample_text  = "\n\n".join(
        f"{f} [{file_parse_results[f].get('language')}]:\n"
        + "\n".join(c["content"][:300] for c in file_parse_results[f]["chunks"][:2])
        for f in sample_files
    )
    summary = generate_summary(sample_text, tech_stack, lang_counts)

    # 7. Key files (most-parsed)
    key_files = sorted(
        file_parse_results.keys(),
        key=lambda f: len(file_parse_results[f].get("chunks", [])),
        reverse=True,
    )[:12]

    print(f"[ingest] Done. {len(files)} files, {len(all_chunks)} chunks")

    return {
        "totalFiles":  len(files),
        "totalChunks": len(all_chunks),
        "graph":       graph,
        "summary":     summary,
        "keyFiles":    key_files,
        "techStack":   tech_stack,
        "languages":   lang_counts,
    }


def _detect_file_type(file_path: str) -> str:
    p = file_path.lower()
    if "route" in p or "controller" in p:        return "route"
    if "service" in p:                            return "service"
    if "model" in p or "schema" in p:             return "model"
    if "middleware" in p:                         return "middleware"
    if "util" in p or "helper" in p:              return "utility"
    if "test" in p or "spec" in p:                return "test"
    if "index" in p or "main" in p or "app." in p: return "entry"
    if "config" in p:                             return "config"
    if ".jsx" in p or ".tsx" in p or "component" in p: return "component"
    return "module"


def _detect_tech_stack(project_root: str, file_list: list[str]) -> dict:
    """Simple tech stack detection from config files."""
    frameworks = []
    detected   = set()

    def add(name, category, color):
        if name not in detected:
            detected.add(name)
            frameworks.append({"name": name, "category": category, "color": color})

    # package.json
    pkg_path = os.path.join(project_root, "package.json")
    if os.path.exists(pkg_path):
        try:
            import json
            with open(pkg_path) as f:
                pkg = json.load(f)
            deps = list(pkg.get("dependencies", {}).keys()) + \
                   list(pkg.get("devDependencies", {}).keys())
            JS_MAP = {
                "react":         ("React",            "frontend", "#61DAFB"),
                "next":          ("Next.js",           "fullstack", "#000000"),
                "vue":           ("Vue.js",            "frontend", "#42B883"),
                "express":       ("Express",           "backend",  "#000000"),
                "fastify":       ("Fastify",           "backend",  "#000000"),
                "nestjs":        ("NestJS",            "backend",  "#E0234E"),
                "@nestjs/core":  ("NestJS",            "backend",  "#E0234E"),
                "mongoose":      ("MongoDB/Mongoose",  "database", "#47A248"),
                "prisma":        ("Prisma",            "database", "#0C344B"),
                "tailwindcss":   ("Tailwind CSS",      "styling",  "#38BDF8"),
                "vite":          ("Vite",              "build",    "#646CFF"),
            }
            for dep in deps:
                if dep.lower() in JS_MAP:
                    add(*JS_MAP[dep.lower()])
        except Exception:
            pass

    # requirements.txt
    req_path = os.path.join(project_root, "requirements.txt")
    if os.path.exists(req_path):
        try:
            with open(req_path) as f:
                lines = [l.split(">=")[0].split("==")[0].strip().lower() for l in f]
            PY_MAP = {
                "django":       ("Django",      "backend",  "#092E20"),
                "flask":        ("Flask",       "backend",  "#000000"),
                "fastapi":      ("FastAPI",     "backend",  "#009688"),
                "sqlalchemy":   ("SQLAlchemy",  "database", "#D71F00"),
                "celery":       ("Celery",      "queue",    "#37B24D"),
                "pandas":       ("Pandas",      "data",     "#150458"),
                "torch":        ("PyTorch",     "ml",       "#EE4C2C"),
                "tensorflow":   ("TensorFlow",  "ml",       "#FF6F00"),
            }
            for line in lines:
                if line in PY_MAP:
                    add(*PY_MAP[line])
        except Exception:
            pass

    # File fingerprints
    all_paths = " ".join(file_list).lower()
    if "docker-compose" in all_paths or "dockerfile" in all_paths:
        add("Docker",        "infra",   "#2496ED")
    if "go.mod" in all_paths:
        add("Go Module",     "backend", "#00ACD7")
    if "cargo.toml" in all_paths:
        add("Rust/Cargo",    "backend", "#DE3522")
    if "gemfile" in all_paths:
        add("Ruby/Bundler",  "backend", "#CC342D")

    return {
        "frameworks":      frameworks,
        "primaryLanguage": _infer_lang(file_list),
    }


def _infer_lang(file_list: list[str]) -> str:
    counts = {}
    lang_map = {
        "js": "JavaScript", "jsx": "JavaScript", "ts": "TypeScript", "tsx": "TypeScript",
        "py": "Python", "go": "Go", "rs": "Rust", "java": "Java",
        "rb": "Ruby", "php": "PHP", "cpp": "C++", "cs": "C#",
    }
    for f in file_list:
        ext = f.rsplit(".", 1)[-1].lower() if "." in f else ""
        lang = lang_map.get(ext)
        if lang:
            counts[lang] = counts.get(lang, 0) + 1
    return max(counts, key=counts.get) if counts else "Unknown"