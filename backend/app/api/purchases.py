from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.security import current_shop, current_user, fail, lock_shop
from backend.app.database.connection import get_db
from backend.app.database.models import Shop, User
from backend.app.schemas.purchases import PurchaseInput
from backend.app.services import purchases

router = APIRouter(prefix="/purchases", tags=["Itemized purchases"])


@router.post("", status_code=201)
def create_purchase(payload: PurchaseInput, shop: Shop = Depends(current_shop), user: User = Depends(current_user), db: Session = Depends(get_db)):
    purchase = purchases.create(db, shop, user, payload)
    db.commit()
    return purchases.get(db, shop.id, purchase.id)


@router.get("")
def list_purchases(
    customer_id: str | None = Query(default=None, max_length=36),
    date_from: date | None = None, date_to: date | None = None,
    search: str | None = Query(default=None, max_length=150),
    limit: int = Query(default=20, ge=1, le=100), offset: int = Query(default=0, ge=0),
    shop: Shop = Depends(current_shop), db: Session = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        fail(422, "Start date must be on or before end date.", "invalid_date_range")
    return purchases.history(db, shop, customer_id, date_from, date_to, search, limit, offset)


@router.get("/{purchase_id}")
def get_purchase(purchase_id: str, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    return purchases.get(db, shop.id, purchase_id)
