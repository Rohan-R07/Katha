"""API-only hosting adapter. Vercel serves frontend files separately."""
import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger("khata.hosting")


class BackendNotConfigured(RuntimeError):
    pass


def load_backend() -> ASGIApp:
    # This config module has no DB connection or model imports. Keep the strict
    # existing checks, but do not run them while Vercel discovers frontend assets.
    from backend.app.core.config import database_url, signing_secret

    try:
        database_url()
        signing_secret()
    except RuntimeError:
        raise BackendNotConfigured from None

    from backend.app.main import app as backend
    return backend


class BackendGateway:
    def __init__(self, loader=load_backend):
        self.loader = loader
        self.backend = None

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if self.backend is None:
            try:
                self.backend = self.loader()
            except Exception as error:
                missing = isinstance(error, BackendNotConfigured)
                if not missing:
                    # Do not log exception messages, which may contain DB details.
                    logger.error("Backend startup failed (%s)", type(error).__name__)
                if scope["type"] == "websocket":
                    await send({"type": "websocket.close", "code": 1013})
                    return
                response = JSONResponse(
                    status_code=503,
                    content={
                        "error": (
                            "KHATA is not connected to a production database on this deployment. "
                            "Customer records, login and financial operations are unavailable until "
                            "the server database connection and signing secret are configured."
                            if missing else
                            "The KHATA backend could not start. No operation has been confirmed. "
                            "Check this deployment's server logs."
                        ),
                        "code": "backend_not_configured" if missing else "backend_startup_failed",
                    },
                    headers={"Cache-Control": "no-store", "Retry-After": "60", "X-Content-Type-Options": "nosniff"},
                )
                await response(scope, receive, send)
                return

        # Preserve the original API URL, request body, cookies and origin.
        forwarded = dict(scope)
        await self.backend(forwarded, receive, send)


def create_hosting_app(loader=load_backend) -> FastAPI:
    hosting = FastAPI(title="KHATA hosting adapter", docs_url=None, redoc_url=None, openapi_url=None)
    hosting.mount("/", BackendGateway(loader))
    return hosting


app = create_hosting_app()
