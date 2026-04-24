"""HTTP 中间件：为每个请求生成 trace_id，并把请求开始/结束写日志。

- `trace_id` 通过 `current_trace_id` ContextVar 下发，整请求链路都能拿到
- 请求完成后打 `app.http` INFO，字段包含 method / path / status / duration_ms
- `user_id` 本中间件不解析（auth 发生在路由层），后续在路由里按需
  通过 `current_user_id.set(user.id)` 显式注入
"""

from __future__ import annotations

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import current_trace_id, new_trace_id

http_logger = logging.getLogger("app.http")


class LogContextMiddleware(BaseHTTPMiddleware):
    """给每个请求分配 trace_id，结束时打一条 access log。"""

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: D401
        # 允许客户端透传 X-Trace-Id（便于跨服务排障），否则自动生成
        trace = request.headers.get("x-trace-id") or new_trace_id()
        token = current_trace_id.set(trace)
        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["x-trace-id"] = trace
            return response
        finally:
            duration_ms = int((time.perf_counter() - start) * 1000)
            # 只对 /api/v1 开头、且非 /health 的请求记录，避免噪音
            path = request.url.path
            if path.startswith("/api/v1") and not path.startswith("/api/v1/health"):
                http_logger.info(
                    "%s %s -> %d (%dms)",
                    request.method,
                    path,
                    status_code,
                    duration_ms,
                    extra={
                        "method": request.method,
                        "path": path,
                        "status": status_code,
                        "duration_ms": duration_ms,
                    },
                )
            current_trace_id.reset(token)
