"""User manager - hooks for registration, password reset, etc."""

import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase

from app.config import settings
from app.models.user import User, get_user_db


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.JWT_SECRET
    verification_token_secret = settings.JWT_SECRET


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    yield UserManager(user_db)
