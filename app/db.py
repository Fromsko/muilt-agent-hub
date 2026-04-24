"""Database engine, session factory, and initialization."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlmodel import SQLModel

from app.config import settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for fastapi-users models.

    Shares metadata with SQLModel so that cross-referenced foreign keys
    (e.g. prompts.user_id -> users.id) resolve correctly during create_all.
    """

    metadata = SQLModel.metadata


engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def init_db() -> None:
    """Create all tables. Called once at app startup."""
    # Import models so SQLModel/SQLAlchemy registers their tables.
    from app.models import (  # noqa: F401
        agent,
        api_token,
        app_log,
        call_log,
        key,
        mcp_server,
        message,
        open_key,
        prompt,
        user,
    )

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
