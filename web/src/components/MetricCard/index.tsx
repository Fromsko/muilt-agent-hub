import { Card, Flex, Statistic, Typography, theme } from 'antd';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  detail?: ReactNode;
  tone?: 'primary' | 'success' | 'info' | 'warning';
}

export function MetricCard({ title, value, icon, detail, tone = 'primary' }: MetricCardProps) {
  const { token } = theme.useToken();

  const toneColorMap = {
    primary: token.colorPrimary,
    success: token.colorSuccess,
    info: token.colorInfo,
    warning: token.colorWarning,
  } as const;

  return (
    <Card hoverable className="dash-stat-card">
      <Flex vertical gap={8}>
        <Statistic title={title} value={value} prefix={<span style={{ color: toneColorMap[tone] }}>{icon}</span>} />
        {detail ? <Typography.Text type="secondary">{detail}</Typography.Text> : null}
      </Flex>
    </Card>
  );
}
