import { Button, Flex, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';

interface DataTableFiltersStateProps {
  activeCount: number;
  emptyText?: string;
  activeText?: string;
  tags?: ReactNode;
  onClear?: () => void;
}

export function DataTableFiltersState({
  activeCount,
  emptyText = '当前显示全部结果',
  activeText,
  tags,
  onClear,
}: DataTableFiltersStateProps) {
  return (
    <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
      <Typography.Text type="secondary">
        {activeCount > 0 ? activeText ?? `当前已启用 ${activeCount} 个筛选条件` : emptyText}
      </Typography.Text>
      <Flex align="center" gap={8} wrap="wrap">
        {tags}
        {activeCount > 0 && onClear ? (
          <Button type="link" onClick={onClear}>
            清空筛选
          </Button>
        ) : null}
        {activeCount > 0 ? <Tag color="processing">筛选已生效</Tag> : null}
      </Flex>
    </Flex>
  );
}
