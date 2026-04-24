import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

import { sharedComponentTokens, sharedTokens } from '@/core/theme/tokens';

export interface ThemePreset {
  name: string;
  label: string;
  algorithm: ThemeConfig['algorithm'];
  token: ThemeConfig['token'];
  components?: ThemeConfig['components'];
}

const lightPreset: ThemePreset = {
  name: 'light',
  label: 'Light',
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorBgBase: '#ffffff',
    colorBgLayout: '#f3f6fb',
    colorBgContainer: '#ffffff',
    colorBorderSecondary: '#dbe3f0',
    colorFillAlter: '#f8fafc',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#0f172a',
      triggerBg: '#111c34',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: 'rgba(255,255,255,0.72)',
      itemHoverColor: '#ffffff',
      itemSelectedBg: 'rgba(37,99,235,0.18)',
      itemSelectedColor: '#ffffff',
    },
  },
};

const darkPreset: ThemePreset = {
  name: 'dark',
  label: 'Dark',
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#60a5fa',
    colorInfo: '#60a5fa',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#f87171',
    colorBgBase: '#0b1120',
    colorBgLayout: '#020617',
    colorBgContainer: '#111827',
    colorBorderSecondary: '#1f2937',
    colorFillAlter: '#0f172a',
  },
  components: {
    Layout: {
      headerBg: '#111827',
      siderBg: '#020617',
      triggerBg: '#0f172a',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: 'rgba(255,255,255,0.68)',
      itemHoverColor: '#ffffff',
      itemSelectedBg: 'rgba(96,165,250,0.18)',
      itemSelectedColor: '#ffffff',
    },
  },
};

const presetRegistry = new Map<string, ThemePreset>();

presetRegistry.set('light', lightPreset);
presetRegistry.set('dark', darkPreset);

export function registerPreset(preset: ThemePreset): void {
  presetRegistry.set(preset.name, preset);
}

export function getPreset(name: string): ThemePreset | undefined {
  return presetRegistry.get(name);
}

export function getAllPresets(): ThemePreset[] {
  return [...presetRegistry.values()];
}

function mergeComponents(
  base: NonNullable<ThemeConfig['components']>,
  preset: ThemeConfig['components'],
): ThemeConfig['components'] {
  if (!preset) {
    return { ...base };
  }
  const merged: ThemeConfig['components'] = { ...base };
  for (const key of Object.keys(preset) as (keyof typeof preset)[]) {
    const basePart = merged[key];
    const presetPart = preset[key];
    merged[key] = { ...(basePart as object), ...(presetPart as object) } as never;
  }
  return merged;
}

export function buildThemeConfig(presetName: string): ThemeConfig {
  const preset = getPreset(presetName);
  if (!preset) {
    return {
      token: { ...sharedTokens },
      components: { ...sharedComponentTokens },
    };
  }
  return {
    algorithm: preset.algorithm,
    token: { ...sharedTokens, ...preset.token },
    components: mergeComponents(
      sharedComponentTokens as NonNullable<ThemeConfig['components']>,
      preset.components,
    ),
  };
}
