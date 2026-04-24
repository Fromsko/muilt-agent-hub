import { delay, http, HttpResponse } from 'msw';
import { errorResponse, ERROR_CODES, successResponse } from '../utils';

const MOCK_USER = {
  id: '1',
  name: 'Admin',
  email: 'admin@gateway.dev',
  avatar: '',
  role: 'admin',
  permissions: [
    'user:read',
    'user:create',
    'user:update',
    'user:delete',
    'system:settings',
    'dashboard:read',
  ],
  createdAt: '2024-01-01T00:00:00Z',
};

const MOCK_TOKENS = {
  accessToken: 'mock-access-token-' + Date.now(),
  refreshToken: 'mock-refresh-token-' + Date.now(),
};

export const authHandlers = [
  http.post('/api/v1/auth/jwt/login', async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as { username: string; password: string };

    if (body.username === 'admin' && body.password === 'admin') {
      return HttpResponse.json(successResponse(MOCK_TOKENS));
    }
    return HttpResponse.json(errorResponse(ERROR_CODES.INVALID_CREDENTIALS, '用户名或密码错误'), {
      status: 401,
    });
  }),

  http.post('/api/v1/auth/jwt/logout', async () => {
    await delay(200);
    return HttpResponse.json(successResponse(null));
  }),

  http.post('/api/v1/auth/jwt/refresh', async () => {
    await delay(300);
    return HttpResponse.json(
      successResponse({
        accessToken: 'mock-access-token-refreshed-' + Date.now(),
        refreshToken: 'mock-refresh-token-refreshed-' + Date.now(),
      }),
    );
  }),

  http.get('/api/v1/users/me', async () => {
    await delay(300);
    return HttpResponse.json(successResponse(MOCK_USER));
  }),

  http.get('/api/v1/auth/permissions', async () => {
    await delay(200);
    return HttpResponse.json(successResponse(MOCK_USER.permissions));
  }),
];
