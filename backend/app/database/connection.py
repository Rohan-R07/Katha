from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.app.core.config import database_url


class Base(DeclarativeBase):
    pass


db_url = database_url()
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        hide_parameters=True,
    )
else:
    engine = create_engine(
        db_url, pool_pre_ping=True, pool_size=5, max_overflow=5,
        isolation_level="READ COMMITTED", hide_parameters=True,
    )
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        try:
            yield db
        except Exception:
            db.rollback()
            raise
