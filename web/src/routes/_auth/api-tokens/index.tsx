import {
    apiTokenApi,
    type ApiTokenRead,
    type ApiTokenReadWithSecret,
} from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { Copy, Plus, Trash2 } from '@/core/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
    Alert,
    App,
    Button,
    Form,
    Input,
    Modal,
    Popconfirm,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/api-tokens/')({
  component: ApiTokensPage,
  staticData: { breadcrumb: 'API Token' },
});

function ApiTokensPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => apiTokenApi.list(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<{ name: string }>();
  const [revealed, setRevealed] = useState<ApiTokenReadWithSecret | null>(null);

  const createMut = useMutation({
    mutationFn: (name: string) => apiTokenApi.create(name),
    onSuccess: (res) => {
      setRevealed(res);
      setCreateOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiTokenApi.setEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-tokens'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiTokenApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('剪贴板不可用，请手动复制');
    }
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    createMut.mutate(values.name);
  }

  const columns: ColumnsType<ApiTokenRead> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '名称', dataIndex: 'name', width: 220 },
    {
      title: 'Token',
      key: 'preview',
      width: 220,
      render: (_, r) => (
        <code>
          {r.prefix}
          {'*'.repeat(20)}
          {r.tail}
        </code>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 110,
      render: (v: boolean, r) => (
        <Switch
          checked={v}
          loading={toggleMut.isPending}
          onChange={(val) => toggleMut.mutate({ id: r.id, enabled: val })}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
    {
      title: '最近使用',
      dataIndex: 'last_used_at',
      width: 180,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleString() : <Typography.Text type="secondary">从未</Typography.Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作',
      width: 100,
      render: (_, r) => (
        <Popconfirm title="确认删除该 Token？外部调用将立即失效" onConfirm={() => deleteMut.mutate(r.id)}>
          <Button type="link" danger icon={<Trash2 size={14} />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <PageContainer
      title="API Token"
      subtitle="为外部系统签发访问凭证。Token 可直接调用 /api/v1/public/ 路由，不需要走 JWT 登录流程。"
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          新建 Token
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="Token 仅在创建时显示一次明文，请务必立即保存；丢失后只能重新生成。"
      />

      <Table<ApiTokenRead>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={createOpen}
        title="新建 API Token"
        onOk={handleSubmit}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMut.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：线上 Webhook / n8n 集成 / iOS App" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={revealed !== null}
        title="Token 已创建"
        onCancel={() => setRevealed(null)}
        onOk={() => setRevealed(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="我已保存"
        destroyOnHidden
        width={640}
      >
        {revealed && (
          <Space orientation="vertical" style={{ width: '100%' }} size={16}>
            <Alert
              type="warning"
              showIcon
              title="此 Token 不会再次完整显示，请立刻复制并妥善保存。"
            />
            <div>
              <Typography.Text strong>明文 Token：</Typography.Text>
              <Input.TextArea
                value={revealed.token}
                readOnly
                autoSize
                onFocus={(e) => e.currentTarget.select()}
                style={{ fontFamily: 'monospace', marginTop: 6 }}
              />
              <Button
                icon={<Copy size={14} />}
                style={{ marginTop: 8 }}
                onClick={() => handleCopy(revealed.token)}
              >
                复制到剪贴板
              </Button>
            </div>
            <div>
              <Typography.Text strong>使用示例（curl）：</Typography.Text>
              <Input.TextArea
                readOnly
                autoSize
                style={{ fontFamily: 'monospace', marginTop: 6 }}
                value={`curl -X POST http://127.0.0.1:8000/api/v1/public/agents/<AGENT_ID>/chat \\
  -H 'Authorization: Bearer ${revealed.token}' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"hi","stream":false}'`}
              />
            </div>
            <Tag color="blue">{revealed.prefix}...{revealed.tail}</Tag>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
