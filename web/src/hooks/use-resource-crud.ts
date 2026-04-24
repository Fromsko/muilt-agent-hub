import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/api/schemas';

interface CrudApi<T, CreateReq, UpdateReq> {
  list: (params?: Record<string, unknown>) => Promise<PaginatedResponse<T>>;
  getById?: (id: string) => Promise<T>;
  create: (data: CreateReq) => Promise<T>;
  update: (id: string, data: UpdateReq) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

interface UseResourceCrudOptions<T, CreateReq, UpdateReq> {
  resourceKey: string;
  api: CrudApi<T, CreateReq, UpdateReq>;
  listParams?: Record<string, unknown>;
}

export function useResourceCrud<T, CreateReq, UpdateReq>({
  resourceKey,
  api,
  listParams,
}: UseResourceCrudOptions<T, CreateReq, UpdateReq>) {
  const queryClient = useQueryClient();
  const queryKey = [resourceKey, listParams];

  const listQuery = useQuery({
    queryKey,
    queryFn: () => api.list(listParams),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateReq) => api.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceKey] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReq }) => api.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceKey] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceKey] }),
  });

  return {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
