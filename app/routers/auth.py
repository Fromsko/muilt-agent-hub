"""Auth and user-self-management routers (exposed under /api/v1).

Adds a custom ``POST /jwt/refresh`` endpoint on top of the fastapi-users
standard JWT flow so the frontend can silently renew access tokens.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.backend import (
    auth_backend,
    create_refresh_token,
    current_active_user,
    fastapi_users,
    get_jwt_strategy,
    verify_refresh_token,
)
from app.auth.schemas import UserRead, UserUpdate
from app.db import get_async_session
from app.models.user import User

auth_router = APIRouter()
auth_router.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/jwt")


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@auth_router.post("/jwt/refresh", response_model=RefreshResponse)
async def refresh_token(
    body: RefreshRequest,
    session: AsyncSession = Depends(get_async_session),
) -> RefreshResponse:
    """Exchange a valid refresh token for a fresh access + refresh token pair."""
    user_id = verify_refresh_token(body.refresh_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive or not found",
        )
    strategy = get_jwt_strategy()
    access_token = await strategy.write_token(user)
    new_refresh = create_refresh_token(user.id)
    return RefreshResponse(access_token=access_token, refresh_token=new_refresh)


@auth_router.get("/jwt/refresh-token")
async def get_refresh_token_for_user(
    user: User = Depends(current_active_user),
) -> dict[str, str]:
    """Convenience endpoint: return a refresh token for the currently logged-in user."""
    return {"refresh_token": create_refresh_token(user.id)}


users_router = APIRouter()
users_router.include_router(fastapi_users.get_users_router(UserRead, UserUpdate))
