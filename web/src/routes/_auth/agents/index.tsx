import {
    agentApi,
    keyApi,
    mcpApi,
    promptApi,
    type Agent,
    type AgentCreate,
    type McpServer,
} from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { MessageSquare, Pencil, Plus, Trash2, Wrench } from '@/core/icons';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
    App,
    Button,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Slider,
    Space,
    Table,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

export const Route = createFileRoute('/_auth/agents/')({
  component: AgentsPage,
  staticData: { breadcrumb: '智能体' },
});

const MODEL_SUGGESTIONS = [
  { label: 'OpenAI · gpt-4o-mini', value: 'gpt-4o-mini' },
  { label: 'OpenAI · gpt-4o', value: 'gpt-4o' },
  { label: 'Anthropic · claude-3-5-sonnet', value: 'claude-3-5-sonnet-20241022' },
  { label: 'DeepSeek · chat', value: 'deepseek/deepseek-chat' },
  { label: '智谱 · glm-4.5 (openai/)', value: 'openai/glm-4.5' },
  { label: 'Moonshot · v1-8k (openai/)', value: 'openai/moonshot-v1-8k' },
  { label: 'Ollama · llama3.2 (openai/)', value: 'openai/llama3.2' },
];

function AgentsPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();

  const agentsQ = useQuery({ queryKey: ['agents'], queryFn: () => agentApi.list() });
  const promptsQ = useQuery({ queryKey: ['prompts'], queryFn: () => promptApi.list() });
  const keysQ = useQuery({ queryKey: ['keys'], queryFn: () => keyApi.list() });
  const mcpsQ = useQuery({ queryKey: ['mcp-servers'], queryFn: () => mcpApi.list() });

  // 批量拉取每个 agent 当前绑定的 MCP server id 列表，用于表格里显示「工具 · N」
  const bindingQueries = useQueries({
    queries: (agentsQ.data ?? []).map((a) => ({
      queryKey: ['agent-tools', a.id],
      queryFn: () => mcpApi.listAgentBindings(a.id),
      staleTime: 30_000,
    })),
  });
  const bindingByAgent = useMemo(() => {
    const m = new Map<number, number[]>();
    (agentsQ.data ?? []).forEach((a, idx) => {
      m.set(a.id, (bindingQueries[idx]?.data ?? []).map((s) => s.id));
    });
    return m;
  }, [agentsQ.data, bindingQueries]);

  const promptMap = useMemo(
    () => new Map((promptsQ.data ?? []).map((p) => [p.id, p.name])),
    [promptsQ.data],
  );
  const keyMap = useMemo(
    () => new Map((keysQ.data ?? []).map((k) => [k.id, `${k.name} (${k.provider})`])),
    [keysQ.data],
  );

  const [editing, setEditing] = useState<Agent | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<AgentCreate>();
  const [toolIds, setToolIds] = useState<number[]>([]);

  const bindToolsMut = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) =>
      mcpApi.updateAgentBindings(id, ids),
    onSuccess: (_, { id }) =>
      qc.invalidateQueries({ queryKey: ['agent-tools', id] }),
  });

  const createMut = useMutation({
    mutationFn: (data: AgentCreate) => agentApi.create(data),
    onSuccess: async (created) => {
      if (toolIds.length > 0) {
        await bindToolsMut.mutateAsync({ id: created.id, ids: toolIds });
      }
      message.success('已创建');
      qc.invalidateQueries({ queryKey: ['agents'] });
      handleClose();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AgentCreate }) =>
      agentApi.update(id, data),
    onSuccess: async (_, { id }) => {
      await bindToolsMut.mutateAsync({ id, ids: toolIds });
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['agents'] });
      handleClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => agentApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  function handleOpen(a?: Agent) {
    setEditing(a ?? null);
    setToolIds(a ? (bindingByAgent.get(a.id) ?? []) : []);
    form.setFieldsValue(
      a
        ? {
            name: a.name,
            description: a.description ?? '',
            prompt_id: a.prompt_id,
            key_id: a.key_id,
            model: a.model,
            temperature: a.temperature,
            max_tokens: a.max_tokens,
          }
        : {
            name: '',
            description: '',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 2048,
          },
    );
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setEditing(null);
    setToolIds([]);
    form.resetFields();
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editing) updateMut.mutate({ id: editing.id, data: values });
    else createMut.mutate(values);
  }

  const columns: ColumnsType<Agent> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '名称', dataIndex: 'name', width: 180 },
    {
      title: '模型',
      dataIndex: 'model',
      width: 200,
      render: (v: string) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: '提示词',
      dataIndex: 'prompt_id',
      width: 160,
      render: (id: number) => promptMap.get(id) ?? `#${id}`,
    },
    {
      title: '密钥',
      dataIndex: 'key_id',
      width: 180,
      render: (id: number) => keyMap.get(id) ?? `#${id}`,
    },
    {
      title: '参数',
      width: 140,
      render: (_, r) => (
        <span style={{ color: '#666', fontSize: 12 }}>
          T={r.temperature} · max={r.max_tokens}
        </span>
      ),
    },
    {
      title: 'MCP 工具',
      key: 'tools',
      width: 140,
      render: (_, r) => {
        const ids = bindingByAgent.get(r.id) ?? [];
        if (ids.length === 0) {
          return <span style={{ color: '#aaa', fontSize: 12 }}>未绑定</span>;
        }
        return (
          <Tag color="cyan" icon={<Wrench size={12} />}>
            {ids.length} 个
          </Tag>
        );
      },
    },
    {
      title: '操作',
      width: 240,
      render: (_, r) => (
        <Space>
          <Link to="/chat/$agentId" params={{ agentId: String(r.id) }}>
            <Button type="link" icon={<MessageSquare size={14} />}>
              对话
            </Button>
          </Link>
          <Button type="link" icon={<Pencil size={14} />} onClick={() => handleOpen(r)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button type="link" danger icon={<Trash2 size={14} />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="智能体"
      subtitle="把提示词 + 模型 + 密钥组装成可对话的智能体。"
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={() => handleOpen()}>
          新建智能体
        </Button>
      }
    >
      <Table<Agent>
        rowKey="id"
        loading={agentsQ.isLoading}
        dataSource={agentsQ.data ?? []}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={open}
        title={editing ? '编辑智能体' : '新建智能体'}
        onOk={handleSubmit}
        onCancel={handleClose}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnHidden
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如：客服机器人" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="一句话说明该智能体的用途（可选）" />
          </Form.Item>
          <Form.Item name="prompt_id" label="提示词" rules={[{ required: true }]}>
            <Select
              placeholder="选择一个提示词"
              options={(promptsQ.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="key_id" label="密钥" rules={[{ required: true }]}>
            <Select
              placeholder="选择一个密钥"
              options={(keysQ.data ?? []).map((k) => ({
                label: `${k.name}（${k.provider}）`,
                value: k.id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="model"
            label="模型（LiteLLM 格式）"
            tooltip="OpenAI 原生直接写模型名；其它厂商走 OpenAI 兼容时加 openai/ 前缀"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              allowClear
              options={MODEL_SUGGESTIONS}
              placeholder="gpt-4o-mini / openai/glm-4.5 / ..."
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="temperature" label="Temperature">
            <Slider min={0} max={2} step={0.1} marks={{ 0: '0', 1: '1', 2: '2' }} />
          </Form.Item>
          <Form.Item name="max_tokens" label="最大输出 tokens">
            <InputNumber min={1} max={32000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="MCP 工具（可选）"
            tooltip="绑定 MCP server 后，该 Agent 在对话时可自动调用其工具；对话请求会临时切换为非流式以支持多轮 tool call 循环。"
          >
            <Select<number[]>
              mode="multiple"
              placeholder={(mcpsQ.data ?? []).length === 0 ? '还没有 MCP server，先去「MCP 工具」页面新建' : '选择要绑定的 MCP server'}
              value={toolIds}
              onChange={setToolIds}
              options={(mcpsQ.data ?? []).map((s: McpServer) => ({
                label: `${s.name}（${s.transport}${s.enabled ? '' : ' · 已停用'}）`,
                value: s.id,
                disabled: !s.enabled,
              }))}
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
