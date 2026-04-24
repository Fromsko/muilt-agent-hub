import { Button, Drawer, Flex, Layout, Menu, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { AppIcon } from '@/core/icons/registry';
import { UserMenu } from '../UserMenu';
import { X } from '@/core/icons';
import { useIsMobile } from '../use-is-mobile';
import { buildMenuItems, collectMenuKeyPaths, getMenuSelection } from './menu-utils';
import { easeTransition } from '@/core/motion/presets';
import type { MenuProps } from 'antd';
import './index.css';

const { Sider } = Layout;

const SIDER_WIDTH = 240;
const SIDER_COLLAPSED_WIDTH = 64;

export interface SidebarProps {
  mobileDrawerOpen: boolean;
  onMobileDrawerOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileDrawerOpen, onMobileDrawerOpenChange }: SidebarProps) {
  const { token } = theme.useToken();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const menus = useAuthStore((s) => s.menus);
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);

  const keyToPath = useMemo(() => collectMenuKeyPaths(menus), [menus]);
  const menuItems = useMemo(() => buildMenuItems(menus), [menus]);

  const { selectedKeys: computedSelected, openKeys: computedOpen } = useMemo(
    () => getMenuSelection(menus, location.pathname),
    [menus, location.pathname],
  );

  const [openKeys, setOpenKeys] = useState<string[]>([]);

  useEffect(() => {
    setOpenKeys((prev) => {
      const next = new Set([...computedOpen, ...prev]);
      return Array.from(next);
    });
  }, [computedOpen]);

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    const path = keyToPath.get(String(key));
    if (path) {
      void navigate({ href: path });
      if (isMobile) {
        onMobileDrawerOpenChange(false);
      }
    }
  };

  const onOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys);
  };

  const goHome = useCallback(() => {
    void navigate({ href: '/' });
    if (isMobile) {
      onMobileDrawerOpenChange(false);
    }
  }, [isMobile, navigate, onMobileDrawerOpenChange]);

  const sidebarBody = (
    <Flex vertical style={{ height: '100%', minHeight: 0 }}>
      <div
        className="sidebar-logo"
        style={isMobile ? { paddingRight: 44 } : undefined}
        onClick={goHome}
        role="presentation"
      >
        {sidebarCollapsed && !isMobile ? (
          <AppIcon name="LayoutDashboard" size={28} color={token.colorTextLightSolid} />
        ) : (
          <Flex vertical gap={4}>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
              AI Agent Platform
            </Typography.Text>
            <h1 style={{ color: token.colorTextLightSolid, margin: 0 }}>AI Agent Platform</h1>
          </Flex>
        )}
      </div>
      <div style={{ padding: sidebarCollapsed && !isMobile ? '0 8px 8px' : '0 16px 12px' }}>
        {!sidebarCollapsed || isMobile ? (
          <div
            style={{
              borderRadius: 10,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography.Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12 }}>
              当前环境
            </Typography.Text>
            <Typography.Text style={{ display: 'block', color: token.colorTextLightSolid }}>
              Production Workspace
            </Typography.Text>
          </div>
        ) : null}
      </div>
      <div className="sidebar-menu-wrapper">
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={computedSelected}
          openKeys={openKeys}
          onOpenChange={onOpenChange}
          items={menuItems}
          onClick={onMenuClick}
          style={{ borderInlineEnd: 'none', background: 'transparent' }}
        />
      </div>
      <div
        style={{
          borderTop: `1px solid ${token.colorSplit}`,
          padding: isMobile || !sidebarCollapsed ? '8px 12px' : '8px 4px',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <UserMenu collapsed={!isMobile && sidebarCollapsed} inverted />
      </div>
    </Flex>
  );

  const mobileDrawerContent = (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={easeTransition}
      style={{ height: '100%', position: 'relative', background: '#020617' }}
    >
      <Button
        type="text"
        icon={<X size={18} />}
        aria-label="关闭菜单"
        onClick={() => onMobileDrawerOpenChange(false)}
        style={{
          position: 'absolute',
          top: 12,
          right: 8,
          zIndex: 1,
          color: token.colorTextLightSolid,
        }}
      />
      {sidebarBody}
    </motion.div>
  );

  if (isMobile) {
    return (
      <Drawer
        placement="left"
        width={SIDER_WIDTH}
        closable={false}
        onClose={() => onMobileDrawerOpenChange(false)}
        open={mobileDrawerOpen}
        styles={{ body: { padding: 0, height: '100%' } }}
        style={{ zIndex: 1001 }}
      >
        {mobileDrawerContent}
      </Drawer>
    );
  }

  return (
    <Sider
      width={SIDER_WIDTH}
      collapsedWidth={SIDER_COLLAPSED_WIDTH}
      collapsed={sidebarCollapsed}
      onCollapse={setSidebarCollapsed}
      collapsible
      theme="dark"
      style={{
        overflow: 'hidden',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      {sidebarBody}
    </Sider>
  );
}
