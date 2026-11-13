"""Add optional Website 1 metadata without changing ledger or existing records."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("shops", sa.Column("profile_details", postgresql.JSONB(), nullable=True))
    op.add_column("customers", sa.Column("contact_details", postgresql.JSONB(), nullable=True))
    op.add_column("products", sa.Column("catalog_details", postgresql.JSONB(), nullable=True))


def downgrade():
    raise RuntimeError("Removing onboarding metadata discards shop data. Review and back up before any destructive migration.")
