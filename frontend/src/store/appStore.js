import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Repos
  repos: [],
  activeRepoId: null,
  setRepos: (repos) => set({ repos }),
  setActiveRepo: (repoId) => set({ activeRepoId: repoId, messages: [], sessionId: null }),

  // Chat
  messages: [],
  sessionId: null,
  isLoading: false,
  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  setSessionId: (id) => set({ sessionId: id }),
  setLoading: (v) => set({ isLoading: v }),

  // Graph
  graphData: null,
  setGraphData: (data) => set({ graphData: data }),

  // Active file
  activeFilePath: null,
  setActiveFilePath: (path) => set({ activeFilePath: path })
}));

export default useAppStore;