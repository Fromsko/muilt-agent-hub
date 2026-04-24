import { createFileRoute } from '@tanstack/react-router';
import { Button, Descriptions, Drawer, Form, Input, Select, Tag, Typography, Flex, Space } from 'antd';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { DataTable } from '@/components/DataTable';
import { DataTableFiltersState } from '@/components/DataTable/DataTableFiltersState';
import { DataTableSummary } from '@/components/DataTable/DataTableSummary';
import { FilterToolbar } from '@/components/FilterToolbar';
import { FormModal } from '@/components/FormModal';
import { Plus, Search } from '@/core/icons';
import { useConsoleStore, type GatewayInstance } from '@/stores/console';
import { executeConsoleAction, waitForMockAction } from '@/utils/console-action';
import type { ColumnsType } from 'antd/es/table';

interface GatewayFormValues {
  name: string;
  region: string;
  endpoint: string;
  version: string;
}

export const Route = createFileRoute('/_auth/gateways/')({
  component: GatewaysPage,
  staticData: { breadcrumb: '网关实例' },
});

function GatewaysPage() {
  const gateways = useConsoleStore((s) => s.gateways);
  const addGateway = useConsoleStore((s) => s.addGateway);
  const removeGateway = useConsoleStore((s) => s.removeGateway);
  const updateGatewayStatus = useConsoleStore((s) => s.updateGatewayStatus);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'healthy' | 'degraded' | 'delete' | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const selectedGateway = useMemo(
    () => gateways.find((item) => item.id === selectedGatewayId) ?? null,
    [gateways, selectedGatewayId],
  );

  const filteredInstances = useMemo(() => {
    return gateways.filter((item) => {
      const matchesKeyword =
        keyword.trim() === '' ||
        [item.name, item.region, item.endpoint].some((field) =>
          field.toLowerCase().includes(keyword.trim().toLowerCase()),
        );
      const matchesStatus = status === '' || item.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [gateways, keyword, status]);

  const activeFilterCount = Number(Boolean(keyword)) + Number(Boolean(status));

  const clearFilters = () => {
    setKeyword('');
    setStatus('');
  };

  const handleCreateGateway = async (values: GatewayFormValues) => {
    addGateway({
      id: `gw-${Date.now()}`,
      name: values.name,
      region: values.region,
      endpoint: values.endpoint,
      version: values.version,
      status: 'healthy',
    });
    setCreateOpen(false);
  };

  const confirmGatewayStatusChange = (nextStatus: GatewayInstance['status']) => {
    if (!selectedGatewayId || !selectedGateway) return;

    executeConsoleAction({
      actionKey: nextStatus,
      setPendingAction,
      confirmTitle: nextStatus === 'healthy' ? '确认标记为健康状态？' : '确认标记为需关注？',
      confirmContent:
        nextStatus === 'healthy'
          ? `将 ${selectedGateway.name} 标记为健康后，列表状态与建议动作会同步更新。`
          : `将 ${selectedGateway.name} 标记为需关注后，列表状态与建议动作会同步更新。`,
      successMessage: nextStatus === 'healthy' ? '实例已恢复为健康状态' : '实例已标记为需关注',
      errorMessage: '实例状态更新失败',
      run: async () => {
        await waitForMockAction();
        if (selectedGateway.id === 'gw-3' && nextStatus === 'healthy') {
          throw new Error('健康探针仍未恢复，暂时无法标记为健康。');
        }
        updateGatewayStatus(selectedGatewayId, nextStatus);
      },
    });
  };

  const confirmGatewayDelete = () => {
    if (!selectedGatewayId || !selectedGateway) return;

    executeConsoleAction({
      actionKey: 'delete',
      setPendingAction,
      confirmTitle: '确认删除该实例？',
      confirmContent: `删除 ${selectedGateway.name} 后，将从当前控制台列表中移除。`,
      successMessage: '实例已删除',
      errorMessage: '实例删除失败',
      run: async () => {
        await waitForMockAction();
        if (selectedGateway.id === 'gw-1') {
          throw new Error('核心实例暂不允许删除，请先迁移流量后再重试。');
        }
        removeGateway(selectedGatewayId);
        setSelectedGatewayId(null);
      },
    });
  };

  const columns: ColumnsType<GatewayInstance> = [
    { title: '实例名称', dataIndex: 'name', width: 180 },
    { title: '区域', dataIndex: 'region', width: 180 },
    { title: '接入地址', dataIndex: 'endpoint', width: 240 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: GatewayInstance['status']) => (
        <Tag color={status === 'healthy' ? 'success' : 'warning'}>
          {status === 'healthy' ? '健康' : '关注'}
        </Tag>
      ),
    },
    { title: '版本', dataIndex: 'version', width: 120 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setSelectedGatewayId(record.id)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="网关实例"
      subtitle="统一查看网关实例的区域分布、运行状态与版本情况。"
      extra={<Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>新增实例</Button>}
    >
      <Flex vertical gap={12}>
        <FilterToolbar
          filters={[
            {
              key: 'keyword',
              element: (
                <Input
                  placeholder="搜索实例名称 / 区域 / 地址"
                  prefix={<Search size={14} />}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  allowClear
                />
              ),
            },
            {
              key: 'status',
              element: (
                <Select
                  placeholder="状态筛选"
                  value={status || undefined}
                  onChange={(val) => setStatus(val ?? '')}
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { label: '健康', value: 'healthy' },
                    { label: '关注', value: 'degraded' },
                  ]}
                />
              ),
            },
          ]}
        />

        <DataTableFiltersState
          activeCount={activeFilterCount}
          emptyText="当前显示全部网关实例"
          tags={
            <>
              {keyword ? <Tag color="processing">关键词：{keyword}</Tag> : null}
              {status ? <Tag color="default">状态：{status === 'healthy' ? '健康' : '关注'}</Tag> : null}
            </>
          }
          onClear={clearFilters}
        />

        <DataTableSummary
          total={filteredInstances.length}
          totalLabel="个实例"
          statusText="当前结果已按筛选条件实时更新。"
          statusTag={activeFilterCount > 0 ? <Tag color="processing">筛选已生效</Tag> : <Tag color="success">在线概览</Tag>}
        />
      </Flex>

      <DataTable<GatewayInstance>
        dataSource={filteredInstances}
        columns={columns}
        rowKey="id"
        pagination={false}
        maxHeight={520}
        style={{ marginTop: 16 }}
      />

      <Typography.Text type="secondary" style={{ marginTop: 12 }}>
        后续可继续扩展实例详情、发布记录、证书状态与区域切换能力。
      </Typography.Text>

      <FormModal<GatewayFormValues>
        open={createOpen}
        title="新增实例"
        onCancel={() => setCreateOpen(false)}
        onSubmit={handleCreateGateway}
      >
        <Form.Item name="name" label="实例名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="region" label="区域" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="endpoint" label="接入地址" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="version" label="版本" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </FormModal>

      <Drawer
        title={selectedGateway ? `${selectedGateway.name} 实例详情` : '实例详情'}
        width={480}
        open={selectedGateway !== null}
        onClose={() => setSelectedGatewayId(null)}
      >
        {selectedGateway ? (
          <Flex vertical gap={16}>
            <Tag color={selectedGateway.status === 'healthy' ? 'success' : 'warning'}>
              {selectedGateway.status === 'healthy' ? '健康运行中' : '需重点关注'}
            </Tag>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="实例名称">{selectedGateway.name}</Descriptions.Item>
              <Descriptions.Item label="区域">{selectedGateway.region}</Descriptions.Item>
              <Descriptions.Item label="接入地址">{selectedGateway.endpoint}</Descriptions.Item>
              <Descriptions.Item label="版本">{selectedGateway.version}</Descriptions.Item>
              <Descriptions.Item label="最近健康检查">
                {selectedGateway.status === 'healthy' ? '30 秒前通过' : '2 分钟前出现延迟波动'}
              </Descriptions.Item>
            </Descriptions>
            <Space>
              <Button loading={pendingAction === 'healthy'} onClick={() => confirmGatewayStatusChange('healthy')}>标记健康</Button>
              <Button danger loading={pendingAction === 'degraded'} onClick={() => confirmGatewayStatusChange('degraded')}>标记关注</Button>
              <Button loading={pendingAction === 'delete'} onClick={confirmGatewayDelete}>删除实例</Button>
            </Space>
            <Space direction="vertical" size={4}>
              <Typography.Text strong>下一步建议</Typography.Text>
              <Typography.Text type="secondary">
                {selectedGateway.status === 'healthy'
                  ? '当前实例运行稳定，可继续关注发布记录与证书状态。'
                  : '建议优先检查上游健康探针、证书链和跨区域流量切换策略。'}
              </Typography.Text>
            </Space>
          </Flex>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}
