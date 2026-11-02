from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "MediXO EduX API"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/v1"

    secret_key: str = "dev-only-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    # Extra minutes past sitting.expires_at that mid-exam auth remains valid
    # (autosave / late submit after the clock hits zero).
    exam_auth_grace_minutes: int = Field(default=60, ge=5, le=360)

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/medixo_edux"
    db_schema: str = "edux"
    redis_url: str = "redis://localhost:6379/0"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Question figure crops pushed under backend/media (served at /media/…).
    # PUBLIC_ORIGIN must be the API host the browser can reach (no /v1 suffix).
    media_dir: str = "media"
    public_origin: str = "http://localhost:8000"

    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    anthropic_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    ai_max_tokens: int = 2048

    # External AI Paper Generation microservice (3-agent Kimi pipeline).
    # EduX triggers generation here; the service writes ai_generated_papers /
    # ai_generated_paper_questions into the shared DB, EduX reads them back.
    ai_paper_api_url: str = "http://18.60.0.133:8000"
    ai_paper_api_timeout: int = 30

    parent_portal_enabled: bool = False
    seed_demo_users: bool = False
    demo_password: str = "aurora123"

    log_level: str = "INFO"
    log_dir: str = "logs"
    log_max_bytes: int = 10 * 1024 * 1024
    log_backup_count: int = 10

    # Queue-based exam submission
    queue_enabled: bool = True
    queue_max_retries: int = Field(default=3, ge=1, le=10)
    queue_retry_delay_seconds: int = Field(default=5, ge=1, le=300)
    queue_status_ttl_seconds: int = Field(default=86400, ge=3600, le=604800)
    queue_worker_concurrency: int = Field(default=4, ge=1, le=32)
    # A job stuck in 'processing' longer than this (worker crashed mid-job) is
    # reclaimed and retried.
    queue_stale_processing_seconds: int = Field(default=300, ge=30, le=3600)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
