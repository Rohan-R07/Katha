from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.auth import SHOP_FIELDS
from backend.app.core.security import current_shop, current_user, fail, lock_shop
from backend.app.database.connection import get_db
from backend.app.database.models import Shop, User
from backend.app.schemas.inputs import ShopInput
from backend.app.services.ledger import entity

router = APIRouter(prefix="/shops", tags=["Shops"])


@router.post("", status_code=201)
def create_shop(payload: ShopInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    if db.scalar(select(Shop.id).where(Shop.owner_id == user.id)):
        fail(409, "This account already has a shop.", "shop_exists")
    shop = Shop(owner_id=user.id, **payload.model_dump())
    db.add(shop)
    db.commit()
    return entity(shop, SHOP_FIELDS)


@router.get("/me")
def get_shop(shop: Shop = Depends(current_shop)):
    return entity(shop, SHOP_FIELDS)


@router.put("/me")
def update_shop(payload: ShopInput, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    for key, value in payload.model_dump().items():
        if key == "profile_details" and key not in payload.model_fields_set:
            continue
        setattr(shop, key, value)
    db.commit()
    return entity(shop, SHOP_FIELDS)
