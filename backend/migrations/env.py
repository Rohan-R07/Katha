from alembic import context

from backend.app.database.connection import Base, engine
from backend.app.database import models  # noqa: F401

def migrate(connection):
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


# Explicit external-production connections can reuse these exact migrations.
# Normal local Alembic commands continue using the existing development engine.
provided = context.config.attributes.get("connection")
if provided is not None:
    migrate(provided)
else:
    with engine.connect() as connection:
        migrate(connection)
