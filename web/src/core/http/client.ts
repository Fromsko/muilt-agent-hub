import { createLogger } from '@/core/logger';
import { ApiError, HttpError } from './errors';
import { interceptors, type RequestConfig } from './interceptors';
import { tracker } from './tracker';

const log = createLogger('http');

export interface RequestOptions {
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
}

const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env.PUBLIC_API_BASE_URL
    ? String(import.meta.env.PUBLIC_API_BASE_URL)
    : '/api/v1';

function buildUrl(
  base: string,
  path: string,
  params?: RequestOptions['params'],
): string {
  const qs = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      qs.set(key, String(value));
    }
  }
  const q = qs.toString();
  const suffix = q ? `?${q}` : '';
  const pathNorm = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return `${pathNorm}${suffix}`;
  }
  const baseNorm = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${baseNorm}${pathNorm}${suffix}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = buildUrl(API_BASE_URL, path, options?.params);
  const traceId = tracker.start(method, url);
  const scopedLog = log.withTrace(traceId);

  // If caller passes URLSearchParams or FormData, treat as form-encoded and skip JSON stringify
  const isFormUrlEncoded =
    typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isRawForm = isFormUrlEncoded || isFormData;

  const headers: Record<string, string> = {
    ...(body !== undefined && !isRawForm ? { 'Content-Type': 'application/json' } : {}),
    ...(isFormUrlEncoded ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    // FormData: let browser set multipart boundary
    ...options?.headers,
  };

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormUrlEncoded) serializedBody = body as URLSearchParams;
    else if (isFormData) serializedBody = body as FormData;
    else serializedBody = JSON.stringify(body);
  }

  let config: RequestConfig = {
    url,
    method,
    headers,
    ...(serializedBody !== undefined ? { body: serializedBody as unknown as string } : {}),
    traceId,
  };

  try {
    config = await interceptors.runRequest(config);
    scopedLog.info('http request', { method: config.method, url: config.url });

    const init: RequestInit = {
      method: config.method,
      headers: config.headers,
      ...(config.body !== undefined ? { body: config.body } : {}),
    };

    let response = await fetch(config.url, init);
    response = await interceptors.runResponse(response, traceId);

    if (!response.ok) {
      let message = response.statusText || `HTTP ${response.status}`;
      try {
        const errText = await response.clone().text();
        if (errText) {
          const parsed: unknown = JSON.parse(errText);
          if (parsed && typeof parsed === 'object') {
            const obj = parsed as Record<string, unknown>;
            // FastAPI convention: { detail: "msg" } or { detail: [{msg: ...}] }
            if (typeof obj.detail === 'string') {
              message = obj.detail;
            } else if (Array.isArray(obj.detail) && obj.detail.length > 0) {
              const first = obj.detail[0] as Record<string, unknown>;
              if (typeof first.msg === 'string') message = first.msg;
            } else if (typeof obj.message === 'string') {
              message = obj.message;
            }
          }
        }
      } catch {
        /* keep statusText */
      }
      throw new HttpError(response.status, message, traceId);
    }

    const text = await response.text();
    const json: unknown = text ? JSON.parse(text) : {};

    if (
      json &&
      typeof json === 'object' &&
      'code' in json &&
      typeof (json as { code: unknown }).code === 'number'
    ) {
      const code = (json as { code: number }).code;
      if (code !== 0) {
        const msg =
          'message' in json && typeof (json as { message: unknown }).message === 'string'
            ? (json as { message: string }).message
            : `API error ${code}`;
        const data = 'data' in json ? (json as { data: unknown }).data : undefined;
        throw new ApiError(code, msg, traceId, data);
      }
    }

    tracker.end(traceId, response.status);
    scopedLog.info('http response', { status: response.status });

    if (json && typeof json === 'object' && 'data' in json) {
      return (json as { data: T }).data;
    }
    return json as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    tracker.fail(traceId, message);
    const error = err instanceof Error ? err : new Error(message);
    const processed = await interceptors.runError(error, traceId);
    scopedLog.error('http error', processed);
    throw processed;
  }
}

export const httpClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};
