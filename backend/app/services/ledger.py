"""Only this service writes financial entries. Balances are always aggregates."""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
import hashlib
import json
from zoneinfo import ZoneInfo

from sqlalchemy import and_, case, exists, func, or_, select
from sqlalchemy.orm import Session, aliased

from backend.app.core.security import fail, lock_shop
from backend.app.database.models import Customer, Shop, Transaction, User
from backend.app.schemas.inputs import TransactionInput, ReversalInput

IST = ZoneInfo("Asia/Kolkata")
ZERO = Decimal("0.00")


def money(amount) -> str:
    return format(Decimal(amount or 0).quantize(Decimal("0.01")), ".2f")


def fingerprint(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def day_bounds(day: date):
    start = datetime.combine(day, time.min, tzinfo=IST)
    return start.astimezone(timezone.utc), (start + timedelta(days=1)).astimezone(timezone.utc)


def today() -> date:
    return datetime.now(IST).date()


def entity(obj, fields):
    return {field: (getattr(obj, field).isoformat() if isinstance(getattr(obj, field), datetime) else getattr(obj, field)) for field in fields}


CUSTOMER_FIELDS = ["id", "shop_id", "customer_name", "mobile_number", "address", "notes", "contact_details", "created_at"]


def totals_subquery(shop_id: str, before: datetime | None = None):
    original = aliased(Transaction)
    t = Transaction
    credit = case(
        (t.transaction_type == "credit", t.amount),
        (and_(t.transaction_type == "reversal", original.transaction_type == "credit"), -t.amount),
        else_=0,
    )
    payment = case(
        (t.transaction_type == "payment", t.amount),
        (and_(t.transaction_type == "reversal", original.transaction_type == "payment"), -t.amount),
        else_=0,
    )
    statement = select(
        t.customer_id.label("customer_id"),
        func.sum(t.amount * t.direction).label("balance"),
        func.sum(credit).label("total_credit"),
        func.sum(payment).label("total_payments"),
    ).outerjoin(original, t.reversal_of == original.id).where(t.shop_id == shop_id)
    if before:
        statement = statement.where(t.created_at < before)
    return statement.group_by(t.customer_id).subquery()


def customer_query(shop_id: str, before=None):
    totals = totals_subquery(shop_id, before)
    query = select(
        Customer, func.coalesce(totals.c.balance, 0),
        func.coalesce(totals.c.total_credit, 0), func.coalesce(totals.c.total_payments, 0),
    ).outerjoin(totals, totals.c.customer_id == Customer.id).where(Customer.shop_id == shop_id)
    if before:
        query = query.where(Customer.created_at < before)
    return query


def customer_json(row):
    customer, balance, credit, payments = row
    return {**entity(customer, CUSTOMER_FIELDS), "balance": money(balance), "total_credit": money(credit), "total_payments": money(payments)}


def get_customer(db: Session, shop_id: str, customer_id: str):
    row = db.execute(customer_query(shop_id).where(Customer.id == customer_id)).first()
    if not row:
        fail(404, "Customer not found in your shop.", "customer_not_found")
    return customer_json(row)


def customers(db: Session, shop_id: str, search=None, balance_status="all", before=None):
    query = customer_query(shop_id, before)
    if search:
        query = query.where(or_(
            Customer.customer_name.ilike(f"%{search}%"), Customer.mobile_number.ilike(f"%{search}%"),
        ))
    rows = [customer_json(row) for row in db.execute(query.order_by(Customer.customer_name, Customer.id))]
    if balance_status == "outstanding":
        rows = [r for r in rows if Decimal(r["balance"]) > 0]
    elif balance_status == "settled":
        rows = [r for r in rows if Decimal(r["balance"]) == 0]
    elif balance_status == "advance":
        rows = [r for r in rows if Decimal(r["balance"]) < 0]
    return rows


def transaction_query(shop_id: str):
    reversal = aliased(Transaction)
    is_reversed = exists(select(reversal.id).where(reversal.reversal_of == Transaction.id))
    return select(Transaction, Customer.customer_name, User.name, is_reversed).join(
        Customer, Transaction.customer_id == Customer.id,
    ).join(User, Transaction.created_by == User.id).where(Transaction.shop_id == shop_id)


def transaction_json(row):
    tx, customer_name, user_name, is_reversed = row
    return {
        **entity(tx, ["id", "shop_id", "customer_id", "transaction_type", "description", "created_at", "created_by", "idempotency_key", "reversal_of", "source"]),
        "amount": money(tx.amount), "signed_amount": money(tx.amount * tx.direction),
        "customer_name": customer_name, "created_by_name": user_name, "is_reversed": is_reversed,
    }


def get_transaction(db: Session, shop_id: str, tx_id: str):
    row = db.execute(transaction_query(shop_id).where(Transaction.id == tx_id)).first()
    if not row:
        fail(404, "Transaction not found in your shop.", "transaction_not_found")
    return transaction_json(row)


def transactions(db: Session, shop_id: str, search=None, customer_id=None, transaction_type=None, date_from=None, date_to=None, limit=100, offset=0):
    query = transaction_query(shop_id)
    if customer_id:
        query = query.where(Transaction.customer_id == customer_id)
    if transaction_type:
        query = query.where(Transaction.transaction_type == transaction_type)
    if search:
        query = query.where(or_(
            Customer.customer_name.ilike(f"%{search}%"),
            Transaction.description.ilike(f"%{search}%"),
            Transaction.id.ilike(f"%{search}%"),
        ))
    if date_from:
        query = query.where(Transaction.created_at >= day_bounds(date_from)[0])
    if date_to:
        query = query.where(Transaction.created_at < day_bounds(date_to)[1])
    query = query.order_by(Transaction.created_at.desc(), Transaction.id.desc())
    if limit is not None:
        query = query.limit(limit).offset(offset)
    return [transaction_json(row) for row in db.execute(query)]


def find_retry(db: Session, shop_id: str, key: str, signature: str):
    existing = db.scalar(select(Transaction).where(Transaction.shop_id == shop_id, Transaction.idempotency_key == key))
    if existing:
        if existing.request_fingerprint != signature:
            fail(409, "This submission key was already used for a different operation.", "idempotency_conflict")
        return existing
    return None


def add_entry(db: Session, shop: Shop, user: User, payload: TransactionInput, source="dashboard") -> Transaction:
    lock_shop(db, shop)
    signature = fingerprint(payload.model_dump(exclude={"idempotency_key"}))
    retry = find_retry(db, shop.id, payload.idempotency_key, signature)
    if retry:
        return retry
    customer = db.scalar(select(Customer).where(Customer.id == payload.customer_id, Customer.shop_id == shop.id))
    if not customer:
        fail(404, "Customer not found in your shop.", "customer_not_found")
    # Overpayments intentionally become a negative balance (customer advance), never a fake zero.
    entry = Transaction(
        shop_id=shop.id, customer_id=customer.id, transaction_type=payload.transaction_type,
        amount=Decimal(payload.amount), direction=1 if payload.transaction_type == "credit" else -1,
        description=payload.description, created_by=user.id,
        idempotency_key=payload.idempotency_key, request_fingerprint=signature, source=source,
    )
    db.add(entry)
    db.flush()
    return entry


def reverse_entry(db: Session, shop: Shop, user: User, tx_id: str, payload: ReversalInput):
    lock_shop(db, shop)
    signature = fingerprint({"reversal_of": tx_id, "reason": payload.reason})
    retry = find_retry(db, shop.id, payload.idempotency_key, signature)
    if retry:
        return retry
    original = db.scalar(select(Transaction).where(Transaction.id == tx_id, Transaction.shop_id == shop.id).with_for_update())
    if not original:
        fail(404, "Transaction not found in your shop.", "transaction_not_found")
    if original.transaction_type == "reversal":
        fail(409, "A reversal cannot be reversed. Record a new corrected entry instead.", "invalid_reversal")
    if db.scalar(select(Transaction.id).where(Transaction.reversal_of == tx_id)):
        fail(409, "This entry has already been reversed.", "already_reversed")
    entry = Transaction(
        shop_id=shop.id, customer_id=original.customer_id, transaction_type="reversal",
        amount=original.amount, direction=-original.direction, description=payload.reason,
        created_by=user.id, idempotency_key=payload.idempotency_key,
        request_fingerprint=signature, reversal_of=original.id, source="correction",
    )
    db.add(entry)
    db.flush()
    return entry


def daily_aggregate(db: Session, shop_id: str, day: date):
    start, end = day_bounds(day)
    t = Transaction
    row = db.execute(select(
        func.coalesce(func.sum(case((t.transaction_type == "credit", t.amount), else_=0)), 0),
        func.coalesce(func.sum(case((t.transaction_type == "payment", t.amount), else_=0)), 0),
        func.coalesce(func.sum(case((t.transaction_type == "reversal", t.amount * t.direction), else_=0)), 0),
        func.count(t.id), func.count(func.distinct(t.customer_id)),
    ).where(t.shop_id == shop_id, t.created_at >= start, t.created_at < end)).one()
    return {"date": day.isoformat(), "credit": money(row[0]), "payments": money(row[1]), "reversals": money(row[2]), "transaction_count": row[3], "active_customers": row[4]}


def balance_totals(rows):
    return {
        "total_outstanding": money(sum((max(Decimal(c["balance"]), ZERO) for c in rows), ZERO)),
        "total_advance": money(sum((max(-Decimal(c["balance"]), ZERO) for c in rows), ZERO)),
    }


def summary(db: Session, shop: Shop):
    # All writers use this same shop lock; totals and activity cannot see a half-changed shop.
    lock_shop(db, shop)
    day = today()
    rows = customers(db, shop.id)
    daily = [daily_aggregate(db, shop.id, day - timedelta(days=i)) for i in reversed(range(7))]
    return {
        "total_customers": len(rows), **balance_totals(rows),
        "total_credit": money(sum((Decimal(c["total_credit"]) for c in rows), ZERO)),
        "total_payments": money(sum((Decimal(c["total_payments"]) for c in rows), ZERO)),
        "today_credit": daily[-1]["credit"], "today_payments": daily[-1]["payments"],
        "today_transactions": daily[-1]["transaction_count"], "business_date": day.isoformat(),
        "recent_transactions": transactions(db, shop.id, limit=6),
        "daily_activity": daily,
        "top_customers": sorted((c for c in rows if Decimal(c["balance"]) > 0), key=lambda c: Decimal(c["balance"]), reverse=True)[:5],
    }


def daily_report(db: Session, shop: Shop, day: date):
    lock_shop(db, shop)
    aggregate = daily_aggregate(db, shop.id, day)
    rows = customers(db, shop.id, before=day_bounds(day)[1])
    return {
        "date": day.isoformat(), "total_credit": aggregate["credit"], "total_payments": aggregate["payments"],
        "reversal_net": aggregate["reversals"], "transaction_count": aggregate["transaction_count"],
        "customer_count": len(rows), "active_customers": aggregate["active_customers"], **balance_totals(rows),
        "transactions": transactions(db, shop.id, date_from=day, date_to=day, limit=None),
    }
