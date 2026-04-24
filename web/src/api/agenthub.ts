import { httpClient } from '@/core/http/client';

// ============ Prompt ============

export interface Prompt {
  id: number;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PromptCreate {
  name: string;
  content: string;
}

export interface PromptUpdate {
  name?: string;
  content?: string;
}

export const promptApi = {
  list: () => httpClient.get<Prompt[]>('/prompts'),
  get: (id: number) => httpClient.get<Prompt>(`/prompts/${id}`),
  create: (data: PromptCreate) => httpClient.post<Prompt>('/prompts', data),
  update: (id: number, data: PromptUpdate) => httpClient.patch<Prompt>(`/prompts/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`/prompts/${id}`),
};

// ============ Key ============

export interface ApiKey {
  id: number;
  name: string;
  provider: string;
  api_key_masked: string;
  api_base: string | null;
  created_at: string;
}

export interface KeyCreate {
  name: string;
  provider: string;
  api_key: string;
  api_base?: string | null;
}

export interface KeyTestRequest {
  api_key: string;
  api_base?: string | null;
  model?: string | null;
}

export interface KeyTestResponse {
  ok: boolean;
  message: string;
  model: string | null;
  latency_ms: number | null;
}

export const keyApi = {
  list: () => httpClient.get<ApiKey[]>('/keys'),
  create: (data: KeyCreate) => httpClient.post<ApiKey>('/keys', data),
  remove: (id: number) => httpClient.delete<void>(`/keys/${id}`),
  test: (data: KeyTestRequest) =>
    httpClient.post<KeyTestResponse>('/keys/test', data),
};

// ============ Agent ============

export interface Agent {
  id: number;
  name: string;
  description: string | null;
  prompt_id: number;
  key_id: number;
  model: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCreate {
  name: string;
  description?: string | null;
  prompt_id: number;
  key_id: number;
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AgentUpdate {
  name?: string;
  description?: string | null;
  prompt_id?: number;
  key_id?: number;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export const agentApi = {
  list: () => httpClient.get<Agent[]>('/agents'),
  get: (id: number) => httpClient.get<Agent>(`/agents/${id}`),
  create: (data: AgentCreate) => httpClient.post<Agent>('/agents', data),
  update: (id: number, data: AgentUpdate) => httpClient.patch<Agent>(`/agents/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`/agents/${id}`),
};

// ============ Chat ============

export interface Message {
  id: number;
  agent_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatResponse {
  agent_id: number;
  reply: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

export const chatApi = {
  /** Non-streaming single-shot chat. */
  async send(agentId: number, message: string): Promise<ChatResponse> {
    return httpClient.post<ChatResponse>(`/agents/${agentId}/chat`, {
      message,
      stream: false,
    });
  },

  /** Streaming chat via SSE. Returns an async iterator over delta strings.
   *  Caller must pass the JWT Bearer via `token` since fetch-stream needs it.
   */
  async *stream(
    agentId: number,
    message: string,
    token: string,
    options?: { signal?: AbortSignal; baseUrl?: string; maxTurns?: number },
  ): AsyncGenerator<string> {
    const base =
      options?.baseUrl ??
      (typeof import.meta !== 'undefined' && import.meta.env.PUBLIC_API_BASE_URL
        ? String(import.meta.env.PUBLIC_API_BASE_URL)
        : '');
    const url = `${base.replace(/\/$/, '')}/agents/${agentId}/chat`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        stream: true,
        ...(options?.maxTurns !== undefined ? { max_turns: options.maxTurns } : {}),
      }),
      signal: options?.signal,
    });

    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Chat stream failed (${resp.status}): ${text}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by \n\n
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = frame.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const obj = JSON.parse(payload) as { delta?: string; error?: string };
            if (obj.delta) yield obj.delta;
            if (obj.error) throw new Error(obj.error);
          } catch {
            // ignore non-json frames
          }
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // already released
      }
    }
  },

  listMessages: (agentId: number, limit = 50) =>
    httpClient.get<Message[]>(`/agents/${agentId}/messages`, { params: { limit } }),
};

// ============ API Token ============

export interface ApiTokenRead {
  id: number;
  name: string;
  prefix: string;
  tail: string;
  enabled: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiTokenReadWithSecret extends ApiTokenRead {
  token: string; // 仅创建时返回
}

export const apiTokenApi = {
  list: () => httpClient.get<ApiTokenRead[]>('/api-tokens'),
  create: (name: string) =>
    httpClient.post<ApiTokenReadWithSecret>('/api-tokens', { name }),
  setEnabled: (id: number, enabled: boolean) =>
    httpClient.patch<ApiTokenRead>(
      `/api-tokens/${id}/enabled`,
      undefined,
      { params: { enabled } },
    ),
  remove: (id: number) => httpClient.delete<void>(`/api-tokens/${id}`),
};

// ============ Stats ============

export interface RecentMessageItem {
  id: number;
  agent_id: number;
  role: 'user' | 'assistant';
  content_preview: string;
  created_at: string;
}

export interface Stats {
  prompt_count: number;
  key_count: number;
  agent_count: number;
  message_count: number;
  recent_messages: RecentMessageItem[];
}

export interface DailyStatsItem {
  day: string;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_duration_ms: number;
  error_count: number;
}

export const statsApi = {
  get: () => httpClient.get<Stats>('/stats'),
  daily: (days = 7) =>
    httpClient.get<DailyStatsItem[]>('/stats/daily', { params: { days } }),
};

// ============ MCP Server (B2) ============

export interface McpServer {
  id: number;
  name: string;
  transport: 'http' | 'stdio';
  server_url: string | null;
  command_json: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  has_auth_token: boolean;
}

export interface McpServerCreate {
  name: string;
  transport: 'http' | 'stdio';
  server_url?: string | null;
  command_json?: string | null;
  auth_token?: string | null;
}

export interface McpServerUpdate {
  name?: string;
  transport?: 'http' | 'stdio';
  server_url?: string | null;
  command_json?: string | null;
  auth_token?: string | null;
  enabled?: boolean;
}

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  server_id: number;
}

export const mcpApi = {
  list: () => httpClient.get<McpServer[]>('/mcp-servers'),
  create: (data: McpServerCreate) => httpClient.post<McpServer>('/mcp-servers', data),
  update: (id: number, data: McpServerUpdate) =>
    httpClient.patch<McpServer>(`/mcp-servers/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`/mcp-servers/${id}`),
  discover: (id: number) =>
    httpClient.post<McpToolInfo[]>(`/mcp-servers/${id}/discover`, {}),
  listAgentBindings: (agentId: number) =>
    httpClient.get<McpServer[]>(`/mcp-servers/agents/${agentId}/tools`),
  updateAgentBindings: (agentId: number, mcpServerIds: number[]) =>
    httpClient.put<McpServer[]>(`/mcp-servers/agents/${agentId}/tools`, {
      mcp_server_ids: mcpServerIds,
    }),
};

// ============ App Logs (v0.5) ============

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogItem {
  id: number;
  ts: string;
  level: LogLevel;
  logger: string;
  message: string;
  source: string | null;
  user_id: string | null;
  trace_id: string | null;
  exc_text: string | null;
  extra: Record<string, unknown> | null;
}

export interface LogStats {
  total: number;
  by_level: Record<LogLevel, number>;
  latest_id: number | null;
}

export interface LogQuery {
  level?: LogLevel | '';
  logger?: string;
  search?: string;
  since_id?: number;
  limit?: number;
}

export const logsApi = {
  list: (params: LogQuery = {}) =>
    httpClient.get<LogItem[]>('/logs', { params }),
  stats: () => httpClient.get<LogStats>('/logs/stats'),
};

// ============ OpenKey (管理员分发) ============

export interface OpenKeyRead {
  id: number;
  name: string;
  prefix: string;
  tail: string;
  enabled: boolean;
  allowed_agent_ids: number[];
  rate_limit_per_minute: number | null;
  quota_total: number | null;
  quota_used: number;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface OpenKeyReadWithSecret extends OpenKeyRead {
  key: string;
}

export interface OpenKeyCreate {
  name: string;
  allowed_agent_ids?: number[];
  rate_limit_per_minute?: number | null;
  quota_total?: number | null;
  expires_at?: string | null;
}

export interface OpenKeyUpdate {
  name?: string;
  enabled?: boolean;
  allowed_agent_ids?: number[];
  rate_limit_per_minute?: number | null;
  quota_total?: number | null;
  expires_at?: string | null;
}

export interface OpenKeyUsage {
  open_key_id: number;
  quota_total: number | null;
  quota_used: number;
  recent_calls: number;
}

export const openKeyApi = {
  list: () => httpClient.get<OpenKeyRead[]>('/open-keys'),
  create: (data: OpenKeyCreate) =>
    httpClient.post<OpenKeyReadWithSecret>('/open-keys', data),
  update: (id: number, data: OpenKeyUpdate) =>
    httpClient.patch<OpenKeyRead>(`/open-keys/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`/open-keys/${id}`),
  getUsage: (id: number, days = 7) =>
    httpClient.get<OpenKeyUsage>(`/open-keys/${id}/usage`, { params: { days } }),
};
