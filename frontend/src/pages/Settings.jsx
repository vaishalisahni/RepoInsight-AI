import { useState, useEffect } from 'react';
import { Github, Key, Trash2, CheckCircle2, AlertCircle, Loader2, User, Lock, LogOut, ExternalLink } from 'lucide-react';
import { saveGithubToken, removeGithubToken, updateProfile } from '../api/client';
import useAuthStore from '../store/authStore';

/* ── GitHub Token section ─────────────────────────────────────────────── */
function GitHubTokenSection() {
  const { user, updateUser } = useAuthStore();
  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null); // { type: 'success'|'error', text }

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

  const handleRemove = async () => {
    if (!confirm('Remove your GitHub token? Private repos will no longer be accessible.')) return;
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
    <section className="card-glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Github className="w-4 h-4 text-ink-400" />
        <h2 className="text-sm font-semibold text-white">GitHub Integration</h2>
      </div>
      <p className="text-xs text-[#4a476a] leading-relaxed">
        Add a Personal Access Token to index private repositories. Your token is stored encrypted and never exposed.{' '}
        <a
          href="https://github.com/settings/tokens/new?description=RepoInsight&scopes=repo"
          target="_blank" rel="noopener noreferrer"
          className="text-ink-400 hover:text-ink-300 inline-flex items-center gap-1"
        >
          Generate token on GitHub <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      {user?.hasGithubToken ? (
        <div className="flex items-center gap-3 p-3 rounded-xl"
             style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(52,211,153,0.2)' }}>
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.githubUsername} className="w-8 h-8 rounded-full" />
          )}
          <div className="flex-1">
            <p className="text-sm text-emerald-400 font-semibold">Connected</p>
            {user.githubUsername && (
              <p className="text-xs text-[#4a476a] font-mono">@{user.githubUsername}</p>
            )}
          </div>
          <button
            onClick={handleRemove}
            disabled={loading}
            className="text-xs text-[#4a476a] hover:text-red-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a476a]" />
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="input-base rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono w-full"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={loading || !token.trim()}
            className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            {loading ? 'Verifying…' : 'Save Token'}
          </button>
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-2 text-xs p-3 rounded-xl ${
          msg.type === 'success'
            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
            : 'text-red-400 bg-red-500/10 border border-red-500/20'
        }`}>
          {msg.type === 'success'
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            : <AlertCircle  className="w-3.5 h-3.5 shrink-0" />}
          {msg.text}
        </div>
      )}
    </section>
  );
}

/* ── Profile section ──────────────────────────────────────────────────── */
function ProfileSection() {
  const { user, updateUser, logout } = useAuthStore();
  const [name,        setName]        = useState(user?.name || '');
  const [curPwd,      setCurPwd]      = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [msg,         setMsg]         = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const payload = { name };
      if (newPwd) { payload.currentPassword = curPwd; payload.newPassword = newPwd; }
      await updateProfile(payload);
      updateUser({ name });
      setCurPwd(''); setNewPwd('');
      setMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally { setLoading(false); }
  };

  return (
    <section className="card-glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-ink-400" />
        <h2 className="text-sm font-semibold text-white">Profile</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-[#8b88a6] uppercase tracking-wider block mb-1.5">Name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            className="input-base rounded-xl px-4 py-2.5 text-sm w-full"
            required
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#8b88a6] uppercase tracking-wider block mb-1.5">Email</label>
          <input
            value={user?.email || ''} disabled
            className="input-base rounded-xl px-4 py-2.5 text-sm w-full opacity-50 cursor-not-allowed"
          />
        </div>

        <div className="pt-2 border-t" style={{ borderColor:'rgba(124,127,245,0.1)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-[#4a476a]" />
            <p className="text-[11px] font-semibold text-[#8b88a6] uppercase tracking-wider">Change Password (optional)</p>
          </div>
          <div className="space-y-2">
            <input
              type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)}
              placeholder="Current password"
              className="input-base rounded-xl px-4 py-2.5 text-sm w-full"
            />
            <input
              type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="input-base rounded-xl px-4 py-2.5 text-sm w-full"
            />
          </div>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 text-xs p-3 rounded-xl ${
            msg.type === 'success'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-red-400 bg-red-500/10 border border-red-500/20'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <div className="pt-2 border-t" style={{ borderColor:'rgba(124,127,245,0.1)' }}>
        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-xs text-[#4a476a] hover:text-red-400 py-2.5 rounded-xl hover:bg-red-500/10 transition-all">
          <LogOut className="w-3.5 h-3.5" /> Sign out of all sessions
        </button>
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function Settings() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white font-display">Settings</h1>
        <p className="text-xs text-[#4a476a] mt-1">Manage your account and integrations</p>
      </div>

      {/* Plan badge */}
      <div className="card-glass rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white capitalize">{user?.plan} Plan</p>
          <p className="text-xs text-[#4a476a]">Up to {user?.repoLimit || 5} repositories</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${user?.plan === 'pro' ? 'badge-ready' : 'badge-pending'}`}>
          {user?.plan?.toUpperCase()}
        </span>
      </div>

      <GitHubTokenSection />
      <ProfileSection />
    </div>
  );
}