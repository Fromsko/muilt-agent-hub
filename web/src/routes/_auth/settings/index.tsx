import { createFileRoute } from '@tanstack/react-router';
import { Card, Form, Switch, Select, Typography, Flex } from 'antd';
import { PageContainer } from '@/components/PageContainer';
import { useSettingsStore } from '@/stores/settings';
import { useTheme } from '@/core/theme';
import { getAllPresets } from '@/core/theme/presets';
import { Sun, Moon, Globe } from '@/core/icons';

export const Route = createFileRoute('/_auth/settings/')({
  component: SettingsPage,
  staticData: { breadcrumb: '系统设置' },
});

function SettingsPage() {
  const { isDark, toggle, presetName, setPreset } = useTheme();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const presets = getAllPresets();

  return (
    <PageContainer
      title="系统设置"
      subtitle="统一管理当前界面的外观偏好与语言设置。"
    >
      <Flex vertical gap={16}>
        <Card>
          <Typography.Title level={5}>外观</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
            先选择界面模式，再决定是否切换到其他可用配色方案。
          </Typography.Paragraph>
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <Form.Item label="界面模式" extra="推荐优先使用此开关在亮色与深色之间切换。">
              <Switch
                checked={isDark}
                onChange={toggle}
                checkedChildren={<Moon size={12} />}
                unCheckedChildren={<Sun size={12} />}
              />
            </Form.Item>
            <Form.Item label="配色方案" extra="当前仅提供与界面模式对应的基础方案。">
              <Select
                value={presetName}
                onChange={setPreset}
                options={presets.map((p) => ({ label: p.label, value: p.name }))}
                style={{ width: 240 }}
              />
            </Form.Item>
          </Form>
        </Card>

        <Card>
          <Typography.Title level={5}>语言</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
            设置界面显示语言。
          </Typography.Paragraph>
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <Form.Item label="界面语言">
              <Flex align="center" gap={8}>
                <Globe size={14} />
                <Select
                  value={locale}
                  onChange={setLocale}
                  options={[
                    { label: '简体中文', value: 'zh-CN' },
                    { label: 'English', value: 'en-US' },
                  ]}
                  style={{ width: 240 }}
                />
              </Flex>
            </Form.Item>
          </Form>
        </Card>
      </Flex>
    </PageContainer>
  );
}
