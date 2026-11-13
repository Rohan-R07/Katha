import logging
import os
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
import yaml

from backend.app.api import ai, auth, customers, documents, products, purchases, reports, shops, transactions
from backend.app.core.config import signing_secret
from backend.app.database.connection import engine

signing_secret()  # Fail startup clearly if the server is not configured.
logger = logging.getLogger("khata")
app = FastAPI(title="KHATA Shared Backend", version="1.0.0", docs_url="/api/docs", redoc_url="/api/redoc", openapi_url="/api/openapi.json")


@app.on_event("startup")
def init_db():
    from backend.app.database.connection import engine, Base, SessionLocal
    import backend.app.database.models  # noqa
    from backend.app.database.seed import seed_demo_data
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)

allowed_origins = [value.strip() for value in os.environ.get("CORS_ORIGINS", "").split(",") if value.strip()]
if allowed_origins:
    app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=True, allow_methods=["GET", "POST", "PUT", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])


@app.middleware("http")
async def same_origin_writes(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and origin:
        host = request.headers.get("x-forwarded-host", request.headers.get("host", "")).split(",")[0].strip()
        if urlparse(origin).netloc != host and origin not in allowed_origins:
            return JSONResponse(status_code=403, content={"error": "Cross-site request rejected.", "code": "origin_rejected"})
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(StarletteHTTPException)
async def http_error(request, exc):
    detail = exc.detail if isinstance(exc.detail, dict) else {"error": str(exc.detail), "code": "request_error"}
    return JSONResponse(status_code=exc.status_code, content=detail, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Do not return input values: registration validation could otherwise echo a password.
    issues = [{"field": ".".join(map(str, issue["loc"])), "message": issue["msg"]} for issue in exc.errors()]
    message = "; ".join(f"{issue['field']}: {issue['message']}" for issue in issues)
    return JSONResponse(status_code=422, content={"error": message, "code": "validation_error", "issues": issues})


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    logger.warning("A database constraint rejected a write")
    return JSONResponse(status_code=409, content={"error": "This operation conflicts with an existing record. Refresh and try again.", "code": "record_conflict"})


@app.exception_handler(SQLAlchemyError)
async def database_error(request, exc):
    logger.error("Database operation failed: %s", exc, exc_info=True)
    return JSONResponse(status_code=503, content={"error": f"Database operation failed: {str(exc)}", "code": "database_unavailable"})


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    logger.error("Unexpected request failure (%s)", type(exc).__name__)
    return JSONResponse(status_code=500, content={"error": "The request could not be completed. Please try again.", "code": "internal_error"})


@app.get("/api/healthz", tags=["Health"])
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok"}


for router in [auth.router, shops.router, customers.router, transactions.router, reports.router, products.router, purchases.router, ai.router, documents.router]:
    app.include_router(router, prefix="/api")

# The checked-in contract generates the frontend and is also served by Swagger.
# Runtime validation uses the corresponding strict Pydantic models.
contract_path = Path(__file__).resolve().parents[2] / "lib/api-spec/openapi.yaml"
with contract_path.open() as contract_file:
    contract = yaml.safe_load(contract_file)
app.openapi = lambda: contract
