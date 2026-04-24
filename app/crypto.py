"""Symmetric encryption for sensitive values (API keys) using Fernet."""

from cryptography.fernet import Fernet

from app.config import settings

_fernet = Fernet(settings.FERNET_KEY.encode())


def encrypt(plain: str) -> str:
    return _fernet.encrypt(plain.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()


def mask(plain: str, keep_tail: int = 4) -> str:
    """Return a masked representation for safe display, e.g. sk-xxxx."""
    if not plain:
        return ""
    if len(plain) <= keep_tail:
        return "*" * len(plain)
    return plain[:3] + "*" * 6 + plain[-keep_tail:]
