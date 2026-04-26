import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, GitBranch, Zap, Home, Plus,
  Activity, Settings, LogOut, FolderGit2, X,
  PanelLeftClose, PanelLeftOpen, ChevronRight,
  ChevronDown, FileCode, Folder, FolderOpen,
  Search,
} from 'lucide-react';
import useAppStore  from '../store/appStore';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { getRepos } from '../api/client';

const NAV_TABS = [
  { id: 'chat',     icon: MessageSquare, label: 'Chat',        desc: 'Ask questions'   },
  { id: 'graph',    icon: GitBranch,     label: 'Graph',       desc: 'Dependency map'  },
  { id: 'trace',    icon: Activity,      label: 'Trace',       desc: 'Execution flow'  },
  { id: 'impact',   icon: Zap,           label: 'Impact',      desc: 'Change analysis' },
  { id: 'explorer', icon: FolderOpen,    label: 'Files',       desc: 'File explorer'   },
];

// ─── File tree helpers ────────────────────────────────────────────────────────

/**
 * Converts a flat array of file paths like:
 *   ["src/index.js", "src/utils/helper.js", "package.json"]
 * into a nested tree:
 *   { src: { "index.js": null, utils: { "helper.js": null } }, "package.json": null }
 */
function buildTree(filePaths) {
  const root = {};
  for (const fp of filePaths) {
    const parts = fp.split('/');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // leaf = file
        node[part] = { __isFile: true, __path: fp };
      } else {
        if (!node[part]) node[part] = {};
        node = node[part];
      }
    }
  }
  return root;
}

/**
 * Sort: folders first, then files, both alphabetically.
 */
function sortedEntries(obj) {
  const entries = Object.entries(obj).filter(([k]) => k !== '__isFile' && k !== '__path');
  return entries.sort(([aKey, aVal], [bKey, bVal]) => {
    const aIsFile = aVal?.__isFile;
    const bIsFile = bVal?.__isFile;
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return aKey.localeCompare(bKey);
  });
}

// ─── FileTree component ───────────────────────────────────────────────────────

function FileTree({ node, depth = 0, onFileClick, searchQuery, isLight }) {
  const [open, setOpen] = useState(depth < 1); // auto-open first level

  const entries = sortedEntries(node);
  if (!entries.length) return null;

  return (
    <div>
      {entries.map(([name, value]) => {
        const isFile   = value?.__isFile;
        const filePath = value?.__path;

        // Filter by search
        if (searchQuery && isFile && !filePath.toLowerCase().includes(searchQuery.toLowerCase())) {
          return null;
        }

        if (isFile) {
          const ext      = name.split('.').pop()?.toLowerCase();
          const dotColor = getExtColor(ext);
          const highlight = searchQuery && name.toLowerCase().includes(searchQuery.toLowerCase());
          return (
            <button
              key={name}
              onClick={() => onFileClick(filePath, name)}
              title={filePath}
              className="w-full text-left flex items-center gap-1.5 py-0.5 px-1 rounded-md transition-colors group"
              style={{
                paddingLeft: `${(depth + 1) * 10 + 4}px`,
                background: highlight ? 'rgba(59,130,246,0.1)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = highlight ? 'rgba(59,130,246,0.1)' : 'transparent'}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: dotColor, minWidth: '6px' }}
              />
              <span
                className="text-[11px] truncate"
                style={{
                  color: highlight
                    ? '#60a5fa'
                    : (isLight ? '#475569' : '#94a3b8'),
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {name}
              </span>
            </button>
          );
        }

        // Folder
        return (
          <FolderNode
            key={name}
            name={name}
            node={value}
            depth={depth}
            onFileClick={onFileClick}
            searchQuery={searchQuery}
            isLight={isLight}
            forceOpen={!!searchQuery}
          />
        );
      })}
    </div>
  );
}

function FolderNode({ name, node, depth, onFileClick, searchQuery, isLight, forceOpen }) {
  const [open, setOpen] = useState(depth < 1 || forceOpen);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left flex items-center gap-1 py-0.5 px-1 rounded-md transition-colors"
        style={{ paddingLeft: `${depth * 10 + 4}px` }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {open
          ? <ChevronDown  className="w-3 h-3 shrink-0" style={{ color: isLight ? '#94a3b8' : '#475569' }} />
          : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: isLight ? '#94a3b8' : '#475569' }} />
        }
        {open
          ? <FolderOpen className="w-3 h-3 shrink-0 text-yellow-500" />
          : <Folder     className="w-3 h-3 shrink-0 text-yellow-500" />
        }
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: isLight ? '#334155' : '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {name}
        </span>
      </button>
      {open && (
        <FileTree
          node={node}
          depth={depth + 1}
          onFileClick={onFileClick}
          searchQuery={searchQuery}
          isLight={isLight}
        />
      )}
    </div>
  );
}

/** Map common file extensions to a recognisable dot colour */
function getExtColor(ext) {
  const map = {
    js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
    py: '#3572a5', go: '#00add8', rs: '#de3522', java: '#b07219',
    rb: '#701516', php: '#4f5d95', css: '#563d7c', scss: '#c6538c',
    html: '#e34c26', json: '#6b7280', md: '#083fa1', sh: '#89e051',
    yml: '#cb171e', yaml: '#cb171e', toml: '#9c4221', sql: '#e38d44',
  };
  return map[ext] || '#6b7280';
}

// ─── FileExplorerPanel (shown inside sidebar when Files tab active) ────────────

function FileExplorerPanel({ activeRepo, isLight, onFileClick, isOpen }) {
  const [searchQuery, setSearchQuery] = useState('');
  const borderColor = isLight ? 'rgba(15,23,42,0.1)' : 'rgba(148,163,184,0.08)';

  const allFiles = activeRepo?.keyFiles || [];
  // Also try to build from graph nodes if available
  const graphFiles = activeRepo?.graph?.nodes?.map(n => n.filePath || n.id).filter(Boolean) || [];
  const files = graphFiles.length > allFiles.length ? graphFiles : allFiles;

  if (!files.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
        <FileCode className="w-6 h-6 mb-2" style={{ color: isLight ? '#cbd5e1' : '#1e2d45' }} />
        <p className="text-[11px]" style={{ color: isLight ? '#94a3b8' : '#475569' }}>
          No files indexed yet
        </p>
      </div>
    );
  }

  const tree = buildTree(files);

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-2 py-2 shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div
          className="flex items-center gap-1.5 rounded-lg px-2 py-1"
          style={{ background: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.06)', border: `1px solid ${borderColor}` }}
        >
          <Search className="w-3 h-3 shrink-0" style={{ color: isLight ? '#94a3b8' : '#475569' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter files…"
            className="bg-transparent outline-none text-[11px] w-full"
            style={{ color: isLight ? '#334155' : '#94a3b8', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
      </div>
      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <FileTree
          node={tree}
          depth={0}
          onFileClick={onFileClick}
          searchQuery={searchQuery}
          isLight={isLight}
        />
      </div>
      {/* Count footer */}
      <div className="px-3 py-1.5 shrink-0" style={{ borderTop: `1px solid ${borderColor}` }}>
        <p className="text-[10px]" style={{ color: isLight ? '#94a3b8' : '#475569' }}>
          {files.length.toLocaleString()} files indexed
        </p>
      </div>
    </div>
  );
}

// ─── Tooltip component (simple CSS tooltip) ──────────────────────────────────

function Tooltip({ children, label, disabled }) {
  if (disabled) return children;
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150"
      >
        <div
          className="px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap"
          style={{
            background: 'rgba(15,23,42,0.92)',
            color: '#f1f5f9',
            border: '1px solid rgba(148,163,184,0.15)',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({ onClose, onFileSelect }) {
  const {
    repos, activeRepoId, activeRepo, activeTab, sidebarOpen,
    setRepos, setActiveRepo, setActiveTab, setGraphData, toggleSidebar,
  } = useAppStore();
  const { user, logout } = useAuthStore();
  const theme   = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { getRepos().then(setRepos).catch(() => {}); }, []);

  const readyRepos  = repos.filter(r => r.status === 'ready');
  const isDashboard = location.pathname === '/dashboard';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isOpen   = isMobile ? true : sidebarOpen;

  // ── Theme colours ──────────────────────────────────────────────────────────
  const sidebarBg   = isLight ? 'rgba(241,245,249,0.98)' : 'rgba(8,11,20,0.97)';
  const borderColor = isLight ? 'rgba(15,23,42,0.1)'     : 'rgba(148,163,184,0.08)';
  const textMuted   = isLight ? '#64748b' : '#64748b';
  const textLabel   = isLight ? '#94a3b8' : '#475569';
  const emptyColor  = isLight ? '#cbd5e1' : '#1e2d45';

  // ── File click handler: opens explain panel or triggers callback ───────────
  const handleFileClick = (filePath, fileName) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    } else {
      // Fall back: switch to chat tab so user can ask about the file
      setActiveTab('chat');
    }
    onClose?.();
  };

  // ── Show file explorer inline when Files tab is active + sidebar open ──────
  const showFileExplorer = isDashboard && activeRepoId && activeTab === 'explorer' && isOpen;

  return (
    <aside
      className="relative flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        // Wider when file explorer is open so tree is readable
        width:          showFileExplorer ? '260px' : (isOpen ? '220px' : '52px'),
        height:         '100%',
        background:     sidebarBg,
        borderRight:    `1px solid ${borderColor}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Mobile close button ─────────────────────────────────────────────── */}
      {onClose && (
        <button
          onClick={onClose}
          title="Close sidebar"
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.1)',
            border: `1px solid ${borderColor}`,
          }}
        >
          <X className="w-3.5 h-3.5" style={{ color: textMuted }} />
        </button>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Logo / collapse row ─────────────────────────────────────────────
            The toggle button is HERE — inside the sidebar at the top,
            always visible, never clipped by overflow:hidden.
        ────────────────────────────────────────────────────────────────────── */}
        {!onClose && (
          <div
            className="flex items-center shrink-0 px-2 pt-2 pb-1"
            style={{
              justifyContent: isOpen ? 'space-between' : 'center',
              borderBottom: `1px solid ${borderColor}`,
              minHeight: '44px',
            }}
          >
            {isOpen && (
              <span
                className="text-[12px] font-bold tracking-tight pl-1 select-none"
                style={{ color: isLight ? '#0f172a' : '#e2e8f0', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                RepoInsight
              </span>
            )}

            {/* ← THIS is the new toggle — inside the sidebar, never clipped */}
            <button
              onClick={toggleSidebar}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center transition-all hover:scale-105"
              style={{
                background: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.08)',
                border: `1px solid ${borderColor}`,
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.12)';
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.08)';
                e.currentTarget.style.borderColor = borderColor;
              }}
            >
              {sidebarOpen
                ? <PanelLeftClose className="w-3.5 h-3.5" style={{ color: textMuted }} />
                : <PanelLeftOpen  className="w-3.5 h-3.5" style={{ color: textMuted }} />
              }
            </button>
          </div>
        )}

        {/* ── Home nav ────────────────────────────────────────────────────── */}
        <div className="px-2 pt-2 pb-1 shrink-0">
          <Tooltip label="Home" disabled={isOpen}>
            <SidebarItem
              icon={Home}
              label="Home"
              active={location.pathname === '/'}
              collapsed={!isOpen}
              isLight={isLight}
              onClick={() => { navigate('/'); onClose?.(); }}
            />
          </Tooltip>
        </div>

        {/* ── Tools ───────────────────────────────────────────────────────── */}
        {isDashboard && activeRepoId && (
          <div
            className="px-2 py-1 shrink-0"
            style={{ borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}
          >
            {isOpen && (
              <p className="text-[9px] font-bold uppercase tracking-widest px-2 mb-1.5 mt-1" style={{ color: textLabel }}>
                Tools
              </p>
            )}
            {NAV_TABS.map(tab => (
              <Tooltip key={tab.id} label={tab.label} disabled={isOpen}>
                <SidebarItem
                  icon={tab.icon}
                  label={tab.label}
                  active={activeTab === tab.id}
                  collapsed={!isOpen}
                  isLight={isLight}
                  onClick={() => { setActiveTab(tab.id); onClose?.(); }}
                />
              </Tooltip>
            ))}
          </div>
        )}

        {/* ── File Explorer (inline, takes remaining height when active) ──── */}
        {showFileExplorer ? (
          <div className="flex-1 overflow-hidden min-h-0">
            <FileExplorerPanel
              activeRepo={activeRepo}
              isLight={isLight}
              onFileClick={handleFileClick}
              isOpen={isOpen}
            />
          </div>
        ) : (
          /* ── Repos list ─────────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {isOpen && readyRepos.length > 0 && (
              <p className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2 mt-1" style={{ color: textLabel }}>
                Repositories
              </p>
            )}

            {readyRepos.map(repo => {
              const isActive  = activeRepoId === repo._id;
              const shortName = repo.name.includes('/') ? repo.name.split('/').pop() : repo.name;
              const activeBg     = 'rgba(59,130,246,0.12)';
              const activeBorder = 'rgba(59,130,246,0.2)';
              const hoverBg      = isLight ? 'rgba(15,23,42,0.05)' : 'rgba(148,163,184,0.05)';
              const nameColor    = isActive ? (isLight ? '#1e40af' : '#e2e8f0') : (isLight ? '#334155' : '#94a3b8');
              const metaColor    = isActive ? (isLight ? '#64748b' : '#475569') : (isLight ? '#94a3b8' : '#334155');

              return isOpen ? (
                <button
                  key={repo._id}
                  onClick={() => { setActiveRepo(repo._id); setGraphData(null); navigate('/dashboard'); onClose?.(); }}
                  className="w-full text-left px-2.5 py-2 rounded-xl mb-0.5 transition-all"
                  style={{
                    background: isActive ? activeBg : 'transparent',
                    border: isActive ? `1px solid ${activeBorder}` : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{
                        background: isActive ? 'rgba(59,130,246,0.2)' : (isLight ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.08)'),
                        color: isActive ? '#3b82f6' : textMuted,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {shortName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: nameColor }}>{shortName}</p>
                      <p className="text-[10px] truncate" style={{ color: metaColor, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {(repo.totalChunks || 0).toLocaleString()} chunks
                      </p>
                    </div>
                  </div>
                </button>
              ) : (
                <Tooltip key={repo._id} label={shortName} disabled={false}>
                  <button
                    onClick={() => { setActiveRepo(repo._id); setGraphData(null); navigate('/dashboard'); }}
                    className="w-full h-9 rounded-xl mb-0.5 flex items-center justify-center transition-all"
                    style={{
                      background: isActive ? activeBg : 'transparent',
                      border: isActive ? `1px solid ${activeBorder}` : '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: isActive ? 'rgba(59,130,246,0.25)' : (isLight ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.1)'),
                        color: isActive ? '#3b82f6' : textMuted,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {shortName.charAt(0).toUpperCase()}
                    </div>
                  </button>
                </Tooltip>
              );
            })}

            {readyRepos.length === 0 && isOpen && (
              <div className="px-2 py-6 text-center">
                <FolderGit2 className="w-7 h-7 mx-auto mb-2" style={{ color: emptyColor }} />
                <p className="text-[11px]" style={{ color: emptyColor }}>No repos yet</p>
              </div>
            )}
          </div>
        )}

        {/* ── Bottom actions ────────────────────────────────────────────────── */}
        <div className="px-2 py-2 shrink-0 space-y-0.5" style={{ borderTop: `1px solid ${borderColor}` }}>
          <Tooltip label="Add repository" disabled={isOpen}>
            <SidebarItem
              icon={Plus}
              label="Add Repository"
              collapsed={!isOpen}
              isLight={isLight}
              onClick={() => { navigate('/'); onClose?.(); }}
            />
          </Tooltip>
          <Tooltip label="Settings" disabled={isOpen}>
            <SidebarItem
              icon={Settings}
              label="Settings"
              active={location.pathname === '/settings'}
              collapsed={!isOpen}
              isLight={isLight}
              onClick={() => { navigate('/settings'); onClose?.(); }}
            />
          </Tooltip>

          {/* User chip — expanded */}
          {isOpen && user && (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-xl mt-1"
              style={{
                background: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(148,163,184,0.04)',
                border: `1px solid ${borderColor}`,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {user.avatarUrl
                  ? <img src={user.avatarUrl} className="w-7 h-7 object-cover" alt="" />
                  : user.name?.charAt(0)?.toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: isLight ? '#1e293b' : '#e2e8f0' }}>
                  {user.name}
                </p>
                <p className="text-[10px] truncate" style={{ color: textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="transition-colors shrink-0 p-1 rounded-lg"
                style={{ color: textMuted }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = textMuted;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Collapsed: logout icon */}
          {!isOpen && user && (
            <Tooltip label="Sign out" disabled={false}>
              <button
                onClick={handleLogout}
                className="w-full h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ color: textMuted }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = textMuted;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── SidebarItem ──────────────────────────────────────────────────────────────

function SidebarItem({ icon: Icon, label, active, collapsed, onClick, isLight }) {
  const activeColor  = '#3b82f6';
  const inactiveColor = isLight ? '#64748b' : '#64748b';
  const activeBg     = 'rgba(59,130,246,0.12)';
  const activeBorder = 'rgba(59,130,246,0.18)';
  const hoverBg      = isLight ? 'rgba(15,23,42,0.05)' : 'rgba(148,163,184,0.06)';
  const hoverColor   = isLight ? '#0f172a' : '#94a3b8';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-xl transition-all mb-0.5"
      style={{
        padding:        collapsed ? '0.45rem' : '0.45rem 0.625rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background:     active ? activeBg : 'transparent',
        border:         active ? `1px solid ${activeBorder}` : '1px solid transparent',
        color:          active ? activeColor : inactiveColor,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = hoverBg;
          e.currentTarget.style.color = hoverColor;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = inactiveColor;
        }
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>}
    </button>
  );
}