import { httpClient } from '@/core/http/client';
import type { AuthTokens, LoginRequest, User } from './schemas';

// Backend endpoints (AgentHub, fastapi-users 15):
//   POST /auth/jwt/login       form-urlencoded, returns { access_token, token_type }
//   POST /auth/jwt/logout      JWT required
//   POST /auth/register        JSON { email, password }
//   GET  /users/me             JWT required

interface BackendJwtResponse {
  access_token: string;
  token_type: string;
}

interface BackendUser {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

function mapUser(u: BackendUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.email.split('@')[0] ?? u.email,
    role: u.is_superuser ? 'admin' : 'user',
    permissions: u.is_superuser
      ? ['superuser', 'user:read', 'user:create', 'user:update', 'user:delete']
      : [],
  };
}

export const authApi = {
  async login(data: LoginRequest): Promise<AuthTokens> {
    const form = new URLSearchParams();
    form.set('username', data.username);
    form.set('password', data.password);
    const resp = await httpClient.post<BackendJwtResponse>('/auth/jwt/login', form);
    let refreshToken = '';
    try {
      const rt = await httpClient.get<{ refresh_token: string }>('/auth/jwt/refresh-token');
      refreshToken = rt.refresh_token;
    } catch {
      /* ok - refresh token is optional */
    }
    return { accessToken: resp.access_token, refreshToken };
  },

  async register(email: string, password: string): Promise<User> {
    const u = await httpClient.post<BackendUser>('/auth/register', { email, password });
    return mapUser(u);
  },

  logout: () => httpClient.post<void>('/auth/jwt/logout'),

  async getUser(): Promise<User> {
    const u = await httpClient.get<BackendUser>('/users/me');
    return mapUser(u);
  },

  // MVP backend does not expose fine-grained permissions; return empty and rely on role.
  async getPermissions(): Promise<string[]> {
    try {
      const u = await httpClient.get<BackendUser>('/users/me');
      return u.is_superuser ? ['*'] : [];
    } catch {
      return [];
    }
  },
};
