"""Admin User CRUD —— 仅超级管理员可访问。

管理员用户管理接口，用于创建、更新、删除系统用户。
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.backend import current_superuser
from app.auth.manager import UserManager
from app.auth.schemas import UserCreate
from app.db import get_async_session
from app.models.user import User, get_user_db

router = APIRouter()


class UserReadAdmin(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    is_superuser: bool
    is_verified: bool = False

    model_config = {"from_attributes": True}


class UserCreateAdmin(BaseModel):
    email: str
    password: str
    is_superuser: bool = False
    is_active: bool = True


class UserUpdateAdmin(BaseModel):
    email: str | None = None
    is_superuser: bool | None = None
    is_active: bool | None = None


@router.get("", response_model=list[UserReadAdmin])
async def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> list[UserReadAdmin]:
    result = await session.execute(select(User).order_by(User.id.desc()).limit(limit).offset(offset))
    users = result.scalars().all()
    return [
        UserReadAdmin(
            id=u.id,
            email=u.email,
            is_active=u.is_active,
            is_superuser=u.is_superuser,
            is_verified=getattr(u, "is_verified", False),
        )
        for u in users
    ]


@router.post("", response_model=UserReadAdmin, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateAdmin,
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> UserReadAdmin:
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    user_data = UserCreate(
        email=payload.email,
        password=payload.password,
        is_superuser=payload.is_superuser,
        is_active=payload.is_active,
    )

    new_user = None
    async for user_db in get_user_db(session):
        user_manager = UserManager(user_db)
        new_user = await user_manager.create(user_create=user_data, safe=False)
        break

    if new_user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )

    await session.refresh(new_user)
    return UserReadAdmin(
        id=new_user.id,
        email=new_user.email,
        is_active=new_user.is_active,
        is_superuser=new_user.is_superuser,
        is_verified=getattr(new_user, "is_verified", False),
    )


@router.patch("/{user_id}", response_model=UserReadAdmin)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdateAdmin,
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> UserReadAdmin:
    result = await session.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.id == user.id and payload.is_superuser is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove superuser status from yourself",
        )

    if payload.email is not None and payload.email != target_user.email:
        existing = await session.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )
        target_user.email = payload.email

    if payload.is_superuser is not None:
        target_user.is_superuser = payload.is_superuser

    if payload.is_active is not None:
        target_user.is_active = payload.is_active

    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)

    return UserReadAdmin(
        id=target_user.id,
        email=target_user.email,
        is_active=target_user.is_active,
        is_superuser=target_user.is_superuser,
        is_verified=getattr(target_user, "is_verified", False),
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    result = await session.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    if target_user.is_superuser:
        admin_count_result = await session.execute(select(func.count(User.id)).where(User.is_superuser == True))  # noqa: E712
        admin_count = admin_count_result.scalar() or 0
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin user",
            )

    await session.delete(target_user)
    await session.commit()
