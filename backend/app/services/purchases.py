"""Immutable itemized purchases. Existing ledger service owns all balance changes."""
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from backend.app.core.security import fail, lock_shop
from backend.app.database.models import Customer, Product, Purchase, PurchaseItem, Shop, Transaction, User, new_id
from backend.app.schemas.inputs import TransactionInput
from backend.app.schemas.purchases import PurchaseInput
from backend.app.services import ledger

MAX_MONEY = Decimal("999999999999.99")
CENT = Decimal("0.01")


def create(db: Session, shop: Shop, user: User, payload: PurchaseInput) -> Purchase:
    lock_shop(db, shop)
    signature = ledger.fingerprint(payload.model_dump(exclude={"idempotency_key"}))
    previous = db.scalar(select(Purchase).where(Purchase.shop_id == shop.id, Purchase.idempotency_key == payload.idempotency_key))
    if previous:
        if previous.request_fingerprint != signature:
            fail(409, "This purchase key was already used for different bill details.", "idempotency_conflict")
        return previous
    # Do not accept caller-owned shop, timestamp, total, or ledger-entry IDs.
    ledger.get_customer(db, shop.id, payload.customer_id)
    purchase_id = new_id()
    items = []
    total = Decimal("0.00")
    for position, item in enumerate(payload.items, start=1):
        name = item.product_name
        if item.product_id:
            product = db.scalar(select(Product).where(Product.id == item.product_id, Product.shop_id == shop.id))
            if not product:
                fail(404, "A selected product was not found in your shop.", "product_not_found")
            name = product.product_name
        quantity, unit_price = Decimal(item.quantity), Decimal(item.unit_price)
        # Round each line once, then sum. This matches the client integer-paise preview.
        line_total = (quantity * unit_price).quantize(CENT, rounding=ROUND_HALF_UP)
        total += line_total
        if line_total > MAX_MONEY or total > MAX_MONEY:
            fail(422, "The purchase exceeds the maximum supported bill amount.", "purchase_total_out_of_range")
        items.append(PurchaseItem(
            purchase_id=purchase_id, shop_id=shop.id, position=position,
            product_id=item.product_id, product_name=name, quantity=quantity, unit=item.unit,
            unit_price=unit_price, line_total=line_total,
        ))
    if total <= 0:
        fail(422, "The bill total must be greater than zero.", "purchase_total_required")
    credit = None
    if payload.payment_method == "khata":
        credit = ledger.add_entry(db, shop, user, TransactionInput(
            customer_id=payload.customer_id, transaction_type="credit", amount=ledger.money(total),
            description=f"Itemized purchase {purchase_id}",
            idempotency_key=f"purchase:{purchase_id}",
        ), source="purchase")
    is_sqlite = db.bind and db.bind.dialect.name == "sqlite"
    ts = datetime.now(timezone.utc) if is_sqlite else func.clock_timestamp()
    purchase = Purchase(
        id=purchase_id, shop_id=shop.id, customer_id=payload.customer_id,
        # Actual database wall clock after acquiring the shop lock, not client time.
        purchased_at=ts,
        total=total, payment_method=payload.payment_method,
        credit_transaction_id=credit.id if credit else None, notes=payload.notes,
        created_by=user.id, idempotency_key=payload.idempotency_key,
        request_fingerprint=signature, items=items,
    )
    db.add(purchase)
    db.flush()
    return purchase


def query(shop_id: str):
    reversal = select(Transaction.id).where(Transaction.reversal_of == Purchase.credit_transaction_id).scalar_subquery()
    return select(Purchase, Customer.customer_name, User.name, reversal.label("reversal_id")).join(
        Customer, Customer.id == Purchase.customer_id,
    ).join(User, User.id == Purchase.created_by).where(Purchase.shop_id == shop_id)


def serialize(row):
    purchase, customer_name, user_name, reversal_id = row
    return {
        **ledger.entity(purchase, [
            "id", "shop_id", "customer_id", "purchased_at", "payment_method",
            "credit_transaction_id", "notes", "created_by",
        ]),
        "customer_name": customer_name, "created_by_name": user_name, "timezone": "Asia/Kolkata",
        "total": ledger.money(purchase.total), "credit_reversal_id": reversal_id,
        "payment_status": ("credit_reversed" if reversal_id else "on_account") if purchase.payment_method == "khata" else "paid",
        "items": [{
            **ledger.entity(item, ["id", "position", "product_id", "product_name", "unit"]),
            "quantity": format(item.quantity, ".3f"), "unit_price": ledger.money(item.unit_price),
            "line_total": ledger.money(item.line_total),
        } for item in purchase.items],
    }


def get(db: Session, shop_id: str, purchase_id: str):
    row = db.execute(query(shop_id).where(Purchase.id == purchase_id)).first()
    if not row:
        fail(404, "Purchase not found in your shop.", "purchase_not_found")
    return serialize(row)


def history(db: Session, shop: Shop, customer_id=None, date_from=None, date_to=None, search=None, limit=20, offset=0):
    lock_shop(db, shop)
    if customer_id:
        ledger.get_customer(db, shop.id, customer_id)
    statement = query(shop.id)
    if customer_id:
        statement = statement.where(Purchase.customer_id == customer_id)
    if date_from:
        statement = statement.where(Purchase.purchased_at >= ledger.day_bounds(date_from)[0])
    if date_to:
        statement = statement.where(Purchase.purchased_at < ledger.day_bounds(date_to)[1])
    if search:
        item_match = select(PurchaseItem.id).where(
            PurchaseItem.purchase_id == Purchase.id, PurchaseItem.product_name.ilike(f"%{search}%"),
        ).exists()
        statement = statement.where(or_(Customer.customer_name.ilike(f"%{search}%"), item_match))
    count = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.execute(statement.order_by(Purchase.purchased_at.desc(), Purchase.id.desc()).limit(limit).offset(offset))
    return {"purchases": [serialize(row) for row in rows], "total_count": count, "limit": limit, "offset": offset, "timezone": "Asia/Kolkata"}


def daily_totals(db: Session, shop_id: str, day: date):
    start, end = ledger.day_bounds(day)
    row = db.execute(select(
        func.count(Purchase.id), func.coalesce(func.sum(Purchase.total), 0),
        *[func.coalesce(func.sum(case((Purchase.payment_method == method, Purchase.total), else_=0)), 0) for method in ("cash", "upi", "khata")],
    ).where(Purchase.shop_id == shop_id, Purchase.purchased_at >= start, Purchase.purchased_at < end)).one()
    return {
        "purchase_count": row[0], "purchase_total": ledger.money(row[1]),
        "cash_sales": ledger.money(row[2]), "upi_sales": ledger.money(row[3]), "khata_sales": ledger.money(row[4]),
    }
