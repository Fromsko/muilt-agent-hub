import { createPersistentStore } from './createPersistentStore';

interface SettingsState {
  sidebarCollapsed: boolean;
  themePreset: string;
  locale: string;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setThemePreset: (preset: string) => void;
  setLocale: (locale: string) => void;
}

export const useSettingsStore = createPersistentStore<SettingsState>(
  (set) => ({
    sidebarCollapsed: false,
    themePreset:
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
    locale: 'zh-CN',

    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    toggleSidebar: () =>
      set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setThemePreset: (preset) => set({ themePreset: preset }),
    setLocale: (locale) => set({ locale }),
  }),
  {
    name: 'settings-storage',
  },
);
