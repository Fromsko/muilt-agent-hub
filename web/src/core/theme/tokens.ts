import type { ThemeConfig } from 'antd';

export const sharedTokens = {
  borderRadius: 8,
  fontFamily:
    "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
  wireframe: false,
} satisfies NonNullable<ThemeConfig['token']>;

export const sharedComponentTokens: ThemeConfig['components'] = {
  Button: { controlHeight: 36 },
  Input: { controlHeight: 36 },
  Select: { controlHeight: 36 },
  Table: { headerBg: 'transparent' },
};
