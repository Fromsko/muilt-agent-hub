# ref_013 — 对外 API Token 设计模式

> 对应任务：B1 对外 API Key
> 来源：
> - https://www.bearer.com/blog/api-key-management（API Key 最佳实践综述）
> - OpenAI API Key 格式设计（`sk-` prefix + 随机字符串）
> - Stripe API Key 文档（`sk_` / `pk_` prefix 约定）
> 可信度：★★★★☆ 行业通用模式
> 最后访问：2026-04-22

---

## 1. Token 格式设计

### 1.1 业界惯例

| 平台 | 格式 | 示例 |
|---|---|---|
| OpenAI | `sk-{48随机字符}` | `sk-abc123...xyz` |
| Stripe | `sk_live_{24}` / `sk_test_{24}` | `sk_live_51abc...` |
| GitHub | `ghp_{36}` / `github_pat_{59}` | `ghp_xxxx...` |
| Slack | `xoxb-{team}-{12}-{token}` | `xoxb-123-456-abc` |

### 1.2 本项目建议格式

```
ah_{32位随机字符}
```

- `ah_` = AgentHub 前缀，一眼识别来源
- 32 位 = `secrets.token_urlsafe(24)` → 约 32 字符

```python
import secrets

def generate_api_token() -> str:
    return f"ah_{secrets.token_urlsafe(24)}"
# 输出: ah_xK9m2pLqR4nT7wYzA1bC3dE5fG8hJ0
```

---

## 2. 存储方案：Hash 后存储

**核心原则**：数据库只存 hash，原始 token 只在创建时返回一次。

### 2.1 Token 验证流程

```
用户请求: Authorization: Bearer ah_xK9m2pLqR4nT7wYzA1bC3dE5fG8hJ0
          ↓
取出前缀 ah_，从 DB 查找匹配记录
          ↓
对请求中的 token 做 hash，与 DB 中的 hash 比对
          ↓
匹配则认证通过，注入 user 对象
```

### 2.2 Hash 算法选择

| 算法 | 速度 | 安全性 | 推荐场景 |
|---|---|---|---|
| SHA-256 | 极快 | 足够 | Token 验证（推荐） |
| bcrypt | 慢 | 最高 | 密码存储 |
| HMAC-SHA256 | 快 | 高 | 需要密钥的场景 |

**推荐 SHA-256**：API Token 本身是高熵随机串（不像密码），无需 bcrypt 的慢哈希。

```python
import hashlib

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
```

---

## 3. 数据库模型

```python
# app/models/api_token.py

import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel


class ApiToken(SQLModel, table=True):
    __tablename__ = "api_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=200)  # 用户自定义名称
    prefix: str = Field(max_length=10)  # "ah_" 用于快速筛选
    token_hash: str = Field(nullable=False, unique=True, index=True)  # SHA-256 hash
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: datetime | None = Field(default=None)
    enabled: bool = Field(default=True)
```

---

## 4. 认证依赖：双轨认证

需要一个 FastAPI 依赖，同时支持 JWT 和 API Token：

```python
# app/auth/platform.py

from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.api_token import ApiToken
from app.models.user import User


async def get_current_user_dual(
    authorization: str = Header(None),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    """同时支持 JWT Bearer 和 API Token (ah_xxx)"""

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing credentials")

    token = authorization[7:]  # 去掉 "Bearer "

    if token.startswith("ah_"):
        # API Token 认证
        import hashlib
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        result = await session.execute(
            select(ApiToken).where(
                ApiToken.token_hash == token_hash,
                ApiToken.enabled == True,
            )
        )
        api_token = result.scalar_one_or_none()
        if api_token is None:
            raise HTTPException(status_code=401, detail="Invalid API token")

        # 更新 last_used_at
        from datetime import datetime
        api_token.last_used_at = datetime.utcnow()
        session.add(api_token)
        await session.commit()

        # 获取用户
        user_result = await session.execute(
            select(User).where(User.id == api_token.user_id)
        )
        user = user_result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="User not active")
        return user
    else:
        # JWT 认证（委托给 fastapi-users）
        # 这里需要内部调用 fastapi-users 的验证逻辑
        raise HTTPException(status_code=401, detail="Use JWT auth for this endpoint")
```

### 4.1 公开端点使用

```python
# app/routers/public.py

from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/public", tags=["public"])

@router.post("/agents/{agent_id}/chat")
async def public_chat(
    agent_id: int,
    payload: ChatRequest,
    user: User = Depends(get_current_user_dual),  # 双轨认证
):
    # 后续逻辑与现有 chat 一致...
    # 但需注意：只能访问 user 自己的 agent
    pass
```

---

## 5. CRUD 路由

```python
# app/routers/api_tokens.py

@router.post("", response_model=ApiTokenRead)
async def create_token(
    payload: ApiTokenCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    raw_token = generate_api_token()  # ah_xxx
    token_hash = hash_token(raw_token)

    api_token = ApiToken(
        user_id=user.id,
        name=payload.name,
        prefix="ah_",
        token_hash=token_hash,
    )
    session.add(api_token)
    await session.commit()
    await session.refresh(api_token)

    # 返回时附带明文 token（仅此一次）
    return ApiTokenReadWithToken(
        **api_token.model_dump(),
        token=raw_token,  # 只在创建时返回
    )
```

---

## 6. 安全要点

| 要点 | 说明 |
|---|---|
| Token 仅返回一次 | 创建时返回明文，之后只返回 `ah_****xxxx` |
| Hash 存储 | DB 不存明文，丢失库不会泄露 token |
| Prefix 快速筛选 | `ah_` 前缀可快速定位，不需全表扫描 hash |
| last_used_at | 追踪使用情况，支持清理僵尸 token |
| 可禁用 | `enabled` 字段，无需删除即可暂停 |
| 独立于 JWT | API Token 走 `/public/` 路由，不干扰管理端 JWT |
