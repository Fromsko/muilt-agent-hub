export type RequestInterceptor = (
  config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (
  response: Response,
  traceId: string,
) => Response | Promise<Response>;
export type ErrorInterceptor = (error: Error, traceId: string) => Error | Promise<Error>;

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  traceId: string;
}

class InterceptorManager {
  private readonly requestChain: RequestInterceptor[] = [];
  private readonly responseChain: ResponseInterceptor[] = [];
  private readonly errorChain: ErrorInterceptor[] = [];

  addRequest(fn: RequestInterceptor): () => void {
    this.requestChain.push(fn);
    return () => {
      const i = this.requestChain.indexOf(fn);
      if (i !== -1) this.requestChain.splice(i, 1);
    };
  }

  addResponse(fn: ResponseInterceptor): () => void {
    this.responseChain.push(fn);
    return () => {
      const i = this.responseChain.indexOf(fn);
      if (i !== -1) this.responseChain.splice(i, 1);
    };
  }

  addError(fn: ErrorInterceptor): () => void {
    this.errorChain.push(fn);
    return () => {
      const i = this.errorChain.indexOf(fn);
      if (i !== -1) this.errorChain.splice(i, 1);
    };
  }

  async runRequest(config: RequestConfig): Promise<RequestConfig> {
    let c = config;
    for (const fn of this.requestChain) {
      c = await fn(c);
    }
    return c;
  }

  async runResponse(response: Response, traceId: string): Promise<Response> {
    let r = response;
    for (const fn of this.responseChain) {
      r = await fn(r, traceId);
    }
    return r;
  }

  async runError(error: Error, traceId: string): Promise<Error> {
    let e = error;
    for (const fn of this.errorChain) {
      e = await fn(e, traceId);
    }
    return e;
  }
}

export const interceptors = new InterceptorManager();

let defaultInterceptorsInstalled = false;

function readAuthStorage(): { accessToken?: string; refreshToken?: string } {
  if (typeof localStorage === 'undefined') return {};
  const raw = localStorage.getItem('auth-storage');
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const root = parsed as Record<string, unknown>;
    const tokens =
      (root.tokens as Record<string, unknown> | undefined) ??
      ((root.state as Record<string, unknown> | undefined)?.tokens as
        | Record<string, unknown>
        | undefined);
    return {
      accessToken: typeof tokens?.accessToken === 'string' ? tokens.accessToken : undefined,
      refreshToken: typeof tokens?.refreshToken === 'string' ? tokens.refreshToken : undefined,
    };
  } catch {
    return {};
  }
}

function writeTokens(accessToken: string, refreshToken: string): void {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem('auth-storage');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.tokens = { accessToken, refreshToken };
    parsed.isAuthenticated = true;
    localStorage.setItem('auth-storage', JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken } = readAuthStorage();
  if (!refreshToken) return false;
  try {
    const resp = await fetch('/api/v1/auth/jwt/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { access_token: string; refresh_token: string };
    writeTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export function setupDefaultInterceptors(): void {
  if (defaultInterceptorsInstalled) return;
  defaultInterceptorsInstalled = true;

  interceptors.addRequest((config) => {
    const { accessToken } = readAuthStorage();
    if (
      !accessToken ||
      config.headers.Authorization !== undefined ||
      config.headers.authorization !== undefined
    ) {
      return config;
    }
    return {
      ...config,
      headers: { ...config.headers, Authorization: `Bearer ${accessToken}` },
    };
  });

  interceptors.addResponse(async (response, _traceId) => {
    if (response.status !== 401) return response;
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    const ok = await refreshPromise;
    if (!ok) return response;
    const { accessToken } = readAuthStorage();
    if (!accessToken) return response;
    const retryResp = await fetch(response.url, {
      method: (response as unknown as { _method?: string })._method ?? 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return retryResp;
  });
}
