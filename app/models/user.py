"""User model using fastapi-users SQLAlchemy UUID base."""

from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import Base, get_async_session


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"


async def get_user_db(
    session: AsyncSession = Depends(get_async_session),
) -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    yield SQLAlchemyUserDatabase(session, User)
