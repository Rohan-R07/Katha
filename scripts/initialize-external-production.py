"""One-time external production initialization; never run on startup or build.

The source is the existing development engine, used in a read-only snapshot.
The target must be a distinct, empty Neon database. Existing Alembic migrations
and all application rows are transferred in one target transaction. Nothing is
exported to disk. Credentials are supplied only through the process environment.
"""
import argparse
from datetime import date, datetime, timezone
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from psycopg import sql
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from backend.app.database.connection import Base, engine
from backend.app.database import models  # noqa: F401


class Refused(RuntimeError):
    pass


def canonical(value):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, (date, Decimal)):
        return str(value)
    raise TypeError("Unsupported database value")


def fingerprint(connection, table):
    digest = hashlib.sha256()
    rows = connection.execute(select(table).order_by(*table.primary_key.columns)).mappings()
    count = 0
    for row in rows:
        digest.update(json.dumps(dict(row), sort_keys=True, default=canonical, ensure_ascii=False).encode())
        digest.update(b"\n")
        count += 1
    return count, digest.digest()


def initialize(execute):
    url = make_url(os.environ["KHATA_TARGET_DATABASE_URL"])
    if url.host != os.environ["KHATA_TARGET_HOST"] or not url.host.endswith(".neon.tech"):
        raise Refused("Target must match the explicitly authorized Neon host.")
    if url.host == engine.url.host:
        raise Refused("Source and target must be different databases.")
    if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
        raise Refused("Only PostgreSQL is supported.")
    url = url.set(drivername="postgresql+psycopg")
    target_engine = create_engine(url, poolclass=NullPool, hide_parameters=True,
                                  connect_args={"connect_timeout": 20})
    config = Config(str(ROOT / "backend/alembic.ini"))
    head = ScriptDirectory.from_config(config).get_current_head()
    tables = list(Base.metadata.sorted_tables)
    allowed = {table.name for table in tables} | {"alembic_version"}

    try:
        with engine.connect().execution_options(isolation_level="REPEATABLE READ") as source:
            with source.begin(), target_engine.begin() as target:
                source.execute(text("SET TRANSACTION READ ONLY"))
                if source.execute(text("SELECT version_num FROM alembic_version")).scalar_one() != head:
                    raise Refused("Source schema must match the current migration head.")
                existing = set(inspect(target).get_table_names(schema="public"))
                if existing - allowed:
                    raise Refused("Target contains unrelated tables; no changes were made.")
                for table in tables:
                    if table.name in existing and target.scalar(select(func.count()).select_from(table)):
                        raise Refused("Target contains application records; refusing to overwrite or merge.")
                expected = {table.name: fingerprint(source, table) for table in tables}
                counts = {name: count for name, (count, _) in expected.items()}
                if not execute:
                    return {"status": "dry_run_passed", "source_revision": head, "record_counts": counts}

                config.attributes["connection"] = target
                command.upgrade(config, "head")

                # Binary COPY preserves SQL NULL vs JSON null, decimals, IDs and
                # timestamps without decoding/recomputing financial records.
                for table in tables:
                    columns = sql.SQL(", ").join(sql.Identifier(column.name) for column in table.columns)
                    name = sql.Identifier("public", table.name)
                    export = sql.SQL("COPY {} ({}) TO STDOUT (FORMAT BINARY)").format(name, columns)
                    ingest = sql.SQL("COPY {} ({}) FROM STDIN (FORMAT BINARY)").format(name, columns)
                    with source.connection.driver_connection.cursor() as reader:
                        with target.connection.driver_connection.cursor() as writer:
                            with reader.copy(export) as outgoing, writer.copy(ingest) as incoming:
                                for block in outgoing:
                                    incoming.write(block)
                    if fingerprint(target, table) != expected[table.name]:
                        raise Refused("Transferred records failed integrity verification; changes rolled back.")
                if target.execute(text("SELECT version_num FROM alembic_version")).scalar_one() != head:
                    raise Refused("Target migration revision verification failed.")
            # Both the schema and copied records commit only after all checks.
        return {"status": "migration_verified", "revision": head, "record_counts": counts,
                "all_record_fingerprints_match": True, "source_read_only": True}
    finally:
        target_engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Initialize the confirmed empty target.")
    args = parser.parse_args()
    try:
        print(json.dumps(initialize(args.execute)))
    except Exception as error:
        # Driver errors may contain connection information. Do not echo them.
        print(json.dumps({"status": "failed", "error_type": type(error).__name__,
                          **({"reason": str(error)} if isinstance(error, Refused) else {})}))
        sys.exit(1)
