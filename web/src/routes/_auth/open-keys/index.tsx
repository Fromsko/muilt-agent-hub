import {
  agentApi,
  openKeyApi,
  type Agent,
  type OpenKeyRead,
  type OpenKeyReadWithSecret,
} from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { Copy, Plus, Trash2 } from '@/core/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/open-keys/')({
  component: OpenKeysPage,
  staticData: { breadcrumb: '开放密钥' },
});

interface CreateForm {
  name: string;
  allowed_agent_ids: number[];
  rate_limit_per_minute: number | null;
  quota_total: number | null;
  expires_at: dayjs.Dayjs | null;
}

function OpenKeysPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ['open-keys'],
    queryFn: () => openKeyApi.list(),
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentApi.list(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<CreateForm>();
  const [revealed, setRevealed] = useState<OpenKeyReadWithSecret | null>(null);

  const createMut = useMutation({
    mutationFn: (values: CreateForm) =>
      openKeyApi.create({
        name: values.name,
        allowed_agent_ids: values.allowed_agent_ids ?? [],
        rate_limit_per_minute: values.rate_limit_per_minute ?? undefined,
        quota_total: values.quota_total ?? undefined,
        expires_at: values.expires_at?.toISOString() ?? undefined,
      }),
    onSuccess: (res) => {
      setRevealed(res);
      setCreateOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['open-keys'] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      openKeyApi.update(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['open-keys'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => openKeyApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['open-keys'] });
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
    createMut.mutate(values);
  }

  function agentName(id: number): string {
    const agent = agents?.find((a: Agent) => a.id === id);
    return agent ? agent.name : `Agent #${id}`;
  }

  const columns: ColumnsType<OpenKeyRead> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', width: 180 },
    {
      title: 'Key',
      key: 'preview',
      width: 200,
      render: (_, r) => (
        <code>
          {r.prefix}{'*'.repeat(16)}{r.tail}
        </code>
      ),
    },
    {
      title: '绑定 Agent',
      key: 'agents',
      width: 200,
      render: (_, r) =>
        r.allowed_agent_ids.length === 0 ? (
          <Tag color="green">全部</Tag>
        ) : (
          <Space size={4} wrap>
            {r.allowed_agent_ids.map((id) => (
              <Tag key={id}>{agentName(id)}</Tag>
            ))}
          </Space>
        ),
    },
    {
      title: '限额',
      key: 'quota',
      width: 120,
      render: (_, r) =>
        r.quota_total ? (
          <span>
            {r.quota_used}/{r.quota_total}
          </span>
        ) : (
          <Typography.Text type="secondary">不限</Typography.Text>
        ),
    },
    {
      title: '频率',
      key: 'rate',
      width: 100,
      render: (_, r) =>
        r.rate_limit_per_minute ? (
          `${r.rate_limit_per_minute}/分`
        ) : (
          <Typography.Text type="secondary">不限</Typography.Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
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
      title: '过期时间',
      dataIndex: 'expires_at',
      width: 160,
      render: (v: string | null) => {
        if (!v) return <Typography.Text type="secondary">永不</Typography.Text>;
        const d = new Date(v);
        const expired = d < new Date();
        return expired ? (
          <Typography.Text type="danger">{d.toLocaleString()} (已过期)</Typography.Text>
        ) : (
          d.toLocaleString()
        );
      },
    },
    {
      title: '最近使用',
      dataIndex: 'last_used_at',
      width: 160,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleString() : <Typography.Text type="secondary">从未</Typography.Text>,
    },
    {
      title: '操作',
      width: 80,
      render: (_, r) => (
        <Popconfirm title="确认删除？外部调用将立即失效" onConfirm={() => deleteMut.mutate(r.id)}>
          <Button type="link" danger icon={<Trash2 size={14} />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <PageContainer
      title="开放密钥（OpenKey）"
      subtitle="为外部系统签发 OpenAI 兼容的 API Key。持有者可通过 /v1/chat/completions 调用指定 Agent。"
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          新建 OpenKey
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="OpenKey 仅在创建时显示一次明文，请务必立即保存。丢失后只能删除后重新创建。"
      />

      <Table<OpenKeyRead>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1400 }}
      />

      {/* 创建弹窗 */}
      <Modal
        open={createOpen}
        title="新建 OpenKey"
        onOk={handleSubmit}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMut.isPending}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" initialValues={{ allowed_agent_ids: [] }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：给张三的测试 Key / n8n 集成" />
          </Form.Item>
          <Form.Item name="allowed_agent_ids" label="绑定 Agent（留空 = 全部可用）">
            <Select
              mode="multiple"
              placeholder="选择允许调用的 Agent"
              options={(agents ?? []).map((a: Agent) => ({
                label: `${a.name} (#${a.id})`,
                value: a.id,
              }))}
              allowClear
            />
          </Form.Item>
          <Form.Item name="rate_limit_per_minute" label="每分钟调用上限（不填 = 不限）">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="如：60" />
          </Form.Item>
          <Form.Item name="quota_total" label="总调用次数上限（不填 = 不限）">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="如：10000" />
          </Form.Item>
          <Form.Item name="expires_at" label="过期时间（不填 = 永不过期）">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建成功：展示明文 Key */}
      <Modal
        open={revealed !== null}
        title="OpenKey 已创建"
        onCancel={() => setRevealed(null)}
        onOk={() => setRevealed(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="我已保存"
        destroyOnHidden
        width={680}
      >
        {revealed && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Alert
              type="warning"
              showIcon
              message="此 Key 不会再次完整显示，请立刻复制并妥善保存。"
            />
            <div>
              <Typography.Text strong>明文 Key：</Typography.Text>
              <Input.TextArea
                value={revealed.key}
                readOnly
                autoSize
                onFocus={(e) => e.currentTarget.select()}
                style={{ fontFamily: 'monospace', marginTop: 6 }}
              />
              <Button
                icon={<Copy size={14} />}
                style={{ marginTop: 8 }}
                onClick={() => handleCopy(revealed.key)}
              >
                复制到剪贴板
              </Button>
            </div>
            <div>
              <Typography.Text strong>使用示例（OpenAI SDK）：</Typography.Text>
              <Input.TextArea
                readOnly
                autoSize
                style={{ fontFamily: 'monospace', marginTop: 6 }}
                value={`from openai import OpenAI

client = OpenAI(
    api_key="${revealed.key}",
    base_url="http://127.0.0.1:8000/v1",
)

response = client.chat.completions.create(
    model="agent-<AGENT_ID>",
    messages=[{"role": "user", "content": "hello"}],
)`}
              />
            </div>
            <div>
              <Typography.Text strong>使用示例（curl）：</Typography.Text>
              <Input.TextArea
                readOnly
                autoSize
                style={{ fontFamily: 'monospace', marginTop: 6 }}
                value={`curl -X POST http://127.0.0.1:8000/v1/chat/completions \\
  -H 'Authorization: Bearer ${revealed.key}' \\
  -H 'Content-Type: application/json' \\
  -d '{"model":"agent-<AGENT_ID>","messages":[{"role":"user","content":"hi"}],"stream":false}'`}
              />
            </div>
            <Tag color="blue">{revealed.prefix}...{revealed.tail}</Tag>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
