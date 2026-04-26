import { useState } from 'react';
import {
  Github, Key, Trash2, CheckCircle2, AlertCircle, Loader2,
  User, Lock, LogOut, ExternalLink, Shield, AlertTriangle, X
} from 'lucide-react';
import { saveGithubToken, removeGithubToken, updateProfile } from '../api/client';
import useAuthStore from '../store/authStore';

// ── Reusable confirm modal (same pattern as Home & ChatWindow) ──────────────
function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg-solid)', border: '1px solid var(--border)', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}` }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: danger ? 'var(--danger)' : 'var(--accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg transition-colors shrink-0" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-100)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: danger ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(12,16,32,0.8)', border: '1px solid rgba(148,163,184,0.09)' }}
    >
      <div className="px-4 md:px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
          {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest block" style={{ color: '#475569' }}>{label}</label>
      {children}
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div
      className="flex items-center gap-2 text-[13px] p-3 rounded-xl"
      style={{
        background: msg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${msg.type === 'success' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
        color: msg.type === 'success' ? '#34d399' : '#f87171',
      }}
    >
      {msg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

function GitHubSection() {
  const { user, updateUser } = useAuthStore();
  const [token,         setToken]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [msg,           setMsg]           = useState(null);
  // Custom modal instead of native confirm()
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) return;
    setLoading(true); setMsg(null);
    try {
      const data = await saveGithubToken(token.trim());
      updateUser({ hasGithubToken: true, githubUsername: data.githubUsername, avatarUrl: data.avatarUrl });
      setToken('');
      setMsg({ type: 'success', text: `Connected as @${data.githubUsername}` });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally { setLoading(false); }
  };

  const handleRemoveConfirmed = async () => {
    setShowRemoveModal(false);
    setLoading(true); setMsg(null);
    try {
      await removeGithubToken();
      updateUser({ hasGithubToken: false, githubUsername: null, avatarUrl: null });
      setMsg({ type: 'success', text: 'GitHub token removed.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally { setLoading(false); }
  };

  return (
    <>
      <ConfirmModal
        isOpen={showRemoveModal}
        title="Remove GitHub token?"
        message="Your GitHub token will be deleted. You won't be able to index private repositories until you add a new one."
        confirmLabel="Remove token"
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setShowRemoveModal(false)}
      />

      <Section icon={Github} title="GitHub Integration" subtitle="Required to index private repositories">
        <div className="space-y-4">
          <p className="text-[13px] text-slate-400 leading-relaxed">
            Add a Personal Access Token (PAT) with{' '}
            <code className="text-[12px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontFamily: "'IBM Plex Mono', monospace" }}>
              repo
            </code>{' '}
            scope to index private repos. Your token is AES-256 encrypted at rest.{' '}
            <a
              href="https://github.com/settings/tokens/new?description=RepoInsight&scopes=repo"
              target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              Generate on GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </p>

          {user?.hasGithubToken ? (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
              {user.avatarUrl && <img src={user.avatarUrl} className="w-10 h-10 rounded-full" alt="" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-[14px] font-semibold text-emerald-300">Connected</p>
                </div>
                {user.githubUsername && (
                  <p className="text-[12px] text-slate-500 mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    @{user.githubUsername}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowRemoveModal(true)}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="input-base"
                  style={{ paddingLeft: '2.5rem', fontFamily: "'IBM Plex Mono', monospace" }}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={loading || !token.trim()}
                className="btn-primary w-full py-2.5 rounded-xl text-[14px] text-white flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                {loading ? 'Verifying…' : 'Save Token'}
              </button>
            </div>
          )}
          <Toast msg={msg} />
        </div>
      </Section>
    </>
  );
}

function ProfileSection() {
  const { user, updateUser } = useAuthStore();
  const [name,    setName]    = useState(user?.name || '');
  const [curPwd,  setCurPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const payload = { name };
      if (newPwd) { payload.currentPassword = curPwd; payload.newPassword = newPwd; }
      await updateProfile(payload);
      updateUser({ name });
      setCurPwd(''); setNewPwd('');
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally { setLoading(false); }
  };

  return (
    <Section icon={User} title="Profile" subtitle="Manage your account details">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name">
            <input value={name} onChange={e => setName(e.target.value)} className="input-base" required />
          </Field>
          <Field label="Email">
            <input value={user?.email || ''} disabled className="input-base" style={{ opacity: 0.4, cursor: 'not-allowed' }} />
          </Field>
        </div>

        <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(16,23,41,0.5)', border: '1px solid rgba(148,163,184,0.07)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Change Password</p>
            <span className="text-[10px] text-slate-700">optional</span>
          </div>
          <Field label="Current password">
            <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="••••••••" className="input-base" />
          </Field>
          <Field label="New password">
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 characters" className="input-base" />
          </Field>
        </div>

        <Toast msg={msg} />

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-xl text-[14px] text-white flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </Section>
  );
}

function PlanSection() {
  const { user, logout } = useAuthStore();
  return (
    <Section icon={Shield} title="Plan & Usage" subtitle="Your current subscription">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(16,23,41,0.5)', border: '1px solid rgba(148,163,184,0.07)' }}>
          <div>
            <p className="text-[15px] font-semibold text-slate-100 capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {user?.plan} Plan
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">Up to {user?.repoLimit || 5} repositories</p>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${user?.plan === 'pro' ? 'badge-ready' : 'badge-pending'}`}>
            {user?.plan?.toUpperCase()}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-[13px] text-slate-500 hover:text-red-400 py-2.5 rounded-xl hover:bg-red-500/10 transition-all"
          style={{ border: '1px solid rgba(148,163,184,0.07)' }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out of all sessions
        </button>
      </div>
    </Section>
  );
}

export default function Settings() {
  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-5 pb-20">
        <div className="mb-6">
          <h1 className="text-[20px] md:text-[22px] font-bold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
            Settings
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage your account and integrations</p>
        </div>
        <PlanSection />
        <GitHubSection />
        <ProfileSection />
      </div>
    </div>
  );
}