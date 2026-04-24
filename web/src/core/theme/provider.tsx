import { App as AntdApp, ConfigProvider } from 'antd';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

import { buildThemeConfig, getPreset } from '@/core/theme/presets';
import { ThemeContext, type ThemeContextValue } from '@/core/theme/use-theme';
import { useSettingsStore } from '@/stores/settings';

interface ThemeProviderProps {
  children: ReactNode;
  defaultPreset?: string;
}

export function ThemeProvider({
  children,
  defaultPreset = 'light',
}: ThemeProviderProps) {
  const presetName = useSettingsStore((s) => s.themePreset);
  const setThemePreset = useSettingsStore((s) => s.setThemePreset);

  const resolvedPreset = getPreset(presetName) ? presetName : defaultPreset;
  const themeConfig = useMemo(() => buildThemeConfig(resolvedPreset), [resolvedPreset]);

  const isDark = resolvedPreset === 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const setPreset = useCallback(
    (name: string) => {
      if (getPreset(name)) {
        setThemePreset(name);
      }
    },
    [setThemePreset],
  );

  const toggle = useCallback(() => {
    setThemePreset(isDark ? 'light' : 'dark');
  }, [isDark, setThemePreset]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      presetName: resolvedPreset,
      themeConfig,
      toggle,
      setPreset,
    }),
    [isDark, resolvedPreset, themeConfig, toggle, setPreset],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={themeConfig}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
