import { delay, http, HttpResponse } from 'msw';
import { errorResponse, ERROR_CODES, paginate, successResponse } from '../utils';

function generateMockUsers(count: number) {
  const roles = ['admin', 'editor', 'viewer'];
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `User ${i + 1}`,
    email: `user${i + 1}@gateway.dev`,
    avatar: '',
    role: roles[i % roles.length],
    permissions:
      i === 0 ? ['user:read', 'user:create', 'user:update', 'user:delete'] : ['user:read'],
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

let mockUsers = generateMockUsers(50);

export const userHandlers = [
  http.get('/api/v1/users', async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const keyword = url.searchParams.get('keyword') ?? '';
    const role = url.searchParams.get('role') ?? '';
    const sortField = url.searchParams.get('sortField');
    const sortOrder = url.searchParams.get('sortOrder');

    let filtered = [...mockUsers];
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (u) => u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw),
      );
    }
    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }
    if (sortField && sortOrder) {
      filtered.sort((a, b) => {
        const aVal = String((a as Record<string, unknown>)[sortField] ?? '');
        const bVal = String((b as Record<string, unknown>)[sortField] ?? '');
        return sortOrder === 'ascend' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }

    return HttpResponse.json(successResponse(paginate(filtered, offset, limit)));
  }),

  http.get('/api/v1/users/:id', async ({ params }) => {
    await delay(300);
    const user = mockUsers.find((u) => u.id === params.id);
    if (!user)
      return HttpResponse.json(errorResponse(ERROR_CODES.NOT_FOUND, 'User not found'), {
        status: 404,
      });
    return HttpResponse.json(successResponse(user));
  }),

  http.post('/api/v1/users', async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as Record<string, string>;
    const newUser = {
      id: String(Date.now()),
      name: body.name,
      email: body.email,
      avatar: '',
      role: body.role ?? 'viewer',
      permissions: ['user:read'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUsers.unshift(newUser);
    return HttpResponse.json(successResponse(newUser));
  }),

  http.put('/api/v1/users/:id', async ({ params, request }) => {
    await delay(400);
    const idx = mockUsers.findIndex((u) => u.id === params.id);
    if (idx === -1)
      return HttpResponse.json(errorResponse(ERROR_CODES.NOT_FOUND, 'User not found'), {
        status: 404,
      });
    const body = (await request.json()) as Record<string, string>;
    mockUsers[idx] = { ...mockUsers[idx], ...body, updatedAt: new Date().toISOString() };
    return HttpResponse.json(successResponse(mockUsers[idx]));
  }),

  http.delete('/api/v1/users/:id', async ({ params }) => {
    await delay(300);
    mockUsers = mockUsers.filter((u) => u.id !== params.id);
    return HttpResponse.json(successResponse(null));
  }),
];
