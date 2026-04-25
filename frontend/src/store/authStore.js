import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/client';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,   // { id, name, email, plan, hasGithubToken, githubUsername, avatarUrl }
      loading: true,   // true ONLY while checking initial session on app mount — NOT during form submits
      error:   null,   // kept for legacy usage in some components, but forms use local state

      // ── Bootstrap: check if cookie session is still valid ────────────
      // Called once on app mount from App.jsx — sets loading=true then false
      // Forms should NOT use this loading flag
      initAuth: async () => {
        set({ loading: true, error: null });
        try {
          const user = await getMe();
          set({ user, loading: false });
        } catch (_) {
          set({ user: null, loading: false });
        }
      },

      // ── Register ─────────────────────────────────────────────────────
      // Returns { ok: true } or { ok: false, error: string }
      // Does NOT touch store loading — caller manages its own loading state
      register: async (name, email, password) => {
        set({ error: null });
        try {
          const data = await apiRegister(name, email, password);
          set({ user: data.user, error: null });
          return { ok: true };
        } catch (err) {
          const msg = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
          set({ error: msg });
          return { ok: false, error: msg };
        }
      },

      // ── Login ────────────────────────────────────────────────────────
      // Returns { ok: true } or { ok: false, error: string }
      // Does NOT touch store loading — caller manages its own loading state
      login: async (email, password) => {
        set({ error: null });
        try {
          const data = await apiLogin(email, password);
          set({ user: data.user, error: null });
          return { ok: true };
        } catch (err) {
          let msg = 'Something went wrong. Please try again.';
          const status    = err.response?.status;
          const serverMsg = err.response?.data?.error;

          if (status === 401) {
            msg = 'Incorrect email or password. Please check your credentials.';
          } else if (status === 429) {
            msg = 'Too many attempts. Please wait a few minutes and try again.';
          } else if (status === 400 && serverMsg) {
            msg = serverMsg;
          } else if (serverMsg) {
            msg = serverMsg;
          } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
            msg = 'No internet connection. Please check your network.';
          }

          set({ error: msg });
          return { ok: false, error: msg };
        }
      },

      // ── Logout ───────────────────────────────────────────────────────
      logout: async () => {
        try { await apiLogout(); } catch (_) {}
        set({ user: null, error: null, loading: false });
      },

      // ── Update user fields after settings change ──────────────────────
      updateUser: (patch) =>
        set(s => ({ user: s.user ? { ...s.user, ...patch } : s.user })),

      clearError: () => set({ error: null }),
    }),
    {
      name:       'repoinsight-auth',
      // Only persist the user object — never persist loading or error
      partialize: s => ({ user: s.user }),
    }
  )
);

export default useAuthStore;