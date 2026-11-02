from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.db.base import Base
from app.db.session import SessionLocal, engine, ensure_schema
from app.models import identity as _identity  # noqa: F401
from app.models import catalog as _catalog  # noqa: F401
from app.models import people as _people  # noqa: F401
from app.models import assessment as _assessment  # noqa: F401
from app.models import ai_papers as _ai_papers  # noqa: F401
from app.models import exams as _exams  # noqa: F401
from app.models import interventions as _interventions  # noqa: F401
from app.models import intelligence as _intelligence  # noqa: F401
from app.models import ai as _ai  # noqa: F401
from app.models import teaching as _teaching  # noqa: F401
from app.models import ops as _ops  # noqa: F401
from app.models import capabilities as _capabilities  # noqa: F401
from app.middleware import RequestLogMiddleware

log = get_logger("medixo")


def _boot_schema() -> None:
    ensure_schema()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.services.seed import demo_counts
        from app.services.spa_documents import seed_spa_documents

        # Demo user/student/faculty seeding is permanently disabled — the DB now
        # holds real data. seed_if_empty is intentionally no longer called.
        academic = None
        spa = None
        try:
            spa = seed_spa_documents(db)
        except Exception:
            db.rollback()
            log.exception("spa_seed_failed")
        log.info("schema_ready", **demo_counts(db), academic=academic, spa=spa)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    import asyncio as _asyncio
    from app.services.pg_submission_queue import PgQueueWorker

    settings = get_settings()
    setup_logging(force=True)
    try:
        _boot_schema()
    except Exception as exc:
        log.warning("schema_boot_deferred", error=str(exc))

    worker_task = None
    cache_task = None

    if settings.queue_enabled:
        worker = PgQueueWorker(settings)
        worker_task = _asyncio.create_task(worker.start(), name="pg_queue_worker")
        log.info("pg_queue_worker_launched", concurrency=settings.queue_worker_concurrency)

    if os.environ.get("PYTEST_CURRENT_TEST") is None:
        from app.services.admin_intel_cache import background_refresh_loop

        cache_task = _asyncio.create_task(background_refresh_loop(), name="admin_intel_cache")
        log.info("admin_intel_cache_loop_launched")

    log.info("app_started", env=settings.app_env, version=__version__)
    yield

    for task in (worker_task, cache_task):
        if task is not None:
            task.cancel()
            try:
                await task
            except _asyncio.CancelledError:
                pass

    log.info("app_stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging()
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Enterprise FastAPI backend for MediXO EduX (auth, academics, assessment, exam attempts, intelligence, AI gateway).",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.add_middleware(RequestLogMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    # Pipeline crops: DB stores "media/pdf_extract/…"; files live in backend/media/pdf_extract/…
    from fastapi.staticfiles import StaticFiles
    from app.services.media_urls import media_root

    media_path = media_root()
    app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

    @app.get("/health")
    def health():
        return {"status": "ok", "version": __version__, "env": settings.app_env}

    return app


app = create_app()
