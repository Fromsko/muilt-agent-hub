interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { code: 0, message: 'success', data };
}

export function errorResponse(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}

export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_CREDENTIALS: 1001,
  VALIDATION_ERROR: 1002,
} as const;

export function withDelay<T>(handler: () => T, ms: number = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(handler()), ms));
}

export function paginate<T>(
  items: T[],
  offset: number,
  limit: number,
): {
  items: T[];
  total: number;
  limit: number;
  offset: number;
} {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
}
