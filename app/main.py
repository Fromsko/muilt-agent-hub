"""FastAPI application entrypoint. All routes mount under /api/v1."""

import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 在 `httpx` 受系统代理影响的 Windows 机器上，绕开 localhost 代理。
# 这样 `streamablehttp_client(http://127.0.0.1:...)` 才能直连 MCP server。
os.environ.setdefault("NO_PROXY", "127.0.0.1,localhost,0.0.0.0")
os.environ.setdefault("no_proxy", "127.0.0.1,localhost,0.0.0.0")

import logging

from sqlmodel import select

from app.auth.schemas import UserCreate
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging, start_log_consumer, stop_log_consumer
from app.core.middleware import LogContextMiddleware
from app.db import async_session_maker, init_db
from app.models.user import User
from app.routers import admin_users as admin_users_router_module
from app.routers import agents as agents_router_module
from app.routers import api_tokens as api_tokens_router_module
from app.routers import auth as auth_router_module
from app.routers import chat as chat_router_module
from app.routers import health as health_router_module
from app.routers import keys as keys_router_module
from app.routers import logs as logs_router_module
from app.routers import mcp_servers as mcp_router_module
from app.routers import open_keys as open_keys_router_module
from app.routers import openai_compat as openai_compat_module
from app.routers import prompts as prompts_router_module
from app.routers import public as public_router_module
from app.routers import stats as stats_router_module
from app.services.mcp_manager import cleanup_pool

setup_logging(level="INFO")
log = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await start_log_consumer()
    log.info("AgentHub API started", extra={"version": "0.5.0"})

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.is_superuser == True))  # noqa: E712
        existing_admin = result.scalar_one_or_none()
        if not existing_admin:
            from app.auth.manager import UserManager
            from app.models.user import get_user_db

            admin_data = UserCreate(
                email="admin@example.com",
                password="admin",
                is_superuser=True,
                is_active=True,
            )
            async for user_db in get_user_db(session):
                user_manager = UserManager(user_db)
                await user_manager.create(user_create=admin_data, safe=False)
                log.info("Default admin user created: admin@example.com")
                break
        else:
            log.info("Admin user already exists")

    try:
        yield
    finally:
        log.info("AgentHub API shutting down")
        await cleanup_pool()
        await stop_log_consumer()


app = FastAPI(
    title="AgentHub API",
    version="0.1.0",
    description="Multi-user AI Agent configuration and chat API.",
    lifespan=lifespan,
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LogContextMiddleware)

api_v1 = APIRouter(prefix=settings.API_V1_PREFIX)
api_v1.include_router(auth_router_module.auth_router, prefix="/auth", tags=["auth"])
api_v1.include_router(auth_router_module.users_router, prefix="/users", tags=["users"])
api_v1.include_router(prompts_router_module.router, prefix="/prompts", tags=["prompts"])
api_v1.include_router(keys_router_module.router, prefix="/keys", tags=["keys"])
api_v1.include_router(agents_router_module.router, prefix="/agents", tags=["agents"])
api_v1.include_router(chat_router_module.router, prefix="/agents", tags=["chat"])
api_v1.include_router(health_router_module.router, prefix="/health", tags=["health"])
api_v1.include_router(stats_router_module.router, tags=["stats"])
api_v1.include_router(api_tokens_router_module.router, prefix="/api-tokens", tags=["api-tokens"])
api_v1.include_router(public_router_module.router, prefix="/public", tags=["public"])
api_v1.include_router(mcp_router_module.router, prefix="/mcp-servers", tags=["mcp-servers"])
api_v1.include_router(logs_router_module.router, prefix="/logs", tags=["logs"])
api_v1.include_router(open_keys_router_module.router, prefix="/open-keys", tags=["open-keys"])
api_v1.include_router(admin_users_router_module.router, prefix="/admin/users", tags=["admin-users"])

app.include_router(api_v1)

# OpenAI 兼容网关挂载在 /v1（不在 /api/v1 下），让外部 SDK 无缝接入
openai_v1 = APIRouter(prefix="/v1")
openai_v1.include_router(openai_compat_module.router, tags=["openai-compat"])
app.include_router(openai_v1)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": "AgentHub API",
        "version": "0.1.0",
        "docs": "/docs",
        "author": "Fromsko",
    }
