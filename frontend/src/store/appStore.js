import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  repos:        [],
  activeRepoId: null,
  activeRepo:   null,
  setRepos:     (repos) => set({ repos }),
  setActiveRepo: (repoId) => {
    const repo = get().repos.find(r => r._id === repoId) || null;
    set({ activeRepoId: repoId, activeRepo: repo, messages: [], sessionId: null, graphData: null });
  },
  updateRepo: (id, data) => set(s => ({
    repos: s.repos.map(r => r._id === id ? { ...r, ...data } : r),
    activeRepo: s.activeRepoId === id ? { ...s.activeRepo, ...data } : s.activeRepo
  })),

  messages:   [],
  sessionId:  null,
  isLoading:  false,
  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  setSessionId: (id) => set({ sessionId: id }),
  setLoading:  (v) => set({ isLoading: v }),
  clearMessages: () => set({ messages: [], sessionId: null }),

  graphData:    null,
  setGraphData: (data) => set({ graphData: data }),

  activeTab:    'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),

  sidebarOpen:    true,
  toggleSidebar:  () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
}));

export default useAppStore;