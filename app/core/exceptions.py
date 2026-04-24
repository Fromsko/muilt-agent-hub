"""Unified exception hierarchy and global FastAPI exception handlers."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AgentHubException(Exception):
    """Base exception with HTTP status code and structured detail."""

    status_code: int = 500
    default_message: str = "Internal server error"

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.default_message
        super().__init__(self.detail)


class NotFoundError(AgentHubException):
    status_code = 404
    default_message = "Resource not found"


class PermissionDeniedError(AgentHubException):
    status_code = 403
    default_message = "Permission denied"


class BadRequestError(AgentHubException):
    status_code = 400
    default_message = "Bad request"


class UnauthorizedError(AgentHubException):
    status_code = 401
    default_message = "Unauthorized"


class ExternalServiceError(AgentHubException):
    status_code = 502
    default_message = "External service error"


class RateLimitError(AgentHubException):
    status_code = 429
    default_message = "Too many requests"


def _build_body(code: int, message: str, detail: str | None = None) -> dict:
    body: dict = {"code": code, "message": message}
    if detail is not None:
        body["detail"] = detail
    return body


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all custom exception handlers to the app instance."""

    @app.exception_handler(AgentHubException)
    async def _hub_exc(_request: Request, exc: AgentHubException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_body(exc.status_code, exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_build_body(422, "Validation error", detail=str(exc.errors())),
        )
