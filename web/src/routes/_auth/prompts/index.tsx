import { promptApi, type Prompt, type PromptCreate } from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { Pencil, Plus, Trash2 } from '@/core/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { App, Button, Form, Input, Modal, Popconfirm, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/prompts/')({
  component: PromptsPage,
  staticData: { breadcrumb: '提示词' },
});

function PromptsPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const { data, isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => promptApi.list(),
  });

  const [editing, setEditing] = useState<Prompt | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PromptCreate>();

  const createMut = useMutation({
    mutationFn: (data: PromptCreate) => promptApi.create(data),
    onSuccess: () => {
      message.success('已创建');
      qc.invalidateQueries({ queryKey: ['prompts'] });
      handleClose();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromptCreate }) => promptApi.update(id, data),
    onSuccess: () => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['prompts'] });
      handleClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => promptApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['prompts'] });
    },
  });

  function handleOpen(p?: Prompt) {
    setEditing(p ?? null);
    form.setFieldsValue(p ? { name: p.name, content: p.content } : { name: '', content: '' });
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editing) {
      updateMut.mutate({ id: editing.id, data: values });
    } else {
      createMut.mutate(values);
    }
  }

  const columns: ColumnsType<Prompt> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name', width: 220 },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => <span style={{ color: '#666' }}>{v}</span>,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作',
      width: 180,
      render: (_, r) => (
        <Space>
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
      title="提示词"
      subtitle="管理你的提示词模板。它们会在创建智能体时作为系统消息（system prompt）使用。"
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={() => handleOpen()}>
          新建提示词
        </Button>
      }
    >
      <Table<Prompt>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={open}
        title={editing ? '编辑提示词' : '新建提示词'}
        onOk={handleSubmit}
        onCancel={handleClose}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnHidden
        width={680}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：客服助手" />
          </Form.Item>
          <Form.Item
            name="content"
            label="提示词内容"
            rules={[{ required: true, message: '请输入提示词' }]}
          >
            <Input.TextArea rows={10} placeholder="你是一名..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
