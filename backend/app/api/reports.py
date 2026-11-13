from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.security import current_shop, lock_shop
from backend.app.database.connection import get_db
from backend.app.database.models import Shop
from backend.app.services import ledger, purchases

router = APIRouter(tags=["Khata and reports"])


@router.get("/khata/summary")
def summary(shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    return ledger.summary(db, shop)


@router.get("/khata/customers/{customer_id}")
def customer_khata(customer_id: str, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    return {
        "customer": ledger.get_customer(db, shop.id, customer_id),
        "transactions": ledger.transactions(db, shop.id, customer_id=customer_id, limit=None),
    }


@router.get("/reports/daily")
def daily_report(date: date | None = None, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    day = date or ledger.today()
    return {**ledger.daily_report(db, shop, day), **purchases.daily_totals(db, shop.id, day)}
