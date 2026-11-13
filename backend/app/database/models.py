from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index,
    Integer, Numeric, String, Text, UniqueConstraint, func, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

JSONType = JSON().with_variant(JSONB, "postgresql")

from backend.app.database.connection import Base


def new_id() -> str:
    return str(uuid4())


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    mobile_number: Mapped[str] = mapped_column(String(16))
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Shop(Base):
    __tablename__ = "shops"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    shop_name: Mapped[str] = mapped_column(String(150))
    shop_type: Mapped[str] = mapped_column(String(80), default="Kirana")
    address: Mapped[str] = mapped_column(Text, default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    state: Mapped[str] = mapped_column(String(100), default="")
    contact_number: Mapped[str] = mapped_column(String(16), default="")
    preferred_language: Mapped[str] = mapped_column(String(30), default="en")
    profile_details: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("id", "shop_id", name="uq_customer_shop"),
        UniqueConstraint("shop_id", "import_key", name="uq_customer_import"),
        Index("ix_customer_shop_name", "shop_id", "customer_name"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    customer_name: Mapped[str] = mapped_column(String(150))
    mobile_number: Mapped[str] = mapped_column(String(16), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    contact_details: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    import_key: Mapped[str | None] = mapped_column(String(128))
    import_fingerprint: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("shop_id", "idempotency_key", name="uq_transaction_key"),
        UniqueConstraint("id", "shop_id", name="uq_transaction_shop"),
        UniqueConstraint("id", "customer_id", "shop_id", name="uq_transaction_customer_shop"),
        ForeignKeyConstraint(["customer_id", "shop_id"], ["customers.id", "customers.shop_id"]),
        ForeignKeyConstraint(["reversal_of", "shop_id"], ["transactions.id", "transactions.shop_id"]),
        CheckConstraint("amount > 0", name="ck_transaction_positive"),
        CheckConstraint("direction IN (-1, 1)", name="ck_transaction_direction"),
        CheckConstraint("transaction_type IN ('credit', 'payment', 'reversal')", name="ck_transaction_type"),
        CheckConstraint(
            "(transaction_type = 'credit' AND direction = 1 AND reversal_of IS NULL) OR "
            "(transaction_type = 'payment' AND direction = -1 AND reversal_of IS NULL) OR "
            "(transaction_type = 'reversal' AND reversal_of IS NOT NULL)", name="ck_transaction_shape",
        ),
        Index("ix_transactions_shop_date", "shop_id", "created_at"),
        Index("ix_transactions_customer_date", "customer_id", "created_at"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"))
    customer_id: Mapped[str] = mapped_column(String(36))
    transaction_type: Mapped[str] = mapped_column(String(10))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    direction: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    request_fingerprint: Mapped[str] = mapped_column(String(64))
    reversal_of: Mapped[str | None] = mapped_column(String(36), unique=True)
    source: Mapped[str] = mapped_column(String(30), default="dashboard")


class ProductCategory(Base):
    __tablename__ = "product_categories"
    __table_args__ = (
        UniqueConstraint("shop_id", "category_name", name="uq_category_name"),
        UniqueConstraint("id", "shop_id", name="uq_category_shop"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    category_name: Mapped[str] = mapped_column(String(100))


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("id", "shop_id", name="uq_product_shop"),
        ForeignKeyConstraint(["category_id", "shop_id"], ["product_categories.id", "product_categories.shop_id"]),
        CheckConstraint("price >= 0", name="ck_product_price"),
        Index("ix_product_shop_name", "shop_id", "product_name"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"))
    product_name: Mapped[str] = mapped_column(String(150))
    category_id: Mapped[str | None] = mapped_column(String(36))
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    catalog_details: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Purchase(Base):
    """One immutable bill, linked to the existing customer and optional ledger credit."""
    __tablename__ = "purchases"
    __table_args__ = (
        UniqueConstraint("id", "shop_id", name="uq_purchase_shop"),
        UniqueConstraint("shop_id", "idempotency_key", name="uq_purchase_key"),
        ForeignKeyConstraint(["customer_id", "shop_id"], ["customers.id", "customers.shop_id"]),
        ForeignKeyConstraint(
            ["credit_transaction_id", "customer_id", "shop_id"],
            ["transactions.id", "transactions.customer_id", "transactions.shop_id"],
        ),
        CheckConstraint("total > 0", name="ck_purchase_total"),
        CheckConstraint(
            "(payment_method IN ('cash','upi') AND credit_transaction_id IS NULL) OR "
            "(payment_method = 'khata' AND credit_transaction_id IS NOT NULL)",
            name="ck_purchase_payment_shape",
        ),
        Index("ix_purchase_customer_date", "shop_id", "customer_id", "purchased_at"),
        Index("ix_purchase_shop_date", "shop_id", "purchased_at"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"))
    customer_id: Mapped[str] = mapped_column(String(36))
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    payment_method: Mapped[str] = mapped_column(String(10))
    credit_transaction_id: Mapped[str | None] = mapped_column(String(36), unique=True)
    notes: Mapped[str] = mapped_column(String(1000), default="")
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    request_fingerprint: Mapped[str] = mapped_column(String(64))
    items: Mapped[list["PurchaseItem"]] = relationship(lazy="selectin", order_by="PurchaseItem.position")


class PurchaseItem(Base):
    """Historical snapshots: later catalog edits never rewrite a bill."""
    __tablename__ = "purchase_items"
    __table_args__ = (
        ForeignKeyConstraint(["purchase_id", "shop_id"], ["purchases.id", "purchases.shop_id"]),
        ForeignKeyConstraint(["product_id", "shop_id"], ["products.id", "products.shop_id"]),
        UniqueConstraint("purchase_id", "position", name="uq_purchase_item_position"),
        CheckConstraint("quantity > 0", name="ck_purchase_item_quantity"),
        CheckConstraint("unit_price >= 0 AND line_total >= 0", name="ck_purchase_item_prices"),
        Index("ix_purchase_items_purchase", "purchase_id"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    purchase_id: Mapped[str] = mapped_column(String(36))
    shop_id: Mapped[str] = mapped_column(String(36))
    position: Mapped[int] = mapped_column(Integer)
    product_id: Mapped[str | None] = mapped_column(String(36))
    product_name: Mapped[str] = mapped_column(String(150))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    unit: Mapped[str] = mapped_column(String(30))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2))


class AiConversation(Base):
    __tablename__ = "ai_conversations"
    __table_args__ = (UniqueConstraint("shop_id", "user_id", "session_id", name="uq_ai_session"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    session_id: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
