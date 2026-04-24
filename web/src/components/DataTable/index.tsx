import { Table, theme } from 'antd';
import type { TableProps } from 'antd';
import { DataTableSkeleton } from './DataTableSkeleton';
import { DataTableEmpty } from './DataTableEmpty';

interface DataTableProps<T> extends Omit<TableProps<T>, 'loading'> {
  loading?: boolean;
  skeletonRows?: number;
  maxHeight?: number;
}

export function DataTable<T extends object>({
  loading,
  skeletonRows = 5,
  maxHeight,
  pagination,
  ...tableProps
}: DataTableProps<T>) {
  const { token } = theme.useToken();

  if (loading) {
    return <DataTableSkeleton rows={skeletonRows} />;
  }

  return (
    <div
      className="data-table-shell"
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        flex: 1,
        background: token.colorBgContainer,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <Table<T>
        size="middle"
        sticky
        locale={{ emptyText: <DataTableEmpty /> }}
        scroll={maxHeight ? { y: maxHeight, x: 'max-content' } : { x: 'max-content' }}
        pagination={
          pagination === false
            ? false
            : {
                size: 'default',
                showSizeChanger: true,
                showLessItems: true,
                ...pagination,
              }
        }
        rowHoverable
        {...tableProps}
      />
    </div>
  );
}
