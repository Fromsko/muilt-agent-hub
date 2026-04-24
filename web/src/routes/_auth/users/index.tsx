import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { Button, Form, Input, Switch, Space, Tag, message, Popconfirm, Typography, Flex } from 'antd';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { DataTable } from '@/components/DataTable';
import { DataTableFiltersState } from '@/components/DataTable/DataTableFiltersState';
import { DataTableSummary } from '@/components/DataTable/DataTableSummary';
import { FilterToolbar } from '@/components/FilterToolbar';
import { FormModal } from '@/components/FormModal';
import { Auth } from '@/components/Auth';
import { useResourceCrud } from '@/hooks/use-resource-crud';
import { useDebounce } from '@/hooks/use-debounce';
import { userApi } from '@/api/user';
import { useAuthStore } from '@/stores/auth';
import { Plus, Pencil, Trash2, Search } from '@/core/icons';
import type { User, CreateUserRequest, UpdateUserRequest } from '@/api/schemas';
import type { ColumnsType } from 'antd/es/table';

const UserSearchSchema = z.object({
  limit: z.coerce.number().int().positive().catch(10),
  offset: z.coerce.number().int().nonnegative().catch(0),
  sortField: z.string().nullable().catch(null),
  sortOrder: z.enum(['ascend', 'descend']).nullable().catch(null),
  keyword: z.string().catch(''),
});

export const Route = createFileRoute('/_auth/users/')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user?.permissions?.includes('superuser')) {
      throw redirect({ to: '/403' });
    }
  },
  validateSearch: (search) => UserSearchSchema.parse(search),
  component: UsersPage,
  staticData: { breadcrumb: '用户管理' },
});

function UsersPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const debouncedKeyword = useDebounce(search.keyword, 300);

  const listParams = useMemo(
    () => ({ ...search, keyword: debouncedKeyword }),
    [search, debouncedKeyword],
  );

  const { listQuery, createMutation, updateMutation, deleteMutation } = useResourceCrud<
    User,
    CreateUserRequest,
    UpdateUserRequest
  >({
    resourceKey: 'users',
    api: userApi,
    listParams: listParams as Record<string, unknown>,
  });

  const activeFilterCount = Number(Boolean(search.keyword));
  const totalUsers = listQuery.data?.total ?? 0;

  const columns: ColumnsType<User> = [
    { title: '名称', dataIndex: 'name', sorter: true, width: 220 },
    { title: '邮箱', dataIndex: 'email', sorter: true, width: 280 },
    {
      title: '身份',
      dataIndex: 'is_superuser',
      width: 120,
      render: (isSuper: boolean) =>
        isSuper ? <Tag color="red">管理员</Tag> : <Tag color="blue">用户</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Auth permission="user:update">
            <Button
              type="link"
              size="small"
              icon={<Pencil size={14} />}
              onClick={() => {
                setEditingUser(record);
                setModalOpen(true);
              }}
            >
              编辑
            </Button>
          </Auth>
          <Auth permission="user:delete">
            <Popconfirm title="确定删除该用户吗？" onConfirm={() => void handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<Trash2 size={14} />}>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    await listQuery.refetch();
    message.success('用户已删除');
  };

  const handleSubmit = async (values: CreateUserRequest) => {
    if (editingUser) {
      const data: UpdateUserRequest = {
        name: values.name,
        email: values.email,
        is_superuser: values.is_superuser,
      };
      await updateMutation.mutateAsync({ id: editingUser.id, data });
      await listQuery.refetch();
      message.success('用户信息已更新');
    } else {
      await createMutation.mutateAsync(values);
      await listQuery.refetch();
      message.success('用户已创建');
    }
    setModalOpen(false);
    setEditingUser(null);
  };

  const updateSearch = (updates: Partial<typeof search>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  const clearFilters = () => {
    updateSearch({ keyword: '', offset: 0 });
  };

  const modalInitial =
    editingUser === null
      ? undefined
      : { name: editingUser.name, email: editingUser.email, is_superuser: editingUser.is_superuser ?? false };

  return (
    <PageContainer
      title="用户管理"
      subtitle="集中维护用户信息、角色归属与筛选查询条件。"
      extra={
        <Auth permission="user:create">
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditingUser(null);
              setModalOpen(true);
            }}
          >
            新建用户
          </Button>
        </Auth>
      }
    >
      <Flex vertical gap={12}>
        <FilterToolbar
          filters={[
            {
              key: 'keyword',
              element: (
                <Input
                  placeholder="搜索用户名/邮箱"
                  prefix={<Search size={14} />}
                  value={search.keyword}
                  onChange={(e) => updateSearch({ keyword: e.target.value, offset: 0 })}
                  allowClear
                />
              ),
            },
          ]}
        />

        <DataTableFiltersState
          activeCount={activeFilterCount}
          emptyText="当前显示全部用户"
          tags={
            <>
              {search.keyword ? <Tag color="processing">关键词：{search.keyword}</Tag> : null}
            </>
          }
          onClear={clearFilters}
        />

        <DataTableSummary
          total={totalUsers}
          totalLabel="位用户"
          statusText={listQuery.isFetching ? '正在刷新列表数据…' : '数据已按当前筛选条件同步显示。'}
          extraTags={
            search.sortField && search.sortOrder ? (
              <Tag color="blue">
                排序：{search.sortField} / {search.sortOrder === 'ascend' ? '升序' : '降序'}
              </Tag>
            ) : null
          }
          statusTag={activeFilterCount > 0 ? <Tag color="processing">筛选已生效</Tag> : <Tag>全部结果</Tag>}
        />
      </Flex>

      <DataTable<User>
        loading={listQuery.isLoading}
        dataSource={listQuery.data?.items}
        columns={columns}
        rowKey="id"
        maxHeight={560}
        locale={{
          emptyText: (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Typography.Title level={5} style={{ margin: '0 0 8px' }}>
                暂无匹配的用户
              </Typography.Title>
              <Typography.Text type="secondary">
                {activeFilterCount > 0
                  ? '请调整筛选条件后重试，或清空筛选查看全部用户。'
                  : '当前还没有创建任何用户，请先新增用户。'}
              </Typography.Text>
            </div>
          ),
        }}
        pagination={{
          current: Math.floor(search.offset / search.limit) + 1,
          pageSize: search.limit,
          total: totalUsers,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) =>
            updateSearch({ offset: (page - 1) * pageSize, limit: pageSize }),
        }}
        onChange={(_pagination, _filters, sorter) => {
          if (!Array.isArray(sorter)) {
            updateSearch({
              sortField: (sorter.field as string) ?? null,
              sortOrder: sorter.order ?? null,
            });
          }
        }}
        style={{ marginTop: 16 }}
      />

      <FormModal<CreateUserRequest>
        open={modalOpen}
        title={editingUser ? '编辑用户' : '新建用户'}
        onCancel={() => {
          setModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSubmit}
        initialValues={modalInitial}
      >
        <Form.Item name="name" label="名称" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="is_superuser" label="管理员" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
        {!editingUser && (
          <Form.Item name="password" label="密码" rules={[{ required: true }]}> 
            <Input.Password />
          </Form.Item>
        )}
      </FormModal>
    </PageContainer>
  );
}
