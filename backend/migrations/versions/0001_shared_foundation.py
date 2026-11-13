"""Shared KHATA schema. Apply manually to development; never at application startup."""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Frozen schema snapshot: later model edits must not change this migration.
    op.create_table("users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("mobile_number", sa.String(16), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table("auth_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_table("shops",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("shop_name", sa.String(150), nullable=False),
        sa.Column("shop_type", sa.String(80), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("contact_number", sa.String(16), nullable=False),
        sa.Column("preferred_language", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table("customers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("shop_id", sa.String(36), sa.ForeignKey("shops.id"), nullable=False),
        sa.Column("customer_name", sa.String(150), nullable=False),
        sa.Column("mobile_number", sa.String(16), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("import_key", sa.String(128)),
        sa.Column("import_fingerprint", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("id", "shop_id", name="uq_customer_shop"),
        sa.UniqueConstraint("shop_id", "import_key", name="uq_customer_import"),
    )
    op.create_index("ix_customers_shop_id", "customers", ["shop_id"])
    op.create_index("ix_customer_shop_name", "customers", ["shop_id", "customer_name"])
    op.create_table("transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("shop_id", sa.String(36), sa.ForeignKey("shops.id"), nullable=False),
        sa.Column("customer_id", sa.String(36), nullable=False),
        sa.Column("transaction_type", sa.String(10), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("direction", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("reversal_of", sa.String(36), unique=True),
        sa.Column("source", sa.String(30), nullable=False),
        sa.UniqueConstraint("shop_id", "idempotency_key", name="uq_transaction_key"),
        sa.UniqueConstraint("id", "shop_id", name="uq_transaction_shop"),
        sa.ForeignKeyConstraint(["customer_id", "shop_id"], ["customers.id", "customers.shop_id"]),
        sa.ForeignKeyConstraint(["reversal_of", "shop_id"], ["transactions.id", "transactions.shop_id"]),
        sa.CheckConstraint("amount > 0", name="ck_transaction_positive"),
        sa.CheckConstraint("direction IN (-1, 1)", name="ck_transaction_direction"),
        sa.CheckConstraint("transaction_type IN ('credit', 'payment', 'reversal')", name="ck_transaction_type"),
        sa.CheckConstraint(
            "(transaction_type = 'credit' AND direction = 1 AND reversal_of IS NULL) OR "
            "(transaction_type = 'payment' AND direction = -1 AND reversal_of IS NULL) OR "
            "(transaction_type = 'reversal' AND reversal_of IS NOT NULL)", name="ck_transaction_shape",
        ),
    )
    op.create_index("ix_transactions_shop_date", "transactions", ["shop_id", "created_at"])
    op.create_index("ix_transactions_customer_date", "transactions", ["customer_id", "created_at"])
    op.create_table("product_categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("shop_id", sa.String(36), sa.ForeignKey("shops.id"), nullable=False),
        sa.Column("category_name", sa.String(100), nullable=False),
        sa.UniqueConstraint("shop_id", "category_name", name="uq_category_name"),
        sa.UniqueConstraint("id", "shop_id", name="uq_category_shop"),
    )
    op.create_index("ix_product_categories_shop_id", "product_categories", ["shop_id"])
    op.create_table("products",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("shop_id", sa.String(36), sa.ForeignKey("shops.id"), nullable=False),
        sa.Column("product_name", sa.String(150), nullable=False),
        sa.Column("category_id", sa.String(36)),
        sa.Column("price", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["category_id", "shop_id"], ["product_categories.id", "product_categories.shop_id"]),
        sa.CheckConstraint("price >= 0", name="ck_product_price"),
    )
    op.create_index("ix_product_shop_name", "products", ["shop_id", "product_name"])
    op.create_table("ai_conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("shop_id", sa.String(36), sa.ForeignKey("shops.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("shop_id", "user_id", "session_id", name="uq_ai_session"),
    )
    op.create_index("ix_ai_conversations_shop_id", "ai_conversations", ["shop_id"])


def downgrade():
    raise RuntimeError("Financial history is protected; use an approved checkpoint recovery, not a destructive downgrade.")
