import { Typography } from 'antd';
import { Database } from '@/core/icons';

export function DataTableEmpty() {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Database size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
      <Typography.Title level={5} style={{ margin: '0 0 8px' }}>
        暂无可展示的数据
      </Typography.Title>
      <Typography.Text type="secondary">
        请稍后刷新，或调整当前筛选条件后重试。
      </Typography.Text>
    </div>
  );
}
