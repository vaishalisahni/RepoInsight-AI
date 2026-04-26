import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light'

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },

      initTheme: () => {
        const stored = get().theme || 'dark';
        applyTheme(stored);
      },
    }),
    {
      name: 'repoinsight-theme',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
);

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
}

export default useThemeStore;