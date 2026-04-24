import { keyApi, type ApiKey, type KeyCreate, type KeyTestResponse } from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { Plus, Trash2 } from '@/core/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/keys/')({
  component: KeysPage,
  staticData: { breadcrumb: '模型密钥' },
});

const PROVIDER_PRESETS = [
  { label: 'OpenAI', value: 'openai', api_base: '' },
  { label: 'Anthropic', value: 'anthropic', api_base: '' },
  { label: 'DeepSeek', value: 'deepseek', api_base: '' },
  { label: '智谱 BigModel', value: 'zhipu', api_base: 'https://open.bigmodel.cn/api/paas/v4' },
  { label: 'Moonshot', value: 'moonshot', api_base: 'https://api.moonshot.cn/v1' },
  { label: '阿里通义', value: 'qwen', api_base: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { label: 'Ollama 本地', value: 'ollama', api_base: 'http://localhost:11434/v1' },
  { label: '其他（OpenAI 兼容）', value: 'custom', api_base: '' },
];

function KeysPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const { data, isLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: () => keyApi.list(),
  });

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<KeyCreate>();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<KeyTestResponse | null>(null);

  const createMut = useMutation({
    mutationFn: (data: KeyCreate) => keyApi.create(data),
    onSuccess: () => {
      message.success('已创建');
      qc.invalidateQueries({ queryKey: ['keys'] });
      handleClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => keyApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['keys'] });
    },
  });

  function handleClose() {
    setOpen(false);
    form.resetFields();
    setTestResult(null);
  }

  async function handleTest() {
    const values = form.getFieldsValue();
    if (!values.api_key) {
      message.warning('请先填写 API Key');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await keyApi.test({
        api_key: values.api_key,
        api_base: values.api_base ?? null,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        model: null,
        latency_ms: null,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    createMut.mutate(values);
  }

  function handleProviderChange(v: string) {
    const preset = PROVIDER_PRESETS.find((p) => p.value === v);
    if (preset?.api_base) form.setFieldValue('api_base', preset.api_base);
  }

  const columns: ColumnsType<ApiKey> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name', width: 200 },
    {
      title: '厂商',
      dataIndex: 'provider',
      width: 140,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '密钥（脱敏）',
      dataIndex: 'api_key_masked',
      width: 200,
      render: (v: string) => <code>{v}</code>,
    },
    { title: 'API Base', dataIndex: 'api_base', ellipsis: true },
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
        <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate(r.id)}>
          <Button type="link" danger icon={<Trash2 size={14} />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <PageContainer
      title="模型密钥"
      subtitle="管理你的大模型 API Key。密钥使用 Fernet 加密存储，列表中仅展示脱敏形式。"
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
          新增密钥
        </Button>
      }
    >
      <Table<ApiKey>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={open}
        title="新增密钥"
        onOk={handleSubmit}
        onCancel={handleClose}
        confirmLoading={createMut.isPending}
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ provider: 'openai' }}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如：OpenAI 生产 Key" />
          </Form.Item>
          <Form.Item name="provider" label="厂商" rules={[{ required: true }]}>
            <Select options={PROVIDER_PRESETS} onChange={handleProviderChange} />
          </Form.Item>
          <Form.Item name="api_key" label="API Key" rules={[{ required: true }]}>
            <Input.Password placeholder="sk-xxxxxxxx" />
          </Form.Item>
          <Form.Item
            name="api_base"
            label="API Base（可选，非 OpenAI 原生时填写）"
            tooltip="智谱/Moonshot/Ollama 等需要填写自定义端点"
          >
            <Input placeholder="https://..." allowClear />
          </Form.Item>
          <Form.Item label="连通性" tooltip="发送一条最小消息验活，不落库">
            <Space wrap>
              <Button onClick={handleTest} loading={testing}>
                测试连通性
              </Button>
              {testResult && (
                <Tag color={testResult.ok ? 'success' : 'error'}>
                  {testResult.message}
                  {testResult.latency_ms !== null && ` · ${testResult.latency_ms}ms`}
                </Tag>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
