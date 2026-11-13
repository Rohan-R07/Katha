import os


def database_url() -> str:
    value = os.environ.get("DATABASE_URL")
    if not value:
        return "sqlite:///./khata.db"
    if value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql+psycopg://", 1)
    elif value.startswith("postgresql://"):
        value = value.replace("postgresql://", "postgresql+psycopg://", 1)
    if value.startswith("sqlite"):
        return value
    if not value.startswith("postgresql+psycopg://"):
        raise RuntimeError("KHATA requires PostgreSQL or SQLite")
    return value


def signing_secret() -> str:
    # SESSION_SECRET is provisioned securely by the project; JWT_SECRET can override it.
    secret = os.environ.get("JWT_SECRET") or os.environ.get("SESSION_SECRET")
    if not secret or len(secret) < 32:
        raise RuntimeError("A server JWT_SECRET or SESSION_SECRET of at least 32 characters is required")
    return secret


COOKIE_NAME = "khata_session"
SESSION_HOURS = 24
