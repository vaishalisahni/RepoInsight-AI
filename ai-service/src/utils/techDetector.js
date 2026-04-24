/**
 * techDetector.js — Detect frameworks, stack, and language composition
 * from the project's config files and file list.
 */

const fs   = require('fs');
const path = require('path');

/* ── Framework fingerprints ─────────────────────────────────────────────── */
const JS_FRAMEWORKS = {
  // Frontend
  'react':           { name: 'React',        category: 'frontend',  color: '#61DAFB' },
  'vue':             { name: 'Vue.js',        category: 'frontend',  color: '#42B883' },
  '@vue/core':       { name: 'Vue.js',        category: 'frontend',  color: '#42B883' },
  'next':            { name: 'Next.js',       category: 'fullstack', color: '#000000' },
  'nuxt':            { name: 'Nuxt.js',       category: 'fullstack', color: '#00C58E' },
  'svelte':          { name: 'Svelte',        category: 'frontend',  color: '#FF3E00' },
  '@sveltejs/kit':   { name: 'SvelteKit',     category: 'fullstack', color: '#FF3E00' },
  'solid-js':        { name: 'SolidJS',       category: 'frontend',  color: '#4380C1' },
  'angular':         { name: 'Angular',       category: 'frontend',  color: '#DD0031' },
  '@angular/core':   { name: 'Angular',       category: 'frontend',  color: '#DD0031' },
  'preact':          { name: 'Preact',        category: 'frontend',  color: '#673AB8' },
  'astro':           { name: 'Astro',         category: 'frontend',  color: '#FF5D01' },
  'gatsby':          { name: 'Gatsby',        category: 'frontend',  color: '#663399' },
  'remix':           { name: 'Remix',         category: 'fullstack', color: '#121212' },
  // Backend
  'express':         { name: 'Express',       category: 'backend',   color: '#000000' },
  'fastify':         { name: 'Fastify',       category: 'backend',   color: '#000000' },
  'koa':             { name: 'Koa',           category: 'backend',   color: '#33333D' },
  'hapi':            { name: 'Hapi',          category: 'backend',   color: '#F04E23' },
  'nestjs':          { name: 'NestJS',        category: 'backend',   color: '#E0234E' },
  '@nestjs/core':    { name: 'NestJS',        category: 'backend',   color: '#E0234E' },
  'hono':            { name: 'Hono',          category: 'backend',   color: '#E36002' },
  'elysia':          { name: 'Elysia',        category: 'backend',   color: '#7A4DCA' },
  // Databases / ORMs
  'mongoose':        { name: 'MongoDB/Mongoose', category: 'database', color: '#47A248' },
  'mongodb':         { name: 'MongoDB',       category: 'database',  color: '#47A248' },
  'pg':              { name: 'PostgreSQL',    category: 'database',  color: '#336791' },
  'mysql2':          { name: 'MySQL',         category: 'database',  color: '#4479A1' },
  'mysql':           { name: 'MySQL',         category: 'database',  color: '#4479A1' },
  'sequelize':       { name: 'Sequelize',     category: 'database',  color: '#52B0E7' },
  'typeorm':         { name: 'TypeORM',       category: 'database',  color: '#E83524' },
  'prisma':          { name: 'Prisma',        category: 'database',  color: '#0C344B' },
  '@prisma/client':  { name: 'Prisma',        category: 'database',  color: '#0C344B' },
  'drizzle-orm':     { name: 'Drizzle ORM',   category: 'database',  color: '#C5F74F' },
  'redis':           { name: 'Redis',         category: 'database',  color: '#DC382D' },
  // Build / testing
  'vite':            { name: 'Vite',          category: 'build',     color: '#646CFF' },
  'webpack':         { name: 'Webpack',       category: 'build',     color: '#8DD6F9' },
  'turbopack':       { name: 'Turbopack',     category: 'build',     color: '#EF4444' },
  'esbuild':         { name: 'esbuild',       category: 'build',     color: '#FFCF00' },
  'rollup':          { name: 'Rollup',        category: 'build',     color: '#EC4A3F' },
  'jest':            { name: 'Jest',          category: 'testing',   color: '#C21325' },
  'vitest':          { name: 'Vitest',        category: 'testing',   color: '#6E9F18' },
  // Other
  'graphql':         { name: 'GraphQL',       category: 'api',       color: '#E10098' },
  'apollo-server':   { name: 'Apollo',        category: 'api',       color: '#311C87' },
  'socket.io':       { name: 'Socket.IO',     category: 'realtime',  color: '#010101' },
  'ws':              { name: 'WebSocket',     category: 'realtime',  color: '#010101' },
  'tailwindcss':     { name: 'Tailwind CSS',  category: 'styling',   color: '#38BDF8' },
  'zustand':         { name: 'Zustand',       category: 'state',     color: '#4B3832' },
  'redux':           { name: 'Redux',         category: 'state',     color: '#764ABC' },
  '@reduxjs/toolkit':{ name: 'Redux Toolkit', category: 'state',     color: '#764ABC' },
  'zod':             { name: 'Zod',           category: 'validation',color: '#3068B7' },
  'trpc':            { name: 'tRPC',          category: 'api',       color: '#398CCB' },
  '@trpc/server':    { name: 'tRPC',          category: 'api',       color: '#398CCB' },
};

const PYTHON_FRAMEWORKS = {
  'django':      { name: 'Django',      category: 'backend',  color: '#092E20' },
  'flask':       { name: 'Flask',       category: 'backend',  color: '#000000' },
  'fastapi':     { name: 'FastAPI',     category: 'backend',  color: '#009688' },
  'tornado':     { name: 'Tornado',     category: 'backend',  color: '#FF6600' },
  'aiohttp':     { name: 'aiohttp',     category: 'backend',  color: '#2C5BB4' },
  'sqlalchemy':  { name: 'SQLAlchemy',  category: 'database', color: '#D71F00' },
  'celery':      { name: 'Celery',      category: 'queue',    color: '#37B24D' },
  'pydantic':    { name: 'Pydantic',    category: 'validation',color:'#E92063' },
  'pandas':      { name: 'Pandas',      category: 'data',     color: '#150458' },
  'numpy':       { name: 'NumPy',       category: 'data',     color: '#013243' },
  'tensorflow':  { name: 'TensorFlow',  category: 'ml',       color: '#FF6F00' },
  'torch':       { name: 'PyTorch',     category: 'ml',       color: '#EE4C2C' },
  'pytest':      { name: 'pytest',      category: 'testing',  color: '#009FE3' },
  'scrapy':      { name: 'Scrapy',      category: 'scraping', color: '#60A839' },
};

const GO_FRAMEWORKS = {
  'gin-gonic/gin':   { name: 'Gin',       category: 'backend', color: '#00ACD7' },
  'gofiber/fiber':   { name: 'Fiber',     category: 'backend', color: '#00ACD7' },
  'labstack/echo':   { name: 'Echo',      category: 'backend', color: '#00ACD7' },
  'go-chi/chi':      { name: 'Chi',       category: 'backend', color: '#00ACD7' },
  'gorilla/mux':     { name: 'Gorilla Mux',category:'backend', color: '#00ACD7' },
  'gorm.io/gorm':    { name: 'GORM',      category: 'database',color: '#00ACD7' },
};

const RUST_FRAMEWORKS = {
  'actix-web':  { name: 'Actix Web',  category: 'backend', color: '#DE3522' },
  'rocket':     { name: 'Rocket',     category: 'backend', color: '#D33847' },
  'axum':       { name: 'Axum',       category: 'backend', color: '#000000' },
  'tokio':      { name: 'Tokio',      category: 'async',   color: '#A72145' },
  'diesel':     { name: 'Diesel',     category: 'database',color: '#7F3FBF' },
  'serde':      { name: 'Serde',      category: 'serde',   color: '#DE3522' },
};

const PHP_FRAMEWORKS = {
  'laravel/framework': { name: 'Laravel',  category: 'fullstack', color: '#FF2D20' },
  'symfony/symfony':   { name: 'Symfony',  category: 'backend',   color: '#000000' },
  'cakephp/cakephp':   { name: 'CakePHP',  category: 'backend',   color: '#D33C44' },
  'slim/slim':         { name: 'Slim',     category: 'backend',   color: '#74A045' },
};

const JAVA_FRAMEWORKS = {
  'spring-boot':   { name: 'Spring Boot',  category: 'backend',  color: '#6DB33F' },
  'spring-web':    { name: 'Spring MVC',   category: 'backend',  color: '#6DB33F' },
  'micronaut':     { name: 'Micronaut',    category: 'backend',  color: '#1DAEE4' },
  'quarkus':       { name: 'Quarkus',      category: 'backend',  color: '#4695EB' },
  'hibernate':     { name: 'Hibernate',    category: 'database', color: '#59666C' },
};

/* ── File-based fingerprints ─────────────────────────────────────────────── */
const FILE_FINGERPRINTS = [
  { file: 'frappe-bench',   name: 'Frappe Framework', category: 'fullstack', color: '#0089FF' },
  { file: 'apps.txt',       name: 'Frappe/ERPNext',   category: 'fullstack', color: '#0089FF' },
  { file: '.frappe',        name: 'Frappe Framework', category: 'fullstack', color: '#0089FF' },
  { file: 'hooks.py',       name: 'Frappe App',       category: 'fullstack', color: '#0089FF' },
  { file: 'docker-compose.yml', name: 'Docker',       category: 'infra',     color: '#2496ED' },
  { file: 'docker-compose.yaml',name: 'Docker',       category: 'infra',     color: '#2496ED' },
  { file: 'Dockerfile',     name: 'Docker',           category: 'infra',     color: '#2496ED' },
  { file: 'kubernetes.yml', name: 'Kubernetes',       category: 'infra',     color: '#326CE5' },
  { file: 'k8s',            name: 'Kubernetes',       category: 'infra',     color: '#326CE5' },
  { file: 'terraform',      name: 'Terraform',        category: 'infra',     color: '#7B42BC' },
  { file: 'ansible',        name: 'Ansible',          category: 'infra',     color: '#EE0000' },
  { file: '.github/workflows', name: 'GitHub Actions',category: 'ci',        color: '#2088FF' },
  { file: 'Gemfile',        name: 'Ruby/Bundler',     category: 'backend',   color: '#CC342D' },
  { file: 'rails',          name: 'Ruby on Rails',    category: 'fullstack', color: '#CC0000' },
  { file: 'go.mod',         name: 'Go Module',        category: 'backend',   color: '#00ACD7' },
  { file: 'cargo.toml',     name: 'Rust/Cargo',       category: 'backend',   color: '#DE3522' },
  { file: 'pom.xml',        name: 'Maven (Java)',      category: 'build',     color: '#C71A36' },
  { file: 'build.gradle',   name: 'Gradle (Java/Kotlin)', category: 'build', color: '#02303A' },
  { file: 'mix.exs',        name: 'Elixir/Mix',       category: 'backend',   color: '#6E4A7E' },
  { file: 'pubspec.yaml',   name: 'Flutter/Dart',     category: 'mobile',    color: '#0175C2' },
  { file: 'package.swift',  name: 'Swift Package',    category: 'ios',       color: '#FA7343' },
  { file: '.xcodeproj',     name: 'Xcode (iOS/macOS)',category: 'mobile',    color: '#1575F9' },
  { file: 'CMakeLists.txt', name: 'CMake (C/C++)',     category: 'native',    color: '#064F8C' },
  { file: 'Makefile',       name: 'Make',             category: 'build',     color: '#427819' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch (_) { return null; }
}

function readLines(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean); }
  catch (_) { return []; }
}

function readTOML(filePath) {
  // Minimal TOML parser to extract dependency names
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const deps = new Set();
    const re = /^\s*([\w-]+)\s*=/gm;
    let m;
    while ((m = re.exec(content))) deps.add(m[1].toLowerCase());
    return [...deps];
  } catch (_) { return []; }
}

function matchFrameworks(deps, map) {
  const results = [];
  for (const dep of deps) {
    const lower = dep.toLowerCase();
    for (const [key, meta] of Object.entries(map)) {
      if (lower === key.toLowerCase() || lower.includes(key.toLowerCase())) {
        if (!results.find(r => r.name === meta.name)) results.push(meta);
      }
    }
  }
  return results;
}

/* ─── Public API ─────────────────────────────────────────────────────────── */
function detect(projectRoot, fileList) {
  const frameworks = [];
  const detected   = new Set();

  function add(meta) {
    if (!detected.has(meta.name)) {
      detected.add(meta.name);
      frameworks.push(meta);
    }
  }

  // ── package.json (Node/JS) ──────────────────────────────────────────────
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg     = readJSON(pkgPath);
  if (pkg) {
    const deps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    matchFrameworks(deps, JS_FRAMEWORKS).forEach(add);
  }

  // ── requirements.txt (Python) ───────────────────────────────────────────
  const reqPath = path.join(projectRoot, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    const lines = readLines(reqPath).map(l => l.split(/[>=<\[]/)[0].trim().toLowerCase());
    matchFrameworks(lines, PYTHON_FRAMEWORKS).forEach(add);
  }

  // ── setup.cfg / Pipfile / pyproject.toml (Python) ───────────────────────
  const pyproject = path.join(projectRoot, 'pyproject.toml');
  if (fs.existsSync(pyproject)) {
    const names = readTOML(pyproject);
    matchFrameworks(names, PYTHON_FRAMEWORKS).forEach(add);
  }

  // ── go.mod (Go) ─────────────────────────────────────────────────────────
  const goMod = path.join(projectRoot, 'go.mod');
  if (fs.existsSync(goMod)) {
    const lines = readLines(goMod);
    matchFrameworks(lines, GO_FRAMEWORKS).forEach(add);
  }

  // ── Cargo.toml (Rust) ───────────────────────────────────────────────────
  const cargoToml = path.join(projectRoot, 'Cargo.toml');
  if (fs.existsSync(cargoToml)) {
    const names = readTOML(cargoToml);
    matchFrameworks(names, RUST_FRAMEWORKS).forEach(add);
  }

  // ── composer.json (PHP) ─────────────────────────────────────────────────
  const composerPath = path.join(projectRoot, 'composer.json');
  const composer     = readJSON(composerPath);
  if (composer) {
    const deps = Object.keys(composer.require || {});
    matchFrameworks(deps, PHP_FRAMEWORKS).forEach(add);
  }

  // ── pom.xml / build.gradle (Java/Kotlin) ───────────────────────────────
  try {
    const pomPath = path.join(projectRoot, 'pom.xml');
    if (fs.existsSync(pomPath)) {
      const content = fs.readFileSync(pomPath, 'utf-8');
      matchFrameworks(content.match(/artifactId>([^<]+)</g)?.map(m => m.replace(/<\/?artifactId>/g,'')) || [], JAVA_FRAMEWORKS).forEach(add);
    }
  } catch (_) {}

  // ── Gemfile (Ruby) ──────────────────────────────────────────────────────
  const gemfilePath = path.join(projectRoot, 'Gemfile');
  if (fs.existsSync(gemfilePath)) {
    const content = fs.readFileSync(gemfilePath, 'utf-8');
    if (/rails/i.test(content)) add({ name: 'Ruby on Rails', category: 'fullstack', color: '#CC0000' });
    if (/sinatra/i.test(content)) add({ name: 'Sinatra',     category: 'backend',   color: '#CC342D' });
    if (/rspec/i.test(content))   add({ name: 'RSpec',       category: 'testing',   color: '#CC342D' });
  }

  // ── File-based fingerprints ─────────────────────────────────────────────
  const allPaths = [projectRoot, ...fileList.map(f => path.join(projectRoot, f))];
  for (const fingerprint of FILE_FINGERPRINTS) {
    const found = allPaths.some(p =>
      p.toLowerCase().includes(fingerprint.file.toLowerCase())
    );
    if (found) add(fingerprint);
  }

  // ── Infer primary language from file counts ─────────────────────────────
  const langFromFiles = inferLangFromFiles(fileList);

  // ── Categorize ──────────────────────────────────────────────────────────
  const categories = {};
  for (const fw of frameworks) {
    if (!categories[fw.category]) categories[fw.category] = [];
    categories[fw.category].push(fw.name);
  }

  return {
    frameworks,
    categories,
    primaryLanguage: langFromFiles.primary,
    languageBreakdown: langFromFiles.breakdown,
    isMonorepo: detectMonorepo(projectRoot, fileList),
  };
}

function inferLangFromFiles(fileList) {
  const counts = {};
  for (const f of fileList) {
    const ext = f.split('.').pop()?.toLowerCase();
    if (!ext) continue;
    const langMap = {
      js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
      ts: 'TypeScript', tsx: 'TypeScript',
      py: 'Python', pyw: 'Python',
      go: 'Go',
      rs: 'Rust',
      java: 'Java',
      kt: 'Kotlin',
      rb: 'Ruby',
      php: 'PHP',
      c: 'C', h: 'C',
      cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++',
      cs: 'C#',
      swift: 'Swift',
      dart: 'Dart',
      ex: 'Elixir', exs: 'Elixir',
      hs: 'Haskell',
      scala: 'Scala',
      r: 'R',
      lua: 'Lua',
    };
    const lang = langMap[ext];
    if (lang) counts[lang] = (counts[lang] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total  = sorted.reduce((s, [, n]) => s + n, 0) || 1;

  return {
    primary:   sorted[0]?.[0] || 'Unknown',
    breakdown: Object.fromEntries(sorted.map(([l, n]) => [l, Math.round(n / total * 100)])),
  };
}

function detectMonorepo(projectRoot, fileList) {
  const rootPkg = path.join(projectRoot, 'package.json');
  try {
    const pkg = readJSON(rootPkg);
    if (pkg?.workspaces) return true;
  } catch (_) {}
  const hasLerna   = fs.existsSync(path.join(projectRoot, 'lerna.json'));
  const hasTurborepo = fs.existsSync(path.join(projectRoot, 'turbo.json'));
  const hasNx      = fs.existsSync(path.join(projectRoot, 'nx.json'));
  const hasPnpmWs  = fileList.some(f => f.includes('pnpm-workspace'));
  return hasLerna || hasTurborepo || hasNx || hasPnpmWs;
}

module.exports = { detect };