export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  toJSON(): {
    type: string;
    name: string;
    status: number;
    message: string;
    traceId?: string;
  } {
    return {
      type: 'HttpError',
      name: this.name,
      status: this.status,
      message: this.message,
      ...(this.traceId !== undefined ? { traceId: this.traceId } : {}),
    };
  }
}

export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly traceId?: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON(): {
    type: string;
    name: string;
    code: number;
    message: string;
    traceId?: string;
    data?: unknown;
  } {
    return {
      type: 'ApiError',
      name: this.name,
      code: this.code,
      message: this.message,
      ...(this.traceId !== undefined ? { traceId: this.traceId } : {}),
      ...(this.data !== undefined ? { data: this.data } : {}),
    };
  }
}
