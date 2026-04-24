import { Card, Flex, Progress, Typography, theme } from 'antd';

interface OverviewMetric {
  label: string;
  percent: number;
  color?: string;
}

interface SystemOverviewCardProps {
  title: string;
  items: OverviewMetric[];
}

export function SystemOverviewCard({ title, items }: SystemOverviewCardProps) {
  const { token } = theme.useToken();

  return (
    <Card title={title} className="dash-card">
      <Flex vertical gap={16}>
        {items.map((item) => (
          <div key={item.label}>
            <Typography.Text type="secondary">{item.label}</Typography.Text>
            <Progress percent={item.percent} strokeColor={item.color ?? token.colorPrimary} />
          </div>
        ))}
      </Flex>
    </Card>
  );
}
