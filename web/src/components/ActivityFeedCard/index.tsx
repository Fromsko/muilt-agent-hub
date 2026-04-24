import { Card, Flex, Tag, Typography } from 'antd';

interface ActivityItem {
  title: string;
  time: string;
  tag: string;
  tone: 'success' | 'warning' | 'error' | 'processing';
}

interface ActivityFeedCardProps {
  title: string;
  items: ActivityItem[];
}

export function ActivityFeedCard({ title, items }: ActivityFeedCardProps) {
  return (
    <Card title={title} className="dash-card">
      <Flex vertical gap={10}>
        {items.map((item) => (
          <Flex
            key={item.title}
            justify="space-between"
            align="center"
            gap={12}
            style={{ paddingBottom: 8, borderBottom: '1px solid var(--ant-color-split, #f0f0f0)' }}
          >
            <div style={{ minWidth: 0 }}>
              <Tag color={item.tone}>{item.tag}</Tag>
              <Typography.Text>{item.title}</Typography.Text>
            </div>
            <Typography.Text type="secondary" style={{ flexShrink: 0 }}>
              {item.time}
            </Typography.Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
