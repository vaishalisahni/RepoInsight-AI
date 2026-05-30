"""
tech_detector.py
Detect frameworks, stack, and language composition from config files.
Full Python port of techDetector.js.
"""

import os
import json
import re
from pathlib import Path


# ── Framework fingerprint maps ────────────────────────────────────────────────

JS_FRAMEWORKS = {
    "react":            {"name": "React",           "category": "frontend",   "color": "#61DAFB"},
    "vue":              {"name": "Vue.js",           "category": "frontend",   "color": "#42B883"},
    "@vue/core":        {"name": "Vue.js",           "category": "frontend",   "color": "#42B883"},
    "next":             {"name": "Next.js",          "category": "fullstack",  "color": "#000000"},
    "nuxt":             {"name": "Nuxt.js",          "category": "fullstack",  "color": "#00C58E"},
    "svelte":           {"name": "Svelte",           "category": "frontend",   "color": "#FF3E00"},
    "@sveltejs/kit":    {"name": "SvelteKit",        "category": "fullstack",  "color": "#FF3E00"},
    "solid-js":         {"name": "SolidJS",          "category": "frontend",   "color": "#4380C1"},
    "angular":          {"name": "Angular",          "category": "frontend",   "color": "#DD0031"},
    "@angular/core":    {"name": "Angular",          "category": "frontend",   "color": "#DD0031"},
    "astro":            {"name": "Astro",            "category": "frontend",   "color": "#FF5D01"},
    "gatsby":           {"name": "Gatsby",           "category": "frontend",   "color": "#663399"},
    "remix":            {"name": "Remix",            "category": "fullstack",  "color": "#121212"},
    "express":          {"name": "Express",          "category": "backend",    "color": "#000000"},
    "fastify":          {"name": "Fastify",          "category": "backend",    "color": "#000000"},
    "koa":              {"name": "Koa",              "category": "backend",    "color": "#33333D"},
    "nestjs":           {"name": "NestJS",           "category": "backend",    "color": "#E0234E"},
    "@nestjs/core":     {"name": "NestJS",           "category": "backend",    "color": "#E0234E"},
    "hono":             {"name": "Hono",             "category": "backend",    "color": "#E36002"},
    "mongoose":         {"name": "MongoDB/Mongoose", "category": "database",   "color": "#47A248"},
    "mongodb":          {"name": "MongoDB",          "category": "database",   "color": "#47A248"},
    "pg":               {"name": "PostgreSQL",       "category": "database",   "color": "#336791"},
    "mysql2":           {"name": "MySQL",            "category": "database",   "color": "#4479A1"},
    "sequelize":        {"name": "Sequelize",        "category": "database",   "color": "#52B0E7"},
    "typeorm":          {"name": "TypeORM",          "category": "database",   "color": "#E83524"},
    "prisma":           {"name": "Prisma",           "category": "database",   "color": "#0C344B"},
    "@prisma/client":   {"name": "Prisma",           "category": "database",   "color": "#0C344B"},
    "drizzle-orm":      {"name": "Drizzle ORM",      "category": "database",   "color": "#C5F74F"},
    "redis":            {"name": "Redis",            "category": "database",   "color": "#DC382D"},
    "vite":             {"name": "Vite",             "category": "build",      "color": "#646CFF"},
    "webpack":          {"name": "Webpack",          "category": "build",      "color": "#8DD6F9"},
    "jest":             {"name": "Jest",             "category": "testing",    "color": "#C21325"},
    "vitest":           {"name": "Vitest",           "category": "testing",    "color": "#6E9F18"},
    "graphql":          {"name": "GraphQL",          "category": "api",        "color": "#E10098"},
    "apollo-server":    {"name": "Apollo",           "category": "api",        "color": "#311C87"},
    "socket.io":        {"name": "Socket.IO",        "category": "realtime",   "color": "#010101"},
    "tailwindcss":      {"name": "Tailwind CSS",     "category": "styling",    "color": "#38BDF8"},
    "zustand":          {"name": "Zustand",          "category": "state",      "color": "#4B3832"},
    "redux":            {"name": "Redux",            "category": "state",      "color": "#764ABC"},
    "@reduxjs/toolkit": {"name": "Redux Toolkit",    "category": "state",      "color": "#764ABC"},
    "zod":              {"name": "Zod",              "category": "validation", "color": "#3068B7"},
    "trpc":             {"name": "tRPC",             "category": "api",        "color": "#398CCB"},
    "@trpc/server":     {"name": "tRPC",             "category": "api",        "color": "#398CCB"},
}

PYTHON_FRAMEWORKS = {
    "django":      {"name": "Django",      "category": "backend",     "color": "#092E20"},
    "flask":       {"name": "Flask",       "category": "backend",     "color": "#000000"},
    "fastapi":     {"name": "FastAPI",     "category": "backend",     "color": "#009688"},
    "tornado":     {"name": "Tornado",     "category": "backend",     "color": "#FF6600"},
    "aiohttp":     {"name": "aiohttp",     "category": "backend",     "color": "#2C5BB4"},
    "sqlalchemy":  {"name": "SQLAlchemy",  "category": "database",    "color": "#D71F00"},
    "celery":      {"name": "Celery",      "category": "queue",       "color": "#37B24D"},
    "pydantic":    {"name": "Pydantic",    "category": "validation",  "color": "#E92063"},
    "pandas":      {"name": "Pandas",      "category": "data",        "color": "#150458"},
    "numpy":       {"name": "NumPy",       "category": "data",        "color": "#013243"},
    "tensorflow":  {"name": "TensorFlow",  "category": "ml",          "color": "#FF6F00"},
    "torch":       {"name": "PyTorch",     "category": "ml",          "color": "#EE4C2C"},
    "pytest":      {"name": "pytest",      "category": "testing",     "color": "#009FE3"},
    "scrapy":      {"name": "Scrapy",      "category": "scraping",    "color": "#60A839"},
}

GO_FRAMEWORKS = {
    "gin-gonic/gin":  {"name": "Gin",         "category": "backend",  "color": "#00ACD7"},
    "gofiber/fiber":  {"name": "Fiber",        "category": "backend",  "color": "#00ACD7"},
    "labstack/echo":  {"name": "Echo",         "category": "backend",  "color": "#00ACD7"},
    "go-chi/chi":     {"name": "Chi",          "category": "backend",  "color": "#00ACD7"},
    "gorilla/mux":    {"name": "Gorilla Mux",  "category": "backend",  "color": "#00ACD7"},
    "gorm.io/gorm":   {"name": "GORM",         "category": "database", "color": "#00ACD7"},
}

RUST_FRAMEWORKS = {
    "actix-web": {"name": "Actix Web", "category": "backend",  "color": "#DE3522"},
    "rocket":    {"name": "Rocket",    "category": "backend",  "color": "#D33847"},
    "axum":      {"name": "Axum",      "category": "backend",  "color": "#000000"},
    "tokio":     {"name": "Tokio",     "category": "async",    "color": "#A72145"},
    "diesel":    {"name": "Diesel",    "category": "database", "color": "#7F3FBF"},
    "serde":     {"name": "Serde",     "category": "serde",    "color": "#DE3522"},
}

PHP_FRAMEWORKS = {
    "laravel/framework": {"name": "Laravel", "category": "fullstack", "color": "#FF2D20"},
    "symfony/symfony":   {"name": "Symfony", "category": "backend",   "color": "#000000"},
    "slim/slim":         {"name": "Slim",    "category": "backend",   "color": "#74A045"},
}

JAVA_FRAMEWORKS = {
    "spring-boot": {"name": "Spring Boot", "category": "backend",  "color": "#6DB33F"},
    "spring-web":  {"name": "Spring MVC",  "category": "backend",  "color": "#6DB33F"},
    "micronaut":   {"name": "Micronaut",   "category": "backend",  "color": "#1DAEE4"},
    "quarkus":     {"name": "Quarkus",     "category": "backend",  "color": "#4695EB"},
    "hibernate":   {"name": "Hibernate",   "category": "database", "color": "#59666C"},
}

FILE_FINGERPRINTS = [
    {"file": "docker-compose.yml",    "name": "Docker",          "category": "infra",    "color": "#2496ED"},
    {"file": "docker-compose.yaml",   "name": "Docker",          "category": "infra",    "color": "#2496ED"},
    {"file": "dockerfile",            "name": "Docker",          "category": "infra",    "color": "#2496ED"},
    {"file": "kubernetes.yml",        "name": "Kubernetes",      "category": "infra",    "color": "#326CE5"},
    {"file": "k8s",                   "name": "Kubernetes",      "category": "infra",    "color": "#326CE5"},
    {"file": "terraform",             "name": "Terraform",       "category": "infra",    "color": "#7B42BC"},
    {"file": ".github/workflows",     "name": "GitHub Actions",  "category": "ci",       "color": "#2088FF"},
    {"file": "gemfile",               "name": "Ruby/Bundler",    "category": "backend",  "color": "#CC342D"},
    {"file": "rails",                 "name": "Ruby on Rails",   "category": "fullstack","color": "#CC0000"},
    {"file": "go.mod",                "name": "Go Module",       "category": "backend",  "color": "#00ACD7"},
    {"file": "cargo.toml",            "name": "Rust/Cargo",      "category": "backend",  "color": "#DE3522"},
    {"file": "pom.xml",               "name": "Maven (Java)",    "category": "build",    "color": "#C71A36"},
    {"file": "build.gradle",          "name": "Gradle",          "category": "build",    "color": "#02303A"},
    {"file": "mix.exs",               "name": "Elixir/Mix",      "category": "backend",  "color": "#6E4A7E"},
    {"file": "pubspec.yaml",          "name": "Flutter/Dart",    "category": "mobile",   "color": "#0175C2"},
    {"file": "cmakelists.txt",        "name": "CMake (C/C++)",   "category": "native",   "color": "#064F8C"},
    {"file": "makefile",              "name": "Make",            "category": "build",    "color": "#427819"},
    {"file": "hooks.py",              "name": "Frappe App",      "category": "fullstack","color": "#0089FF"},
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_json(path: str) -> dict | None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _read_lines(path: str) -> list[str]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return [l.strip() for l in f if l.strip()]
    except Exception:
        return []


def _read_text(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""


def _match_frameworks(deps: list[str], framework_map: dict) -> list[dict]:
    results = []
    seen = set()
    for dep in deps:
        lower = dep.lower()
        for key, meta in framework_map.items():
            if lower == key.lower() or lower.startswith(key.lower()):
                name = meta["name"]
                if name not in seen:
                    seen.add(name)
                    results.append(meta)
    return results


# ── Language inference ────────────────────────────────────────────────────────

def _infer_lang_from_files(file_list: list[str]) -> dict:
    lang_map = {
        "js": "JavaScript", "jsx": "JavaScript", "mjs": "JavaScript", "cjs": "JavaScript",
        "ts": "TypeScript", "tsx": "TypeScript",
        "py": "Python", "pyw": "Python",
        "go": "Go", "rs": "Rust", "java": "Java", "kt": "Kotlin",
        "rb": "Ruby", "php": "PHP",
        "c": "C", "h": "C", "cpp": "C++", "cc": "C++", "cxx": "C++", "hpp": "C++",
        "cs": "C#", "swift": "Swift", "dart": "Dart",
        "ex": "Elixir", "exs": "Elixir",
        "hs": "Haskell", "scala": "Scala", "r": "R", "lua": "Lua",
    }
    counts: dict[str, int] = {}
    for f in file_list:
        ext = f.rsplit(".", 1)[-1].lower() if "." in f else ""
        lang = lang_map.get(ext)
        if lang:
            counts[lang] = counts.get(lang, 0) + 1

    sorted_langs = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    total = sum(c for _, c in sorted_langs) or 1
    return {
        "primary": sorted_langs[0][0] if sorted_langs else "Unknown",
        "breakdown": {lang: round(count / total * 100) for lang, count in sorted_langs},
    }


def _detect_monorepo(project_root: str, file_list: list[str]) -> bool:
    pkg = _read_json(os.path.join(project_root, "package.json"))
    if pkg and pkg.get("workspaces"):
        return True
    special = ["lerna.json", "turbo.json", "nx.json"]
    if any(os.path.exists(os.path.join(project_root, f)) for f in special):
        return True
    if any("pnpm-workspace" in f for f in file_list):
        return True
    return False


# ── Public API ────────────────────────────────────────────────────────────────

def detect(project_root: str, file_list: list[str]) -> dict:
    """
    Detect tech stack from config files and file list.

    Returns:
        {
          "frameworks": [...],
          "categories": {...},
          "primaryLanguage": str,
          "languageBreakdown": {...},
          "isMonorepo": bool,
        }
    """
    frameworks = []
    detected: set[str] = set()

    def add(meta: dict) -> None:
        if meta["name"] not in detected:
            detected.add(meta["name"])
            frameworks.append(meta)

    # ── package.json (Node/JS) ────────────────────────────────────────────
    pkg = _read_json(os.path.join(project_root, "package.json"))
    if pkg:
        deps = list(pkg.get("dependencies", {}).keys()) + \
               list(pkg.get("devDependencies", {}).keys())
        for m in _match_frameworks(deps, JS_FRAMEWORKS):
            add(m)

    # ── requirements.txt (Python) ─────────────────────────────────────────
    req_path = os.path.join(project_root, "requirements.txt")
    if os.path.exists(req_path):
        lines = [re.split(r"[>=<\[]", l)[0].strip().lower() for l in _read_lines(req_path)]
        for m in _match_frameworks(lines, PYTHON_FRAMEWORKS):
            add(m)

    # ── pyproject.toml (Python) ───────────────────────────────────────────
    pyproject = os.path.join(project_root, "pyproject.toml")
    if os.path.exists(pyproject):
        content = _read_text(pyproject)
        names = re.findall(r'^\s*([\w-]+)\s*=', content, re.MULTILINE)
        for m in _match_frameworks([n.lower() for n in names], PYTHON_FRAMEWORKS):
            add(m)

    # ── go.mod (Go) ───────────────────────────────────────────────────────
    go_mod = os.path.join(project_root, "go.mod")
    if os.path.exists(go_mod):
        lines = _read_lines(go_mod)
        for m in _match_frameworks(lines, GO_FRAMEWORKS):
            add(m)

    # ── Cargo.toml (Rust) ─────────────────────────────────────────────────
    cargo = os.path.join(project_root, "Cargo.toml")
    if os.path.exists(cargo):
        content = _read_text(cargo)
        names = re.findall(r'^\s*([\w-]+)\s*=', content, re.MULTILINE)
        for m in _match_frameworks([n.lower() for n in names], RUST_FRAMEWORKS):
            add(m)

    # ── composer.json (PHP) ───────────────────────────────────────────────
    composer = _read_json(os.path.join(project_root, "composer.json"))
    if composer:
        deps = list(composer.get("require", {}).keys())
        for m in _match_frameworks(deps, PHP_FRAMEWORKS):
            add(m)

    # ── pom.xml (Java/Maven) ──────────────────────────────────────────────
    pom_path = os.path.join(project_root, "pom.xml")
    if os.path.exists(pom_path):
        content = _read_text(pom_path)
        artifact_ids = re.findall(r'<artifactId>([^<]+)</artifactId>', content)
        for m in _match_frameworks([a.lower() for a in artifact_ids], JAVA_FRAMEWORKS):
            add(m)

    # ── Gemfile (Ruby) ────────────────────────────────────────────────────
    gemfile = os.path.join(project_root, "Gemfile")
    if os.path.exists(gemfile):
        content = _read_text(gemfile)
        if re.search(r'rails', content, re.IGNORECASE):
            add({"name": "Ruby on Rails", "category": "fullstack", "color": "#CC0000"})
        if re.search(r'sinatra', content, re.IGNORECASE):
            add({"name": "Sinatra", "category": "backend", "color": "#CC342D"})
        if re.search(r'rspec', content, re.IGNORECASE):
            add({"name": "RSpec", "category": "testing", "color": "#CC342D"})

    # ── File fingerprints ─────────────────────────────────────────────────
    all_paths_lower = " ".join(
        [project_root.lower()] + [os.path.join(project_root, f).lower() for f in file_list]
    )
    for fp in FILE_FINGERPRINTS:
        if fp["file"].lower() in all_paths_lower:
            add({"name": fp["name"], "category": fp["category"], "color": fp["color"]})

    # ── Language breakdown ────────────────────────────────────────────────
    lang_info = _infer_lang_from_files(file_list)

    # ── Categories ────────────────────────────────────────────────────────
    categories: dict[str, list[str]] = {}
    for fw in frameworks:
        cat = fw.get("category", "other")
        categories.setdefault(cat, []).append(fw["name"])

    return {
        "frameworks":        frameworks,
        "categories":        categories,
        "primaryLanguage":   lang_info["primary"],
        "languageBreakdown": lang_info["breakdown"],
        "isMonorepo":        _detect_monorepo(project_root, file_list),
    }