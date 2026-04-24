import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/client';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:       null,   // { id, name, email, plan, hasGithubToken, githubUsername, avatarUrl }
      loading:    true,   // loading initial session check
      error:      null,

      // ── Bootstrap: check if session cookie is still valid ─────────────
      initAuth: async () => {
        set({ loading: true, error: null });
        try {
          const user = await getMe();
          set({ user, loading: false });
        } catch (_) {
          set({ user: null, loading: false });
        }
      },

      // ── Register ──────────────────────────────────────────────────────
      register: async (name, email, password) => {
        set({ loading: true, error: null });
        try {
          const data = await apiRegister(name, email, password);
          set({ user: data.user, loading: false });
          return { ok: true };
        } catch (err) {
          const msg = err.response?.data?.error || err.message;
          set({ error: msg, loading: false });
          return { ok: false, error: msg };
        }
      },

      // ── Login ─────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const data = await apiLogin(email, password);
          set({ user: data.user, loading: false });
          return { ok: true };
        } catch (err) {
          const msg = err.response?.data?.error || err.message;
          set({ error: msg, loading: false });
          return { ok: false, error: msg };
        }
      },

      // ── Logout ────────────────────────────────────────────────────────
      logout: async () => {
        try { await apiLogout(); } catch (_) {}
        set({ user: null, error: null });
      },

      // ── Update local user data ─────────────────────────────────────────
      updateUser: (patch) => set(s => ({ user: s.user ? { ...s.user, ...patch } : s.user })),

      clearError: () => set({ error: null }),
    }),
    {
      name:    'repoinsight-auth',
      partialize: s => ({ user: s.user }), // only persist user (not loading state)
    }
  )
);

export default useAuthStore;