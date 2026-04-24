"""结构化日志：stdout JSON + 异步落库。

用法：
    logger = logging.getLogger("app.chat")
    logger.info("user asked", extra={"agent_id": 42})

- `app.*` 命名空间 INFO+ 会写入 `app_logs` 表，并展示在 UI 的「日志」页
- 其余 logger（uvicorn、litellm、httpx）仅 stdout
- `trace_id` / `user_id` 通过 ContextVar 注入，前者靠 `LogContextMiddleware`
"""

from __future__ import annotations

import asyncio
import json
import logging
import queue
import secrets
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, UTC
from typing import Any

from app.db import async_session_maker
from app.models.app_log import AppLog

# ============ Context ============

current_trace_id: ContextVar[str | None] = ContextVar("current_trace_id", default=None)
current_user_id: ContextVar[uuid.UUID | None] = ContextVar("current_user_id", default=None)

# ============ 常量 ============

# 仅这些命名空间的日志会被持久化，用来过滤掉 uvicorn / httpx / litellm 噪音
_PERSIST_PREFIXES: tuple[str, ...] = ("app",)
# logging.LogRecord 自身的保留字段，写 extra_json 时跳过
_RESERVED: frozenset[str] = frozenset(
    {
        "name",
        "msg",
        "args",
        "levelname",
        "levelno",
        "pathname",
        "filename",
        "module",
        "exc_info",
        "exc_text",
        "stack_info",
        "lineno",
        "funcName",
        "created",
        "msecs",
        "relativeCreated",
        "thread",
        "threadName",
        "processName",
        "process",
        "getMessage",
        "message",
        "taskName",
    }
)


# ============ Formatter ============


class JsonFormatter(logging.Formatter):
    """把 LogRecord 序列化为一行 JSON，用于 stdout。"""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "source": f"{record.module}:{record.lineno}",
        }
        trace_id = current_trace_id.get()
        if trace_id:
            payload["trace_id"] = trace_id
        user_id = current_user_id.get()
        if user_id:
            payload["user_id"] = str(user_id)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        for k, v in record.__dict__.items():
            if k in _RESERVED or k.startswith("_"):
                continue
            try:
                json.dumps(v)
                payload[k] = v
            except (TypeError, ValueError):
                payload[k] = repr(v)
        return json.dumps(payload, ensure_ascii=False)


# ============ DB Handler ============


_log_queue: queue.SimpleQueue[dict[str, Any]] = queue.SimpleQueue()


class DbLogHandler(logging.Handler):
    """线程安全 Handler：把感兴趣的 record 丢进队列，交给后台协程落库。

    `emit` 必须零阻塞（logging 会在任何线程里调用），
    所以这里只做 extra 收集 + `SimpleQueue.put_nowait`。
    """

    def emit(self, record: logging.LogRecord) -> None:  # noqa: D401
        if record.levelno < logging.INFO:
            return
        if not record.name.startswith(_PERSIST_PREFIXES):
            return
        try:
            extra: dict[str, Any] = {}
            for k, v in record.__dict__.items():
                if k in _RESERVED or k.startswith("_"):
                    continue
                try:
                    json.dumps(v)
                    extra[k] = v
                except (TypeError, ValueError):
                    extra[k] = repr(v)
            entry = {
                "ts": datetime.fromtimestamp(record.created, tz=UTC).replace(tzinfo=None),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "source": f"{record.module}:{record.lineno}",
                "user_id": current_user_id.get(),
                "trace_id": current_trace_id.get(),
                "exc_text": self.formatter.formatException(record.exc_info)
                if (record.exc_info and self.formatter)
                else None,
                "extra_json": json.dumps(extra, ensure_ascii=False) if extra else None,
            }
            _log_queue.put_nowait(entry)
        except Exception:  # noqa: BLE001 - 绝不让日志写入反向炸掉业务
            pass


# ============ 后台消费者 ============

_consumer_task: asyncio.Task[None] | None = None
_FLUSH_INTERVAL_S: float = 0.5
_BATCH_SIZE: int = 100


async def _consume_forever() -> None:
    """后台协程：把队列里的 log 批量 flush 到 `app_logs` 表。"""
    while True:
        batch: list[dict[str, Any]] = []
        try:
            while len(batch) < _BATCH_SIZE:
                try:
                    batch.append(_log_queue.get_nowait())
                except queue.Empty:
                    break
            if not batch:
                await asyncio.sleep(_FLUSH_INTERVAL_S)
                continue
            async with async_session_maker() as session:
                for entry in batch:
                    session.add(AppLog(**entry))
                await session.commit()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            # 失败时直接打到 stderr，避免成环
            print(f"[log-consumer] flush failed: {exc}", file=sys.stderr)
            await asyncio.sleep(1.0)


async def start_log_consumer() -> None:
    """应用启动时调用一次。"""
    global _consumer_task
    if _consumer_task is None or _consumer_task.done():
        _consumer_task = asyncio.create_task(_consume_forever(), name="app-log-consumer")


async def stop_log_consumer() -> None:
    """应用关闭时调用，确保队列 flush 完。"""
    global _consumer_task
    if _consumer_task and not _consumer_task.done():
        # 把队列抽干
        try:
            drain: list[dict[str, Any]] = []
            while True:
                try:
                    drain.append(_log_queue.get_nowait())
                except queue.Empty:
                    break
            if drain:
                async with async_session_maker() as session:
                    for entry in drain:
                        session.add(AppLog(**entry))
                    await session.commit()
        except Exception as exc:  # noqa: BLE001
            print(f"[log-consumer] final drain failed: {exc}", file=sys.stderr)
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass
        _consumer_task = None


# ============ setup ============


def setup_logging(level: str = "INFO") -> None:
    """应用启动时调用一次：挂 stdout JSON handler + DbLogHandler。"""
    root = logging.getLogger()
    # 清掉默认 handler（uvicorn 会自己加，但我们要统一成 JSON）
    for h in list(root.handlers):
        root.removeHandler(h)

    json_fmt = JsonFormatter()

    stdout = logging.StreamHandler(sys.stdout)
    stdout.setFormatter(json_fmt)
    root.addHandler(stdout)

    db_h = DbLogHandler()
    db_h.setFormatter(json_fmt)  # 仅用于 formatException
    root.addHandler(db_h)

    root.setLevel(level)
    # 降噪：框架级只在 WARNING 以上才打
    for noisy in (
        "uvicorn.access",
        "httpx",
        "httpcore",
        "litellm",
        "sqlalchemy.engine",
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    logging.getLogger("app").setLevel(level)


def new_trace_id() -> str:
    """生成 8 字节的短 trace id，用于 HTTP 请求上下文。"""
    return secrets.token_hex(8)
