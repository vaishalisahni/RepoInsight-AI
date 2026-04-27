import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Repos ────────────────────────────────────────────────────────────────
      repos:        [],
      activeRepoId: null,
      activeRepo:   null,

      setRepos: (repos) => {
        set({ repos });
        const { activeRepoId } = get();
        if (activeRepoId) {
          const updated = repos.find(r => r._id === activeRepoId);
          if (updated) set({ activeRepo: updated });
        }
      },

      setActiveRepo: (repoId) => {
        const repo = get().repos.find(r => r._id === repoId) || null;
        set({
          activeRepoId:    repoId,
          activeRepo:      repo,
          messages:        [],
          sessionId:       null,
          graphData:       null,
          selectedFile:    null,
          pendingQuestion: null,
        });
      },

      updateRepo: (id, data) => set(s => ({
        repos: s.repos.map(r => r._id === id ? { ...r, ...data } : r),
        activeRepo: s.activeRepoId === id ? { ...s.activeRepo, ...data } : s.activeRepo,
      })),

      // ── Chat ─────────────────────────────────────────────────────────────────
      messages:      [],
      sessionId:     null,
      isLoading:     false,
      pendingQuestion: null,

      addMessage:   (msg) => set(s => ({ messages: [...s.messages, msg] })),
      setSessionId: (id)  => set({ sessionId: id }),
      setLoading:   (v)   => set({ isLoading: v }),
      clearMessages: ()   => set({ messages: [], sessionId: null }),
      setPendingQuestion: (q) => set({ pendingQuestion: q }),
      clearPendingQuestion: () => set({ pendingQuestion: null }),

      // ── Graph ─────────────────────────────────────────────────────────────────
      graphData:    null,
      setGraphData: (data) => set({ graphData: data }),

      // ── Navigation ────────────────────────────────────────────────────────────
      activeTab:    'chat',
      setActiveTab: (tab) => set({ activeTab: tab }),

      sidebarOpen:   true,
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      // ── Code Viewer Modal ─────────────────────────────────────────────────────
      codeViewer:    null,
      setCodeViewer: (data) => set({ codeViewer: data }),

      // ── File Explorer ─────────────────────────────────────────────────────────
      selectedFile:    null,
      setSelectedFile: (path) => set({ selectedFile: path }),
    }),
    {
      name: 'repoinsight-app',
      // FIX: persist activeRepoId, activeRepo, and repos so dashboard
      // survives a browser refresh without losing repo selection
      partialize: (s) => ({
        activeRepoId: s.activeRepoId,
        activeRepo:   s.activeRepo,
        repos:        s.repos,
        activeTab:    s.activeTab,
        sidebarOpen:  s.sidebarOpen,
      }),
      // After rehydration, sync activeRepo from repos list in case it was updated
      onRehydrateStorage: () => (state) => {
        if (state?.activeRepoId && state?.repos?.length) {
          const repo = state.repos.find(r => r._id === state.activeRepoId);
          if (repo) state.activeRepo = repo;
        }
      },
    }
  )
);

export default useAppStore;