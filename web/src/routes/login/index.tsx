import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { App, Button, Card, Flex, Form, Input, Tabs, Typography, theme } from 'antd';
import { motion } from 'motion/react';
import { useState } from 'react';
import { authApi } from '@/api/auth';
import { Aurora } from '@/components/Aurora';
import { fetchSessionAndApplyToStore } from '@/core/auth/session';
import { Lock, Mail, Moon, Sun } from '@/core/icons';
import { scaleVariants } from '@/core/motion';
import { useTheme } from '@/core/theme';
import { useAuthStore } from '@/stores/auth';
import { APP_BRAND_NAME } from '@/utils/constants';

export const Route = createFileRoute('/login/')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

interface LoginFormValues {
  email: string;
  password: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isDark, toggle } = useTheme();
  const { token } = theme.useToken();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginForm] = Form.useForm<LoginFormValues>();

  const performLogin = async (email: string, password: string) => {
    const tokens = await authApi.login({ username: email, password });
    setTokens(tokens);
    await fetchSessionAndApplyToStore();
    navigate({ to: '/dashboard' });
  };

  const onLogin = async (values: LoginFormValues) => {
    try {
      setLoginLoading(true);
      await performLogin(values.email, values.password);
      message.success('已登录');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: token.colorBgLayout,
      }}
    >
      <Aurora />
      <motion.div
        variants={scaleVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 440,
          padding: '0 20px',
        }}
      >
        <Card
          style={{
            boxShadow: isDark
              ? '0 18px 48px rgba(2, 6, 23, 0.45)'
              : '0 18px 48px rgba(15, 23, 42, 0.08)',
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
          }}
        >
          <Flex justify="space-between" align="flex-start" style={{ marginBottom: 16 }}>
            <div>
              <Typography.Text type="secondary">AI Agent Platform</Typography.Text>
              <Typography.Title level={3} style={{ margin: '8px 0 4px' }}>
                {APP_BRAND_NAME}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                多智能体配置与交互平台。
              </Typography.Paragraph>
            </div>
            <Button
              type="text"
              icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
              onClick={toggle}
              aria-label="切换主题"
            />
          </Flex>

          <Tabs
            items={[
              {
                key: 'login',
                label: '登录',
                children: (
                  <Form
                    form={loginForm}
                    layout="vertical"
                    onFinish={onLogin}
                    requiredMark={false}
                  >
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效邮箱' },
                      ]}
                    >
                      <Input prefix={<Mail size={16} />} placeholder="you@example.com" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <Input.Password prefix={<Lock size={16} />} placeholder="密码" size="large" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button type="primary" htmlType="submit" block size="large" loading={loginLoading}>
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </Card>
      </motion.div>
    </div>
  );
}