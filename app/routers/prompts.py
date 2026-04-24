"""Prompt CRUD endpoints, scoped per user.

Uses the generic CRUD router for the five standard endpoints.
"""

from app.core.crud_router import build_crud_router
from app.models.prompt import Prompt
from app.schemas.prompt import PromptCreate, PromptRead, PromptUpdate

router = build_crud_router(
    model_cls=Prompt,
    create_schema=PromptCreate,
    update_schema=PromptUpdate,
    read_schema=PromptRead,
    label="Prompt",
)
