import type { ThemeConfig } from 'antd';
import { createContext, useContext } from 'react';

export interface ThemeContextValue {
  isDark: boolean;
  presetName: string;
  themeConfig: ThemeConfig;
  toggle: () => void;
  setPreset: (name: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
