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
import { useConsoleStore, type RouteRule } from '@/stores/console';
import { executeConsoleAction, waitForMockAction } from '@/utils/console-action';
import type { ColumnsType } from 'antd/es/table';

interface RouteFormValues {
  name: string;
  match: string;
  upstream: string;
  policy: string;
}

export const Route = createFileRoute('/_auth/routes/')({
  component: RouteRulesPage,
  staticData: { breadcrumb: '路由规则' },
});

function RouteRulesPage() {
  const routes = useConsoleStore((s) => s.routes);
  const addRoute = useConsoleStore((s) => s.addRoute);
  const removeRoute = useConsoleStore((s) => s.removeRoute);
  const updateRouteStatus = useConsoleStore((s) => s.updateRouteStatus);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'active' | 'draft' | 'delete' | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const selectedRule = useMemo(
    () => routes.find((item) => item.id === selectedRuleId) ?? null,
    [routes, selectedRuleId],
  );

  const filteredRules = useMemo(() => {
    return routes.filter((item) => {
      const matchesKeyword =
        keyword.trim() === '' ||
        [item.name, item.match, item.upstream, item.policy].some((field) =>
          field.toLowerCase().includes(keyword.trim().toLowerCase()),
        );
      const matchesStatus = status === '' || item.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [routes, keyword, status]);

  const activeFilterCount = Number(Boolean(keyword)) + Number(Boolean(status));

  const clearFilters = () => {
    setKeyword('');
    setStatus('');
  };

  const handleCreateRoute = async (values: RouteFormValues) => {
    addRoute({
      id: `route-${Date.now()}`,
      name: values.name,
      match: values.match,
      upstream: values.upstream,
      policy: values.policy,
      status: 'draft',
    });
    setCreateOpen(false);
  };

  const confirmRuleStatusChange = (nextStatus: RouteRule['status']) => {
    if (!selectedRuleId || !selectedRule) return;

    executeConsoleAction({
      actionKey: nextStatus,
      setPendingAction,
      confirmTitle: nextStatus === 'active' ? '确认启用该规则？' : '确认切换为草稿？',
      confirmContent:
        nextStatus === 'active'
          ? `启用 ${selectedRule.name} 后，流量将按当前策略立即生效。`
          : `将 ${selectedRule.name} 切换为草稿后，该规则将退出当前生效集合。`,
      successMessage: nextStatus === 'active' ? '规则已启用' : '规则已切换为草稿',
      errorMessage: '规则状态更新失败',
      run: async () => {
        await waitForMockAction();
        if (selectedRule.id === 'route-1' && nextStatus === 'draft') {
          throw new Error('billing-v2 当前正在承接核心流量，暂时无法切换为草稿。');
        }
        updateRouteStatus(selectedRuleId, nextStatus);
      },
    });
  };

  const confirmRouteDelete = () => {
    if (!selectedRuleId || !selectedRule) return;

    executeConsoleAction({
      actionKey: 'delete',
      setPendingAction,
      confirmTitle: '确认删除该规则？',
      confirmContent: `删除 ${selectedRule.name} 后，该规则将从当前策略列表中移除。`,
      successMessage: '规则已删除',
      errorMessage: '规则删除失败',
      run: async () => {
        await waitForMockAction();
        if (selectedRule.id === 'route-1') {
          throw new Error('核心计费路由暂不允许删除，请先切换流量。');
        }
        removeRoute(selectedRuleId);
        setSelectedRuleId(null);
      },
    });
  };

  const columns: ColumnsType<RouteRule> = [
    { title: '规则名称', dataIndex: 'name', width: 180 },
    { title: '匹配规则', dataIndex: 'match', width: 220 },
    { title: '上游服务', dataIndex: 'upstream', width: 180 },
    { title: '策略组合', dataIndex: 'policy', width: 180 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: RouteRule['status']) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '已启用' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setSelectedRuleId(record.id)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="路由规则"
      subtitle="统一维护请求匹配规则、上游转发目标与附加访问策略。"
      extra={<Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>新增规则</Button>}
    >
      <Flex vertical gap={12}>
        <FilterToolbar
          filters={[
            {
              key: 'keyword',
              element: (
                <Input
                  placeholder="搜索规则名称 / 匹配规则 / 上游服务"
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
                    { label: '已启用', value: 'active' },
                    { label: '草稿', value: 'draft' },
                  ]}
                />
              ),
            },
          ]}
        />

        <DataTableFiltersState
          activeCount={activeFilterCount}
          emptyText="当前显示全部路由规则"
          tags={
            <>
              {keyword ? <Tag color="processing">关键词：{keyword}</Tag> : null}
              {status ? <Tag color="default">状态：{status === 'active' ? '已启用' : '草稿'}</Tag> : null}
            </>
          }
          onClear={clearFilters}
        />

        <DataTableSummary
          total={filteredRules.length}
          totalLabel="条规则"
          statusText="当前结果已按筛选条件实时更新。"
          statusTag={activeFilterCount > 0 ? <Tag color="processing">筛选已生效</Tag> : <Tag color="processing">策略编排</Tag>}
        />
      </Flex>

      <DataTable<RouteRule>
        dataSource={filteredRules}
        columns={columns}
        rowKey="id"
        pagination={false}
        maxHeight={520}
        style={{ marginTop: 16 }}
      />

      <Typography.Text type="secondary" style={{ marginTop: 12 }}>
        后续可继续扩展灰度发布、优先级排序、调试与命中预览能力。
      </Typography.Text>

      <FormModal<RouteFormValues>
        open={createOpen}
        title="新增规则"
        onCancel={() => setCreateOpen(false)}
        onSubmit={handleCreateRoute}
      >
        <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="match" label="匹配规则" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="upstream" label="上游服务" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="policy" label="策略组合" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </FormModal>

      <Drawer
        title={selectedRule ? `${selectedRule.name} 规则详情` : '规则详情'}
        width={480}
        open={selectedRule !== null}
        onClose={() => setSelectedRuleId(null)}
      >
        {selectedRule ? (
          <Flex vertical gap={16}>
            <Tag color={selectedRule.status === 'active' ? 'success' : 'default'}>
              {selectedRule.status === 'active' ? '规则已启用' : '当前为草稿'}
            </Tag>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="规则名称">{selectedRule.name}</Descriptions.Item>
              <Descriptions.Item label="匹配规则">{selectedRule.match}</Descriptions.Item>
              <Descriptions.Item label="上游服务">{selectedRule.upstream}</Descriptions.Item>
              <Descriptions.Item label="策略组合">{selectedRule.policy}</Descriptions.Item>
              <Descriptions.Item label="最近变更">2 小时前由 admin 更新</Descriptions.Item>
            </Descriptions>
            <Space>
              <Button type="primary" loading={pendingAction === 'active'} onClick={() => confirmRuleStatusChange('active')}>启用规则</Button>
              <Button loading={pendingAction === 'draft'} onClick={() => confirmRuleStatusChange('draft')}>切换草稿</Button>
              <Button loading={pendingAction === 'delete'} onClick={confirmRouteDelete}>删除规则</Button>
            </Space>
            <Space direction="vertical" size={4}>
              <Typography.Text strong>下一步建议</Typography.Text>
              <Typography.Text type="secondary">
                {selectedRule.status === 'active'
                  ? '可继续检查灰度比例、回源健康与限流阈值是否仍符合当前流量特征。'
                  : '建议在发布前完成调试、预览命中结果，并确认策略链顺序符合预期。'}
              </Typography.Text>
            </Space>
          </Flex>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}
