"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "dev"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/app.db"
    JWT_SECRET: str
    JWT_LIFETIME_SECONDS: int = 86400
    REFRESH_TOKEN_LIFETIME_SECONDS: int = 604800  # 7 days
    FERNET_KEY: str
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]


settings = Settings()
