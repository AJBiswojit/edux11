"""Application logging — console + rotating files under LOG_DIR (default backend/logs)."""

from __future__ import annotations

import json
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

import structlog

from app.core.config import get_settings

_CONFIGURED = False

_HEAD_KEYS = ("timestamp", "level", "logger", "event")


def _ordered_event(event_dict: dict) -> dict:
    ordered: dict = {}
    for key in _HEAD_KEYS:
        if key in event_dict:
            ordered[key] = event_dict[key]
    for key, value in event_dict.items():
        if key not in ordered:
            ordered[key] = value
    return ordered


def _timestamp_first(_, __, event_dict: dict) -> dict:
    return _ordered_event(event_dict)


def _render_json(_, __, event_dict: dict) -> str:
    return json.dumps(_ordered_event(event_dict), default=str, ensure_ascii=False)


class _FlushRotatingFileHandler(RotatingFileHandler):
    """Write JSON lines with timestamp first, even if a formatter dumped keys last."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            if isinstance(record.msg, dict):
                text = json.dumps(_ordered_event(dict(record.msg)), default=str, ensure_ascii=False)
            else:
                text = self.format(record)
                try:
                    parsed = json.loads(text)
                except (json.JSONDecodeError, TypeError):
                    parsed = None
                if isinstance(parsed, dict):
                    text = json.dumps(_ordered_event(parsed), default=str, ensure_ascii=False)
            if self.shouldRollover(record):
                self.doRollover()
            self.stream.write(text + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)


def _resolve_log_dir(raw: str) -> Path:
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def setup_logging(*, force: bool = False) -> Path:
    """Attach console + file handlers. Call with force=True in lifespan (Uvicorn resets logging)."""
    global _CONFIGURED
    settings = get_settings()
    log_dir = _resolve_log_dir(settings.log_dir)

    if _CONFIGURED and not force:
        return log_dir

    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    shared = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        _timestamp_first,
    ]

    structlog.configure(
        processors=[*shared, structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=False,
    )

    json_formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            _render_json,
        ],
        foreign_pre_chain=shared,
        fmt="%(message)s",
    )

    file_handler = _FlushRotatingFileHandler(
        log_dir / "medixo.log",
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(json_formatter)

    error_handler = _FlushRotatingFileHandler(
        log_dir / "medixo-error.log",
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.WARNING)
    error_handler.setFormatter(json_formatter)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            processors=[
                structlog.stdlib.ProcessorFormatter.remove_processors_meta,
                structlog.dev.ConsoleRenderer(colors=settings.app_env == "development"),
            ],
            foreign_pre_chain=shared,
        )
    )

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    for name, logger in list(logging.root.manager.loggerDict.items()):
        if isinstance(logger, logging.Logger) and str(name).startswith("medixo"):
            logger.handlers.clear()
            logger.propagate = True
    root.addHandler(file_handler)
    root.addHandler(error_handler)
    root.addHandler(console_handler)

    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.access").propagate = True

    _CONFIGURED = True
    get_logger("medixo").info("logging_configured", log_dir=str(log_dir), level=settings.log_level)
    return log_dir


def get_logger(name: str = "medixo"):
    return structlog.get_logger(name)


def log_event(logger_name: str, level: str, event: str, **fields) -> None:
    """Log a structured event through the standard logging chain.

    Routes through stdlib logging so every configured handler (including
    medixo-error.log for WARNING+ events) receives the record.
    """
    logger = structlog.get_logger(logger_name)
    log_fn = getattr(logger, level.lower(), logger.info)
    log_fn(event, **fields)
