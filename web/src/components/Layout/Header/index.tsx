import { Breadcrumb, Button, Flex, Tooltip, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useMatches } from '@tanstack/react-router';
import { useTheme } from '@/core/theme';
import { Sun, Moon, Maximize, Minimize, Menu } from '@/core/icons';
import type { BreadcrumbProps } from 'antd';

function formatPathTitle(pathname: string): string {
  if (pathname === '/') {
    return '首页';
  }
  const parts = pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? pathname;
  return last
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface HeaderProps {
  isMobile: boolean;
  onOpenMobileMenu: () => void;
}

export function Header({ isMobile, onOpenMobileMenu }: HeaderProps) {
  const { token } = theme.useToken();
  const { isDark, toggle } = useTheme();
  const matches = useMatches();
  const location = useLocation();

  const [fullscreen, setFullscreen] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  );

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  const breadcrumbItems: BreadcrumbProps['items'] = useMemo(() => {
    const filtered = matches.filter((m) => m.routeId !== '__root__');
    if (filtered.length === 0) {
      return [
        {
          title:
            location.pathname === '/' ? '首页' : formatPathTitle(location.pathname),
        },
      ];
    }
    return filtered.map((m) => {
      const staticData = m.staticData as { breadcrumb?: string } | undefined;
      const title =
        staticData?.breadcrumb ??
        (m.pathname === '/' ? '首页' : formatPathTitle(m.pathname));
      return { title };
    });
  }, [location.pathname, matches]);

  const currentTitle = breadcrumbItems[breadcrumbItems.length - 1]?.title ?? '首页';

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={16}
      style={{
        minHeight: 72,
        padding: `12px ${token.paddingLG}px`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        flexShrink: 0,
      }}
    >
      <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
        {isMobile ? (
          <Button
            type="text"
            icon={<Menu size={18} />}
            aria-label="打开菜单"
            onClick={onOpenMobileMenu}
          />
        ) : null}
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Breadcrumb items={breadcrumbItems} style={{ minWidth: 0 }} />
          <Typography.Text strong style={{ fontSize: 16 }}>
            {currentTitle}
          </Typography.Text>
        </Flex>
      </Flex>
      <Flex align="center" gap={4}>
        <Tooltip title={isDark ? '切换到浅色模式' : '切换到深色模式'}>
          <Button
            type="text"
            icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
            aria-label="切换主题"
            onClick={toggle}
          />
        </Tooltip>
        <Tooltip title={fullscreen ? '退出全屏' : '进入全屏'}>
          <Button
            type="text"
            icon={fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            aria-label={fullscreen ? '退出全屏' : '进入全屏'}
            onClick={toggleFullscreen}
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
}
