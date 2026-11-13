"""Persist itemized purchases alongside, not instead of, the shared ledger."""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint("uq_product_shop", "products", ["id", "shop_id"])
    op.create_unique_constraint("uq_transaction_customer_shop", "transactions", ["id", "customer_id", "shop_id"])
    op.create_table(
        "purchases",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("shop_id", sa.String(36), sa.ForeignKey("shops.id"), nullable=False),
        sa.Column("customer_id", sa.String(36), nullable=False),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("total", sa.Numeric(14, 2), nullable=False),
        sa.Column("payment_method", sa.String(10), nullable=False),
        sa.Column("credit_transaction_id", sa.String(36), unique=True),
        sa.Column("notes", sa.String(1000), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.UniqueConstraint("id", "shop_id", name="uq_purchase_shop"),
        sa.UniqueConstraint("shop_id", "idempotency_key", name="uq_purchase_key"),
        sa.ForeignKeyConstraint(["customer_id", "shop_id"], ["customers.id", "customers.shop_id"]),
        sa.ForeignKeyConstraint(
            ["credit_transaction_id", "customer_id", "shop_id"],
            ["transactions.id", "transactions.customer_id", "transactions.shop_id"],
        ),
        sa.CheckConstraint("total > 0", name="ck_purchase_total"),
        sa.CheckConstraint(
            "(payment_method IN ('cash','upi') AND credit_transaction_id IS NULL) OR "
            "(payment_method = 'khata' AND credit_transaction_id IS NOT NULL)",
            name="ck_purchase_payment_shape",
        ),
    )
    op.create_index("ix_purchase_customer_date", "purchases", ["shop_id", "customer_id", "purchased_at"])
    op.create_index("ix_purchase_shop_date", "purchases", ["shop_id", "purchased_at"])
    op.create_table(
        "purchase_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("purchase_id", sa.String(36), nullable=False),
        sa.Column("shop_id", sa.String(36), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.String(36)),
        sa.Column("product_name", sa.String(150), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit", sa.String(30), nullable=False),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(14, 2), nullable=False),
        sa.ForeignKeyConstraint(["purchase_id", "shop_id"], ["purchases.id", "purchases.shop_id"]),
        sa.ForeignKeyConstraint(["product_id", "shop_id"], ["products.id", "products.shop_id"]),
        sa.UniqueConstraint("purchase_id", "position", name="uq_purchase_item_position"),
        sa.CheckConstraint("quantity > 0", name="ck_purchase_item_quantity"),
        sa.CheckConstraint("unit_price >= 0 AND line_total >= 0", name="ck_purchase_item_prices"),
    )
    op.create_index("ix_purchase_items_purchase", "purchase_items", ["purchase_id"])


def downgrade():
    raise RuntimeError("Purchase history must not be discarded automatically. Review and back up before any destructive migration.")
