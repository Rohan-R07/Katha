from decimal import Decimal
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.security import current_shop, current_user, fail, lock_shop
from backend.app.database.connection import get_db
from backend.app.database.models import Customer, Shop, User
from backend.app.schemas.inputs import CustomerInput, CustomerUpdate, TransactionInput
from backend.app.services import ledger

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("")
def list_customers(
    search: str | None = Query(default=None, max_length=150),
    balance_status: Literal["all", "outstanding", "settled", "advance"] = "all",
    shop: Shop = Depends(current_shop), db: Session = Depends(get_db),
):
    return ledger.customers(db, shop.id, search, balance_status)


@router.post("", status_code=201)
def create_customer(payload: CustomerInput, shop: Shop = Depends(current_shop), user: User = Depends(current_user), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    signature_data = payload.model_dump(exclude={"idempotency_key"})
    # Keep pre-integration import fingerprints valid when new metadata is absent.
    if payload.contact_details is None:
        signature_data.pop("contact_details")
    signature = ledger.fingerprint(signature_data)
    if payload.idempotency_key:
        existing = db.scalar(select(Customer).where(Customer.shop_id == shop.id, Customer.import_key == payload.idempotency_key))
        if existing:
            if existing.import_fingerprint != signature:
                fail(409, "This import key was already used for different customer details.", "idempotency_conflict")
            return ledger.get_customer(db, shop.id, existing.id)
    customer = Customer(
        shop_id=shop.id, **payload.model_dump(exclude={"opening_balance", "idempotency_key"}),
        import_key=payload.idempotency_key, import_fingerprint=signature,
    )
    db.add(customer)
    db.flush()
    if Decimal(payload.opening_balance) > 0:
        ledger.add_entry(db, shop, user, TransactionInput(
            customer_id=customer.id, transaction_type="credit", amount=payload.opening_balance,
            description="Opening balance migrated from existing khata", idempotency_key=str(uuid4()),
        ), source="opening_balance")
    db.commit()
    return ledger.get_customer(db, shop.id, customer.id)


@router.get("/{customer_id}")
def get_customer(customer_id: str, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    return ledger.get_customer(db, shop.id, customer_id)


@router.put("/{customer_id}")
def update_customer(customer_id: str, payload: CustomerUpdate, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    customer = db.scalar(select(Customer).where(Customer.id == customer_id, Customer.shop_id == shop.id))
    if not customer:
        fail(404, "Customer not found in your shop.", "customer_not_found")
    for key, value in payload.model_dump().items():
        if key == "contact_details" and key not in payload.model_fields_set:
            continue
        setattr(customer, key, value)
    db.commit()
    return ledger.get_customer(db, shop.id, customer.id)
