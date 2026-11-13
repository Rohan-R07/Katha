from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.security import current_shop, current_user, fail
from backend.app.database.connection import get_db
from backend.app.database.models import Shop, User
from backend.app.schemas.inputs import PaymentInput, ReversalInput, TransactionInput
from backend.app.services import ledger

router = APIRouter(tags=["Financial ledger"])


@router.get("/transactions")
def list_transactions(
    search: str | None = Query(default=None, max_length=150), customer_id: str | None = None,
    transaction_type: Literal["credit", "payment", "reversal"] | None = None,
    date_from: date | None = None, date_to: date | None = None,
    limit: int = Query(default=100, ge=1, le=1000), offset: int = Query(default=0, ge=0),
    shop: Shop = Depends(current_shop), db: Session = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        fail(422, "Start date must be on or before end date.", "invalid_date_range")
    return ledger.transactions(db, shop.id, search, customer_id, transaction_type, date_from, date_to, limit, offset)


@router.post("/transactions", status_code=201)
def create_transaction(payload: TransactionInput, shop: Shop = Depends(current_shop), user: User = Depends(current_user), db: Session = Depends(get_db)):
    entry = ledger.add_entry(db, shop, user, payload)
    db.commit()
    return ledger.get_transaction(db, shop.id, entry.id)


@router.get("/transactions/{transaction_id}")
def get_transaction(transaction_id: str, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    return ledger.get_transaction(db, shop.id, transaction_id)


@router.post("/transactions/{transaction_id}/reverse", status_code=201)
def reverse_transaction(transaction_id: str, payload: ReversalInput, shop: Shop = Depends(current_shop), user: User = Depends(current_user), db: Session = Depends(get_db)):
    entry = ledger.reverse_entry(db, shop, user, transaction_id, payload)
    db.commit()
    return ledger.get_transaction(db, shop.id, entry.id)


@router.post("/payments", status_code=201)
def record_payment(payload: PaymentInput, shop: Shop = Depends(current_shop), user: User = Depends(current_user), db: Session = Depends(get_db)):
    entry = ledger.add_entry(db, shop, user, TransactionInput(transaction_type="payment", **payload.model_dump()))
    db.commit()
    return ledger.get_transaction(db, shop.id, entry.id)
