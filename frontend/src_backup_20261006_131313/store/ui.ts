import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';
interface UIState {
  theme: Theme;
  toggleTheme: () => void;
}

const initial: Theme =
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: initial,
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'mlhub-ui' },
  ),
);