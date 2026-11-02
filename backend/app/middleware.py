import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import log_event


class RequestLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())[:12]
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            log_event(
                "medixo.http",
                "error",
                "http_unhandled",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
            )
            raise
        duration_ms = round((time.perf_counter() - started) * 1000, 1)
        response.headers["x-request-id"] = request_id
        level = "warning" if response.status_code >= 400 else "info"
        log_event(
            "medixo.http",
            level,
            "http_request",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
        return response
