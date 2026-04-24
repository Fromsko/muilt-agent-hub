import { createFileRoute } from '@tanstack/react-router';
import { Button, Descriptions, Drawer, Form, Input, Select, Tag, Typography, Flex, Space } from 'antd';
import { useMemo, useState } from 'react';
import { AlertListCard } from '@/components/AlertListCard';
import { PageContainer } from '@/components/PageContainer';
import { DataTableFiltersState } from '@/components/DataTable/DataTableFiltersState';
import { DataTableSummary } from '@/components/DataTable/DataTableSummary';
import { FilterToolbar } from '@/components/FilterToolbar';
import { FormModal } from '@/components/FormModal';
import { Plus } from '@/core/icons';
import { useConsoleStore, type AlertItem } from '@/stores/console';
import { executeConsoleAction, waitForMockAction } from '@/utils/console-action';

interface AlertFormValues {
  title: string;
  description: string;
  source: string;
  type: AlertItem['type'];
}

export const Route = createFileRoute('/_auth/alerts/')({
  component: AlertsPage,
  staticData: { breadcrumb: '告警中心' },
});

function AlertsPage() {
  const alerts = useConsoleStore((s) => s.alerts);
  const addAlert = useConsoleStore((s) => s.addAlert);
  const removeAlert = useConsoleStore((s) => s.removeAlert);
  const updateAlertType = useConsoleStore((s) => s.updateAlertType);
  const [type, setType] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'info' | 'warning' | 'error' | 'delete' | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const selectedAlert = useMemo(
    () => alerts.find((item) => item.id === selectedAlertId) ?? null,
    [alerts, selectedAlertId],
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      const matchesType = type === '' || item.type === type;
      const matchesSource = source === '' || item.source === source;
      return matchesType && matchesSource;
    });
  }, [alerts, type, source]);

  const activeFilterCount = Number(Boolean(type)) + Number(Boolean(source));

  const clearFilters = () => {
    setType('');
    setSource('');
  };

  const handleCreateAlert = async (values: AlertFormValues) => {
    addAlert({
      id: `alert-${Date.now()}`,
      title: values.title,
      description: values.description,
      source: values.source,
      type: values.type,
    });
    setCreateOpen(false);
  };

  const confirmAlertTypeChange = (nextType: AlertItem['type']) => {
    if (!selectedAlertId || !selectedAlert) return;

    executeConsoleAction({
      actionKey: nextType,
      setPendingAction,
      confirmTitle:
        nextType === 'info'
          ? '确认标记为已处理？'
          : nextType === 'warning'
            ? '确认降级为警告？'
            : '确认升级为错误？',
      confirmContent:
        nextType === 'info'
          ? `将 ${selectedAlert.title} 标记为已处理后，列表级别会同步更新。`
          : nextType === 'warning'
            ? `将 ${selectedAlert.title} 调整为警告后，仍会保留在重点告警视图中。`
            : `将 ${selectedAlert.title} 升级为错误后，团队需要立即处理该告警。`,
      successMessage:
        nextType === 'info'
          ? '告警已标记为已处理'
          : nextType === 'warning'
            ? '告警已降级为警告'
            : '告警已升级为错误',
      errorMessage: '告警状态更新失败',
      run: async () => {
        await waitForMockAction();
        if (selectedAlert.id === 'alert-2' && nextType === 'info') {
          throw new Error('高优先级流量异常仍在持续，暂时不能直接标记为已处理。');
        }
        updateAlertType(selectedAlertId, nextType);
      },
    });
  };

  const confirmAlertDelete = () => {
    if (!selectedAlertId || !selectedAlert) return;

    executeConsoleAction({
      actionKey: 'delete',
      setPendingAction,
      confirmTitle: '确认关闭该告警？',
      confirmContent: `关闭 ${selectedAlert.title} 后，将从当前告警列表中移除。`,
      successMessage: '告警已关闭',
      errorMessage: '告警关闭失败',
      run: async () => {
        await waitForMockAction();
        if (selectedAlert.id === 'alert-2') {
          throw new Error('核心流量异常仍在持续，暂时不能直接关闭该告警。');
        }
        removeAlert(selectedAlertId);
        setSelectedAlertId(null);
      },
    });
  };

  const detailItems = filteredAlerts.map((item) => ({
    ...item,
    title: (
      <Flex align="center" justify="space-between" gap={12}>
        <span>{item.title}</span>
        <Button type="link" size="small" onClick={() => setSelectedAlertId(item.id)}>
          查看详情
        </Button>
      </Flex>
    ),
  }));

  return (
    <PageContainer
      title="告警中心"
      subtitle="集中查看当前需要关注的运行异常、证书风险与安全策略命中情况。"
      extra={<Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>新增告警</Button>}
    >
      <Flex vertical gap={12}>
        <FilterToolbar
          filters={[
            {
              key: 'type',
              element: (
                <Select
                  placeholder="级别筛选"
                  value={type || undefined}
                  onChange={(val) => setType(val ?? '')}
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { label: '信息', value: 'info' },
                    { label: '警告', value: 'warning' },
                    { label: '错误', value: 'error' },
                  ]}
                />
              ),
            },
            {
              key: 'source',
              element: (
                <Select
                  placeholder="来源筛选"
                  value={source || undefined}
                  onChange={(val) => setSource(val ?? '')}
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { label: '网关实例', value: '网关实例' },
                    { label: '流量治理', value: '流量治理' },
                    { label: '证书管理', value: '证书管理' },
                  ]}
                />
              ),
            },
          ]}
        />

        <DataTableFiltersState
          activeCount={activeFilterCount}
          emptyText="当前显示全部重点告警"
          tags={
            <>
              {type ? <Tag color="processing">级别：{type === 'info' ? '信息' : type === 'warning' ? '警告' : '错误'}</Tag> : null}
              {source ? <Tag color="default">来源：{source}</Tag> : null}
            </>
          }
          onClear={clearFilters}
        />

        <DataTableSummary
          total={filteredAlerts.length}
          totalLabel="条告警"
          statusText="当前列表展示最近一次同步后的告警结果。"
          statusTag={activeFilterCount > 0 ? <Tag color="processing">筛选已生效</Tag> : <Tag color="error">需重点关注</Tag>}
        />
      </Flex>

      <div style={{ marginTop: 16 }}>
        <AlertListCard title="当前告警" items={detailItems} />
      </div>

      <Typography.Text type="secondary" style={{ marginTop: 12 }}>
        后续可继续扩展告警静默、指派、升级与通知渠道配置能力。
      </Typography.Text>

      <FormModal<AlertFormValues>
        open={createOpen}
        title="新增告警"
        onCancel={() => setCreateOpen(false)}
        onSubmit={handleCreateAlert}
      >
        <Form.Item name="title" label="告警标题" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="告警描述" rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="source" label="来源模块" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="告警级别" rules={[{ required: true }]}>
          <Select
            options={[
              { label: '信息', value: 'info' },
              { label: '警告', value: 'warning' },
              { label: '错误', value: 'error' },
            ]}
          />
        </Form.Item>
      </FormModal>

      <Drawer
        title={selectedAlert ? `${selectedAlert.title} · 告警详情` : '告警详情'}
        width={480}
        open={selectedAlert !== null}
        onClose={() => setSelectedAlertId(null)}
      >
        {selectedAlert ? (
          <Flex vertical gap={16}>
            <Tag color={selectedAlert.type === 'error' ? 'error' : selectedAlert.type === 'warning' ? 'warning' : 'processing'}>
              {selectedAlert.type === 'error' ? '错误级别' : selectedAlert.type === 'warning' ? '警告级别' : '信息级别'}
            </Tag>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="告警标题">{selectedAlert.title}</Descriptions.Item>
              <Descriptions.Item label="来源模块">{selectedAlert.source}</Descriptions.Item>
              <Descriptions.Item label="当前描述">{selectedAlert.description}</Descriptions.Item>
              <Descriptions.Item label="最近触发时间">5 分钟前</Descriptions.Item>
            </Descriptions>
            <Space>
              <Button loading={pendingAction === 'info'} onClick={() => confirmAlertTypeChange('info')}>标记已处理</Button>
              <Button loading={pendingAction === 'warning'} onClick={() => confirmAlertTypeChange('warning')}>降级为警告</Button>
              <Button danger loading={pendingAction === 'error'} onClick={() => confirmAlertTypeChange('error')}>升级为错误</Button>
              <Button loading={pendingAction === 'delete'} onClick={confirmAlertDelete}>关闭告警</Button>
            </Space>
            <Space direction="vertical" size={4}>
              <Typography.Text strong>建议动作</Typography.Text>
              <Typography.Text type="secondary">
                {selectedAlert.type === 'error'
                  ? '建议立即检查对应服务、实例或策略的异常波动，并确认是否需要升级告警级别。'
                  : selectedAlert.type === 'warning'
                    ? '建议在短时间内持续观察相关指标变化，必要时联动服务负责人排查。'
                    : '建议记录并安排后续窗口处理，避免演变为更高优先级问题。'}
              </Typography.Text>
            </Space>
          </Flex>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}
