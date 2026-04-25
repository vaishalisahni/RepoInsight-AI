"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class ChatPanel {
    constructor(panel, context, api, auth) {
        this.context = context;
        this.api = api;
        this.auth = auth;
        this._disposables = [];
        this._panel = panel;
        this._activeRepoId = auth.getActiveRepoId();
        this._panel.webview.html = this._getHtmlContent();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => this._handleMessage(message), null, this._disposables);
        // Send initial state
        this._sendInitialState();
    }
    static createOrShow(context, api, auth) {
        const column = vscode.ViewColumn.Beside;
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return ChatPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel('repoinsightChat', 'RepoInsight AI', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
        });
        ChatPanel.currentPanel = new ChatPanel(panel, context, api, auth);
        return ChatPanel.currentPanel;
    }
    // ── Public actions ──────────────────────────────────────────────────────
    async explainFile(filePath) {
        const rel = this._toRelative(filePath);
        this._post({ type: 'setMode', mode: 'explain', filePath: rel });
        this._runExplain(rel);
    }
    async explainSelection(filePath, code, startLine) {
        const rel = this._toRelative(filePath);
        this._post({ type: 'setMode', mode: 'explain', filePath: rel, code, startLine });
        this._runExplain(rel, { code, startLine });
    }
    async analyzeImpact(filePath) {
        const rel = this._toRelative(filePath);
        this._post({ type: 'setMode', mode: 'impact', filePath: rel });
        this._runImpact(rel);
    }
    async traceFlow(entryPoint, functionName) {
        const rel = this._toRelative(entryPoint);
        this._post({ type: 'setMode', mode: 'trace', entryPoint: rel, functionName });
        this._runTrace(rel, functionName);
    }
    // ── Message handler ─────────────────────────────────────────────────────
    async _handleMessage(msg) {
        switch (msg.type) {
            case 'query':
                await this._runQuery(msg.question);
                break;
            case 'setRepo':
                this._activeRepoId = msg.repoId;
                await this.auth.setActiveRepoId(msg.repoId);
                this._sessionId = undefined;
                break;
            case 'loadRepos':
                await this._sendRepos();
                break;
            case 'login':
                await this.auth.promptLogin();
                await this._sendInitialState();
                break;
            case 'clearChat':
                this._sessionId = undefined;
                break;
            case 'openFile':
                this._openFileInEditor(msg.filePath, msg.line);
                break;
        }
    }
    // ── API calls ───────────────────────────────────────────────────────────
    async _runQuery(question) {
        if (!this._activeRepoId) {
            this._post({ type: 'error', message: 'Select a repository first.' });
            return;
        }
        this._post({ type: 'loading', value: true });
        try {
            const result = await this.api.query(this._activeRepoId, question, this._sessionId);
            this._sessionId = result.sessionId;
            this._post({ type: 'answer', answer: result.answer, sources: result.sources });
        }
        catch (err) {
            this._post({ type: 'error', message: err.response?.data?.error || err.message });
        }
        finally {
            this._post({ type: 'loading', value: false });
        }
    }
    async _runExplain(filePath, selection) {
        if (!this._activeRepoId) {
            this._post({ type: 'error', message: 'Select a repository first.' });
            return;
        }
        this._post({ type: 'loading', value: true });
        try {
            const result = await this.api.explain(this._activeRepoId, filePath, selection);
            this._post({ type: 'explanation', explanation: result.explanation, relatedFiles: result.relatedFiles });
        }
        catch (err) {
            this._post({ type: 'error', message: err.response?.data?.error || err.message });
        }
        finally {
            this._post({ type: 'loading', value: false });
        }
    }
    async _runImpact(filePath) {
        if (!this._activeRepoId) {
            this._post({ type: 'error', message: 'Select a repository first.' });
            return;
        }
        this._post({ type: 'loading', value: true });
        try {
            const result = await this.api.impact(this._activeRepoId, filePath);
            this._post({ type: 'impact', analysis: result.analysis, relatedFiles: result.relatedFiles });
        }
        catch (err) {
            this._post({ type: 'error', message: err.response?.data?.error || err.message });
        }
        finally {
            this._post({ type: 'loading', value: false });
        }
    }
    async _runTrace(entryPoint, functionName) {
        if (!this._activeRepoId) {
            this._post({ type: 'error', message: 'Select a repository first.' });
            return;
        }
        this._post({ type: 'loading', value: true });
        try {
            const result = await this.api.trace(this._activeRepoId, entryPoint, functionName);
            this._post({ type: 'trace', trace: result.trace, sources: result.sources });
        }
        catch (err) {
            this._post({ type: 'error', message: err.response?.data?.error || err.message });
        }
        finally {
            this._post({ type: 'loading', value: false });
        }
    }
    async _sendInitialState() {
        const isLoggedIn = this.auth.isLoggedIn();
        const user = this.auth.getUser();
        this._post({ type: 'init', isLoggedIn, user, activeRepoId: this._activeRepoId });
        if (isLoggedIn)
            await this._sendRepos();
    }
    async _sendRepos() {
        try {
            const repos = await this.api.getRepos();
            this._post({ type: 'repos', repos });
        }
        catch (_) { }
    }
    _post(data) {
        this._panel.webview.postMessage(data);
    }
    _toRelative(absPath) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
            const root = folders[0].uri.fsPath;
            if (absPath.startsWith(root))
                return absPath.slice(root.length + 1).replace(/\\/g, '/');
        }
        return path.basename(absPath);
    }
    _openFileInEditor(filePath, line) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length)
            return;
        const abs = vscode.Uri.file(path.join(folders[0].uri.fsPath, filePath));
        vscode.workspace.openTextDocument(abs).then(doc => {
            vscode.window.showTextDocument(doc, { preview: true }).then(editor => {
                if (line && line > 0) {
                    const pos = new vscode.Position(line - 1, 0);
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(new vscode.Range(pos, pos));
                }
            });
        });
    }
    // ── HTML ──────────────────────────────────────────────────────────────────
    _getHtmlContent() {
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RepoInsight AI</title>
  <style>
    :root {
      --bg:      var(--vscode-editor-background, #0d1117);
      --surface: var(--vscode-input-background, #161b22);
      --border:  var(--vscode-panel-border, rgba(255,255,255,0.1));
      --text:    var(--vscode-editor-foreground, #e6edf3);
      --muted:   var(--vscode-descriptionForeground, #8b949e);
      --accent:  var(--vscode-button-background, #1f6feb);
      --accent2: #58a6ff;
      --danger:  var(--vscode-inputValidation-errorBorder, #f85149);
      --success: #3fb950;
      --warn:    #d29922;
      --radius:  8px;
      --mono:    'JetBrains Mono', 'Courier New', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: 13px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Header ── */
    #header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface) 80%, transparent);
      flex-shrink: 0;
    }
    #header .logo { font-size: 11px; font-weight: 700; color: var(--accent2); letter-spacing: 0.05em; text-transform: uppercase; }
    #repo-select {
      flex: 1;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 5px 8px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }
    #repo-select:focus { border-color: var(--accent2); }

    /* ── Tabs ── */
    #tabs {
      display: flex;
      gap: 2px;
      padding: 6px 14px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .tab {
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      color: var(--muted);
      border: none;
      background: transparent;
      transition: all 0.15s;
    }
    .tab:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .tab.active { color: var(--accent2); background: rgba(31,111,235,0.12); }

    /* ── Messages ── */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
    }

    /* Empty state */
    #empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      color: var(--muted);
      text-align: center;
    }
    #empty-state .icon { font-size: 36px; margin-bottom: 6px; }
    #empty-state h3    { font-size: 14px; color: var(--text); font-weight: 600; }
    #empty-state p     { font-size: 12px; max-width: 280px; line-height: 1.6; }
    .starters { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 12px; width: 100%; max-width: 360px; }
    .starter-btn {
      padding: 7px 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--muted);
      font-size: 11px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
      line-height: 1.4;
    }
    .starter-btn:hover { color: var(--text); border-color: var(--accent2); background: rgba(31,111,235,0.08); }

    /* Message bubbles */
    .msg { display: flex; flex-direction: column; gap: 4px; animation: fadeIn 0.2s ease; }
    .msg.user   { align-items: flex-end; }
    .msg.assistant { align-items: flex-start; }

    .bubble {
      max-width: 90%;
      padding: 8px 12px;
      border-radius: var(--radius);
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .msg.user .bubble {
      background: var(--accent);
      color: #fff;
      border-radius: var(--radius) var(--radius) 3px var(--radius);
    }
    .msg.assistant .bubble {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 3px var(--radius) var(--radius) var(--radius);
    }

    /* Markdown-ish within bubbles */
    .bubble code {
      background: rgba(255,255,255,0.08);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: var(--mono);
      font-size: 0.85em;
    }
    .bubble pre {
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 6px 0;
    }
    .bubble pre code { background: transparent; padding: 0; }
    .bubble strong { font-weight: 600; color: #fff; }

    /* Sources */
    .sources {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .source-chip {
      font-size: 10px;
      font-family: var(--mono);
      padding: 2px 6px;
      background: rgba(31,111,235,0.12);
      border: 1px solid rgba(88,166,255,0.2);
      border-radius: 4px;
      color: var(--accent2);
      cursor: pointer;
    }
    .source-chip:hover { background: rgba(31,111,235,0.2); }

    /* Loading dots */
    .typing { display: flex; gap: 4px; align-items: center; padding: 8px 12px; }
    .dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--muted);
      animation: bounce 1.2s infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.15s; }
    .dot:nth-child(3) { animation-delay: 0.3s; }

    /* Error banner */
    .error-banner {
      padding: 8px 12px;
      background: rgba(248,81,73,0.1);
      border: 1px solid rgba(248,81,73,0.3);
      border-radius: var(--radius);
      color: var(--danger);
      font-size: 12px;
    }

    /* ── Input ── */
    #input-area {
      padding: 10px 14px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #input-row { display: flex; gap: 6px; }
    #question-input {
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      padding: 7px 10px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      resize: none;
      line-height: 1.5;
      min-height: 36px;
      max-height: 120px;
    }
    #question-input:focus { border-color: var(--accent2); }
    #question-input::placeholder { color: var(--muted); }
    #send-btn {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      padding: 7px 14px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s;
      white-space: nowrap;
    }
    #send-btn:hover   { opacity: 0.9; transform: translateY(-1px); }
    #send-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
    #hint { font-size: 10px; color: var(--muted); text-align: center; }

    /* Login state */
    #login-banner {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 24px; text-align: center; color: var(--muted);
    }
    #login-banner h3  { color: var(--text); font-size: 14px; }
    #login-btn {
      background: var(--accent);
      color: #fff; border: none;
      border-radius: var(--radius);
      padding: 8px 20px;
      cursor: pointer; font-size: 13px;
    }

    /* Scrollbar */
    ::-webkit-scrollbar         { width: 4px; }
    ::-webkit-scrollbar-track   { background: transparent; }
    ::-webkit-scrollbar-thumb   { background: rgba(255,255,255,0.12); border-radius: 99px; }

    @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    @keyframes bounce  { 0%,60%,100% { transform:translateY(0); opacity:.4; } 30% { transform:translateY(-4px); opacity:1; } }
  </style>
</head>
<body>

<!-- Header -->
<div id="header">
  <span class="logo">⚡ RepoInsight</span>
  <select id="repo-select">
    <option value="">— Select repository —</option>
  </select>
</div>

<!-- Tabs -->
<div id="tabs">
  <button class="tab active" data-tab="chat">Chat</button>
  <button class="tab" data-tab="explain">Explain</button>
  <button class="tab" data-tab="trace">Trace</button>
  <button class="tab" data-tab="impact">Impact</button>
</div>

<!-- Login banner (hidden by default) -->
<div id="login-banner" style="display:none">
  <span style="font-size:28px">🔒</span>
  <h3>Sign in to RepoInsight</h3>
  <p style="font-size:12px">Connect to your RepoInsight account to start querying your codebase.</p>
  <button id="login-btn" onclick="loginAction()">Sign in</button>
</div>

<!-- Messages -->
<div id="messages">
  <div id="empty-state">
    <div class="icon">🤖</div>
    <h3>Ask anything about your code</h3>
    <p>Select a repository, then ask questions in plain English.</p>
    <div class="starters" id="starters"></div>
  </div>
</div>

<!-- Input -->
<div id="input-area">
  <div id="input-row">
    <textarea
      id="question-input"
      placeholder="Ask about your codebase…"
      rows="1"
      disabled
    ></textarea>
    <button id="send-btn" disabled onclick="sendQuestion()">Send</button>
  </div>
  <div id="hint">Enter to send · Shift+Enter for new line</div>
</div>

<script>
  const vscode   = acquireVsCodeApi();
  let isLoggedIn = false;
  let repos      = [];
  let activeRepo = null;
  let activeTab  = 'chat';
  let isLoading  = false;

  const STARTERS = [
    'Where is authentication handled?',
    'Explain the main entry point',
    'List all API endpoints',
    'How is error handling done?',
    'What are the key data models?',
    'How is state managed?',
  ];

  // ── VS Code → Webview messages ──────────────────────────────────────────
  window.addEventListener('message', (ev) => {
    const msg = ev.data;
    switch (msg.type) {
      case 'init':
        isLoggedIn = msg.isLoggedIn;
        renderAuthState();
        if (msg.activeRepoId) setActiveRepo(msg.activeRepoId);
        break;
      case 'repos':
        repos = msg.repos || [];
        populateRepoSelect();
        break;
      case 'loading':
        isLoading = msg.value;
        renderLoading();
        break;
      case 'answer':
        removeLoading();
        appendAssistant(msg.answer, msg.sources);
        break;
      case 'explanation':
        removeLoading();
        appendAssistant(msg.explanation, []);
        break;
      case 'impact':
        removeLoading();
        appendAssistant(msg.analysis, (msg.relatedFiles || []).map(f => ({ filePath: f })));
        break;
      case 'trace':
        removeLoading();
        appendAssistant(msg.trace, (msg.sources || []).map(f => ({ filePath: f })));
        break;
      case 'error':
        removeLoading();
        appendError(msg.message);
        break;
      case 'setMode':
        switchTab(msg.mode === 'impact' ? 'impact' : msg.mode === 'trace' ? 'trace' : 'explain');
        break;
    }
  });

  // ── Auth ─────────────────────────────────────────────────────────────────
  function renderAuthState() {
    const loginBanner = document.getElementById('login-banner');
    const tabs        = document.getElementById('tabs');
    const inputArea   = document.getElementById('input-area');
    const messages    = document.getElementById('messages');
    if (isLoggedIn) {
      loginBanner.style.display = 'none';
      tabs.style.display        = 'flex';
      messages.style.display    = 'flex';
      inputArea.style.display   = 'flex';
      vscode.postMessage({ type: 'loadRepos' });
    } else {
      loginBanner.style.display = 'flex';
      tabs.style.display        = 'none';
      messages.style.display    = 'none';
      inputArea.style.display   = 'none';
    }
  }

  function loginAction() {
    vscode.postMessage({ type: 'login' });
  }

  // ── Repos ─────────────────────────────────────────────────────────────────
  function populateRepoSelect() {
    const sel = document.getElementById('repo-select');
    sel.innerHTML = '<option value="">— Select repository —</option>';
    repos.filter(r => r.status === 'ready').forEach(r => {
      const opt   = document.createElement('option');
      opt.value   = r._id;
      opt.text    = (r.name.includes('/') ? r.name.split('/').pop() : r.name)
        + ' (' + (r.totalChunks || 0).toLocaleString() + ' chunks)';
      sel.appendChild(opt);
    });
    if (activeRepo) sel.value = activeRepo;
  }

  document.getElementById('repo-select').addEventListener('change', e => {
    const val = e.target.value;
    if (!val) return;
    setActiveRepo(val);
  });

  function setActiveRepo(id) {
    activeRepo = id;
    const sel  = document.getElementById('repo-select');
    if (sel) sel.value = id;
    document.getElementById('question-input').disabled = false;
    document.getElementById('send-btn').disabled       = false;
    vscode.postMessage({ type: 'setRepo', repoId: id });
    clearMessages();
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  }

  // ── Send message ──────────────────────────────────────────────────────────
  function sendQuestion() {
    const input = document.getElementById('question-input');
    const q     = input.value.trim();
    if (!q || !activeRepo || isLoading) return;
    input.value          = '';
    input.style.height   = 'auto';
    hideEmptyState();
    appendUser(q);
    vscode.postMessage({ type: 'query', question: q });
  }

  document.getElementById('question-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
  });

  document.getElementById('question-input').addEventListener('input', e => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  });

  // ── Render helpers ────────────────────────────────────────────────────────
  function hideEmptyState() {
    const es = document.getElementById('empty-state');
    if (es) es.style.display = 'none';
  }

  function appendUser(text) {
    const msgs = document.getElementById('messages');
    const div  = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = '<div class="bubble">' + escHtml(text) + '</div>';
    msgs.appendChild(div);
    scrollBottom();
  }

  function appendAssistant(text, sources) {
    const msgs = document.getElementById('messages');
    const div  = document.createElement('div');
    div.className = 'msg assistant';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = formatMarkdown(text);
    div.appendChild(bubble);

    if (sources && sources.length) {
      const srcDiv = document.createElement('div');
      srcDiv.className = 'sources';
      sources.slice(0, 6).forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'source-chip';
        chip.textContent = (s.filePath || '').split('/').slice(-2).join('/') + (s.startLine ? ':' + s.startLine : '');
        chip.title = s.filePath;
        chip.onclick = () => vscode.postMessage({ type: 'openFile', filePath: s.filePath, line: s.startLine });
        srcDiv.appendChild(chip);
      });
      div.appendChild(srcDiv);
    }

    msgs.appendChild(div);
    scrollBottom();
  }

  function appendError(message) {
    const msgs = document.getElementById('messages');
    const div  = document.createElement('div');
    div.className = 'error-banner';
    div.textContent = '⚠ ' + message;
    msgs.appendChild(div);
    scrollBottom();
  }

  function renderLoading() {
    if (!isLoading) return;
    const msgs = document.getElementById('messages');
    const div  = document.createElement('div');
    div.id    = 'typing-indicator';
    div.className = 'msg assistant';
    div.innerHTML = '<div class="bubble typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    msgs.appendChild(div);
    scrollBottom();
  }

  function removeLoading() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function clearMessages() {
    const msgs = document.getElementById('messages');
    msgs.innerHTML = '<div id="empty-state"><div class="icon">🤖</div><h3>Ask anything about your code</h3><p>Select a repository, then ask questions in plain English.</p><div class="starters" id="starters"></div></div>';
    populateStarters();
    vscode.postMessage({ type: 'clearChat' });
  }

  function scrollBottom() {
    const msgs = document.getElementById('messages');
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Starters ──────────────────────────────────────────────────────────────
  function populateStarters() {
    const s = document.getElementById('starters');
    if (!s) return;
    STARTERS.forEach(q => {
      const btn = document.createElement('button');
      btn.className   = 'starter-btn';
      btn.textContent = q;
      btn.onclick     = () => {
        if (!activeRepo) return;
        document.getElementById('question-input').value = q;
        sendQuestion();
      };
      s.appendChild(btn);
    });
  }

  // ── Markdown formatter (minimal) ──────────────────────────────────────────
  function formatMarkdown(md) {
    let h = escHtml(md);
    h = h.replace(/\*\*(.+?)\*\*/g,   '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g,       '<em>$1</em>');
    h = h.replace(/\`\`\`[\w]*\\n?([\\s\\S]*?)\`\`\`/g, (_, c) => '<pre><code>' + c.trim() + '</code></pre>');
    h = h.replace(/\`([^\`]+)\`/g,    '<code>$1</code>');
    h = h.replace(/^#{1,3} (.+)$/gm, (_, t) => '<strong>' + t + '</strong>');
    h = h.replace(/^[-*] (.+)$/gm,   '• $1');
    h = h.replace(/\\n/g, '<br>');
    return h;
  }

  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  renderAuthState();
  populateStarters();
  vscode.postMessage({ type: 'loadRepos' });
</script>
</body>
</html>`;
    }
    dispose() {
        ChatPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
exports.ChatPanel = ChatPanel;
//# sourceMappingURL=chatPanel.js.map