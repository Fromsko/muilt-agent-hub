import { httpClient } from '@/core/http/client';
import type {
  CreateUserRequest,
  PaginatedResponse,
  UpdateUserRequest,
  User,
} from './schemas';

interface UserListParams {
  limit?: number;
  offset?: number;
  sortField?: string | null;
  sortOrder?: 'ascend' | 'descend' | null;
  keyword?: string;
}

export const userApi = {
  async list(params?: UserListParams): Promise<PaginatedResponse<User>> {
    const items = await httpClient.get<User[]>('/admin/users', {
      params: params as Record<string, string | number | boolean | null | undefined>,
    });
    return { items, total: items.length, limit: params?.limit ?? 50, offset: params?.offset ?? 0 };
  },
  getById: (id: string) => httpClient.get<User>(`/admin/users/${id}`),
  create: (data: CreateUserRequest) => httpClient.post<User>('/admin/users', data),
  update: (id: string, data: UpdateUserRequest) =>
    httpClient.patch<User>(`/admin/users/${id}`, data),
  delete: (id: string) => httpClient.delete<void>(`/admin/users/${id}`),
};
