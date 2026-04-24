"""JWT authentication backend wiring for fastapi-users.

Adds a separate *refresh token* flow: ``create_refresh_token`` generates a
long-lived JWT; ``verify_refresh_token`` decodes it and returns the user id.
The actual ``POST /auth/jwt/refresh`` endpoint is registered in ``routers/auth.py``.
"""

import uuid
from datetime import datetime, timedelta, UTC

import jwt as pyjwt
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)

from app.auth.manager import get_user_manager
from app.config import settings
from app.models.user import User

bearer_transport = BearerTransport(tokenUrl=f"{settings.API_V1_PREFIX.strip('/')}/auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.JWT_SECRET, lifetime_seconds=settings.JWT_LIFETIME_SECONDS)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)

_REFRESH_SECRET = settings.JWT_SECRET + ":refresh"
_REFRESH_ALGORITHM = "HS256"


def create_refresh_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "aud": "fastapi-users:refresh",
        "iat": now,
        "exp": now + timedelta(seconds=settings.REFRESH_TOKEN_LIFETIME_SECONDS),
    }
    return pyjwt.encode(payload, _REFRESH_SECRET, algorithm=_REFRESH_ALGORITHM)


def verify_refresh_token(token: str) -> uuid.UUID | None:
    """Return user id if *token* is a valid, non-expired refresh JWT."""
    try:
        data = pyjwt.decode(
            token,
            _REFRESH_SECRET,
            algorithms=[_REFRESH_ALGORITHM],
            audience="fastapi-users:refresh",
        )
        return uuid.UUID(data["sub"])
    except Exception:  # noqa: BLE001
        return None
