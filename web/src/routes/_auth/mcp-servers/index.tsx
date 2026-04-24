import {
    mcpApi,
    type McpServer,
    type McpServerCreate,
    type McpToolInfo,
} from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { Plus, RefreshCw, Trash2, Wrench } from '@/core/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
    Alert,
    App,
    Button,
    Drawer,
    Form,
    Input,
    Modal,
    Popconfirm,
    Radio,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/mcp-servers/')({
  component: McpServersPage,
  staticData: { breadcrumb: 'MCP 工具' },
});

interface FormValues {
  name: string;
  transport: 'http' | 'stdio';
  server_url?: string;
  command_json?: string;
  auth_token?: string;
}

function McpServersPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => mcpApi.list(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [toolsDrawer, setToolsDrawer] = useState<{
    server: McpServer;
    tools: McpToolInfo[];
  } | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: McpServerCreate) => mcpApi.create(payload),
    onSuccess: () => {
      setCreateOpen(false);
      form.resetFields();
      message.success('已创建');
      qc.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      mcpApi.update(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => mcpApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });

  const discoverMut = useMutation({
    mutationFn: (server: McpServer) =>
      mcpApi.discover(server.id).then((tools) => ({ server, tools })),
    onSuccess: ({ server, tools }) => {
      setToolsDrawer({ server, tools });
    },
    onError: (error: Error) =>
      message.error(`连接失败：${error.message.slice(0, 200)}`),
  });

  async function handleSubmit() {
    const values = await form.validateFields();
    const payload: McpServerCreate = {
      name: values.name,
      transport: values.transport,
      server_url: values.transport === 'http' ? values.server_url : null,
      command_json: values.transport === 'stdio' ? values.command_json : null,
      auth_token: values.auth_token || null,
    };
    createMut.mutate(payload);
  }

  const columns: ColumnsType<McpServer> = [
    { title: 'ID', dataIndex: 'id', width: 64 },
    { title: '名称', dataIndex: 'name', width: 180 },
    {
      title: '传输',
      dataIndex: 'transport',
      width: 90,
      render: (v: string) => (
        <Tag color={v === 'http' ? 'blue' : 'purple'}>{v}</Tag>
      ),
    },
    {
      title: '连接信息',
      key: 'endpoint',
      render: (_, r) =>
        r.transport === 'http' ? (
          <code style={{ fontSize: 12 }}>{r.server_url}</code>
        ) : (
          <code style={{ fontSize: 12 }}>{r.command_json}</code>
        ),
    },
    {
      title: '鉴权',
      dataIndex: 'has_auth_token',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="green">Bearer</Tag> : <Tag>无</Tag>,
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
      title: '操作',
      key: 'ops',
      width: 220,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<Wrench size={14} />}
            loading={discoverMut.isPending}
            onClick={() => discoverMut.mutate(r)}
            disabled={!r.enabled}
          >
            发现工具
          </Button>
          <Popconfirm
            title="确认删除该 MCP Server？关联的 Agent 会自动解绑"
            onConfirm={() => deleteMut.mutate(r.id)}
          >
            <Button size="small" type="link" danger icon={<Trash2 size={14} />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="MCP 工具"
      subtitle="注册外部 MCP（Model Context Protocol）服务，为 Agent 提供函数调用能力。支持 HTTP 和本地 stdio 两种传输。"
      extra={
        <Space>
          <Button
            icon={<RefreshCw size={16} />}
            onClick={() => qc.invalidateQueries({ queryKey: ['mcp-servers'] })}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            新建 MCP Server
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="发现工具"
        description="点击「发现工具」会临时连一次 MCP server 拉取工具清单，不落库。之后在「智能体」编辑器里选择绑定，对话时就能让模型自行调用工具。"
      />

      <Table<McpServer>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={createOpen}
        title="新建 MCP Server"
        onOk={handleSubmit}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMut.isPending}
        destroyOnHidden
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ transport: 'http' }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：本地文件系统 / 日历工具 / 内部搜索" />
          </Form.Item>
          <Form.Item name="transport" label="传输方式">
            <Radio.Group>
              <Radio.Button value="http">HTTP (Streamable)</Radio.Button>
              <Radio.Button value="stdio">本地 stdio</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.transport !== curr.transport}
          >
            {({ getFieldValue }) =>
              getFieldValue('transport') === 'http' ? (
                <>
                  <Form.Item
                    name="server_url"
                    label="Server URL"
                    rules={[
                      { required: true, message: '请输入 server URL' },
                      { type: 'url', message: 'URL 格式不正确' },
                    ]}
                  >
                    <Input placeholder="http://127.0.0.1:9100/mcp/" />
                  </Form.Item>
                  <Form.Item
                    name="auth_token"
                    label="Bearer Token（可选）"
                    tooltip="会作为 Authorization: Bearer xxx 发送给 MCP server"
                  >
                    <Input.Password placeholder="留空代表不需要鉴权" />
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="command_json"
                  label="命令"
                  tooltip={'JSON 数组如 ["npx","-y","@mcp/server-filesystem","C:/data"]，或直接写命令行字符串'}
                  rules={[{ required: true, message: '请输入命令' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder='["npx","-y","@modelcontextprotocol/server-filesystem","C:/data"]'
                  />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={toolsDrawer !== null}
        title={
          toolsDrawer
            ? `工具清单 · ${toolsDrawer.server.name} (${toolsDrawer.tools.length})`
            : ''
        }
        width={640}
        onClose={() => setToolsDrawer(null)}
        destroyOnHidden
      >
        {toolsDrawer?.tools.map((t) => (
          <div
            key={t.name}
            style={{
              padding: 12,
              border: '1px solid var(--ant-color-border-secondary)',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Typography.Text strong>{t.name}</Typography.Text>
            <Typography.Paragraph
              type="secondary"
              style={{ margin: '4px 0' }}
            >
              {t.description || '(no description)'}
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              input schema：
            </Typography.Text>
            <pre
              style={{
                background: 'var(--ant-color-fill-quaternary)',
                padding: 8,
                borderRadius: 6,
                fontSize: 12,
                overflow: 'auto',
                marginTop: 4,
              }}
            >
              {JSON.stringify(t.inputSchema, null, 2)}
            </pre>
          </div>
        ))}
        {toolsDrawer && toolsDrawer.tools.length === 0 && (
          <Typography.Text type="secondary">
            该 MCP server 未暴露工具。
          </Typography.Text>
        )}
      </Drawer>
    </PageContainer>
  );
}
