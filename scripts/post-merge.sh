#!/bin/bash
set -e
pnpm install --frozen-lockfile
# KHATA owns its schema in SQLAlchemy/Alembic, not the unused Drizzle starter.
# This hook targets development only; publishing manages the production schema diff.
uv sync --frozen
python -m alembic -c backend/alembic.ini upgrade head
