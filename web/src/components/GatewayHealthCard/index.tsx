import { Card, Flex, Tag, Typography } from 'antd';

interface HealthItem {
  name: string;
  zone: string;
  status: 'healthy' | 'warning';
  latency: string;
}

interface GatewayHealthCardProps {
  title: string;
  items: HealthItem[];
}

export function GatewayHealthCard({ title, items }: GatewayHealthCardProps) {
  return (
    <Card title={title} className="dash-card">
      <Flex vertical gap={12}>
        {items.map((item) => (
          <Flex
            key={item.name}
            justify="space-between"
            align="center"
            style={{ paddingBottom: 8, borderBottom: '1px solid var(--ant-color-split, #f0f0f0)' }}
          >
            <div>
              <Typography.Text strong>{item.name}</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                {item.zone}
              </Typography.Paragraph>
            </div>
            <Flex vertical align="flex-end" gap={4}>
              <Tag color={item.status === 'healthy' ? 'success' : 'warning'}>
                {item.status === 'healthy' ? '健康' : '关注'}
              </Tag>
              <Typography.Text type="secondary">{item.latency}</Typography.Text>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
