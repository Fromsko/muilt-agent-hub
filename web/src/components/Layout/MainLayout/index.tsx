import { Layout, Flex, theme } from 'antd';
import { useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { useIsMobile } from '../use-is-mobile';
import { Sidebar } from '../Sidebar';
import { Header } from '../Header';
import { AppFooter } from '../AppFooter';

const { Content } = Layout;

export function MainLayout() {
  const { token } = theme.useToken();
  const isMobile = useIsMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar mobileDrawerOpen={mobileDrawerOpen} onMobileDrawerOpenChange={setMobileDrawerOpen} />
      <Flex vertical style={{ flex: 1, minWidth: 0, minHeight: '100vh' }}>
        <Header isMobile={isMobile} onOpenMobileMenu={() => setMobileDrawerOpen(true)} />
        <Content
          className="main-layout-main"
          style={{
            flex: 1,
            padding: token.paddingLG,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            background: token.colorBgLayout,
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <Outlet />
            </div>
            <AppFooter />
          </div>
        </Content>
      </Flex>
    </Layout>
  );
}
