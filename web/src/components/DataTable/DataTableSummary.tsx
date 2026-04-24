import { Flex, Tag, Typography, theme } from 'antd';
import type { ReactNode } from 'react';

interface DataTableSummaryProps {
  total: number;
  totalLabel?: string;
  statusText: string;
  statusTag?: ReactNode;
  extraTags?: ReactNode;
}

export function DataTableSummary({
  total,
  totalLabel = '条记录',
  statusText,
  statusTag,
  extraTags,
}: DataTableSummaryProps) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        padding: '12px 16px',
      }}
    >
      <Flex align="center" justify="space-between" wrap="wrap" gap={12}>
        <div>
          <Typography.Text strong style={{ display: 'block' }}>
            共 {total} {totalLabel}
          </Typography.Text>
          <Typography.Text type="secondary">{statusText}</Typography.Text>
        </div>
        <Flex gap={8} wrap="wrap">
          {extraTags}
          {statusTag ?? <Tag>全部结果</Tag>}
        </Flex>
      </Flex>
    </div>
  );
}
