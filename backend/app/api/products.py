from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.security import current_shop, fail, lock_shop
from backend.app.database.connection import get_db
from backend.app.database.models import Product, ProductCategory, Shop
from backend.app.schemas.inputs import CategoryInput, ProductInput
from backend.app.services.ledger import entity, money

router = APIRouter(tags=["Catalog"])


def product_json(db: Session, product: Product):
    category = db.get(ProductCategory, product.category_id) if product.category_id else None
    return {
        **entity(product, ["id", "shop_id", "product_name", "category_id", "catalog_details", "created_at"]),
        "price": money(product.price), "category_name": category.category_name if category else None,
    }


def check_category(db: Session, shop: Shop, category_id: str | None):
    if category_id and not db.scalar(select(ProductCategory.id).where(ProductCategory.id == category_id, ProductCategory.shop_id == shop.id)):
        fail(404, "Category not found in your shop.", "category_not_found")


@router.get("/categories")
def list_categories(shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    return [entity(c, ["id", "shop_id", "category_name"]) for c in db.scalars(select(ProductCategory).where(ProductCategory.shop_id == shop.id).order_by(ProductCategory.category_name))]


@router.post("/categories", status_code=201)
def create_category(payload: CategoryInput, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    if db.scalar(select(ProductCategory.id).where(ProductCategory.shop_id == shop.id, ProductCategory.category_name == payload.category_name)):
        fail(409, "This category already exists.", "category_exists")
    category = ProductCategory(shop_id=shop.id, **payload.model_dump())
    db.add(category)
    db.commit()
    return entity(category, ["id", "shop_id", "category_name"])


@router.get("/products")
def list_products(
    search: str | None = Query(default=None, max_length=150), category_id: str | None = None,
    shop: Shop = Depends(current_shop), db: Session = Depends(get_db),
):
    statement = select(Product).where(Product.shop_id == shop.id)
    if search:
        statement = statement.where(Product.product_name.ilike(f"%{search}%"))
    if category_id:
        statement = statement.where(Product.category_id == category_id)
    return [product_json(db, p) for p in db.scalars(statement.order_by(Product.product_name))]


@router.post("/products", status_code=201)
def create_product(payload: ProductInput, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    check_category(db, shop, payload.category_id)
    product = Product(shop_id=shop.id, product_name=payload.product_name, price=Decimal(payload.price), category_id=payload.category_id,
                      catalog_details=payload.catalog_details.model_dump() if payload.catalog_details else None)
    db.add(product)
    db.commit()
    return product_json(db, product)


@router.put("/products/{product_id}")
def update_product(product_id: str, payload: ProductInput, shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    lock_shop(db, shop)
    product = db.scalar(select(Product).where(Product.id == product_id, Product.shop_id == shop.id))
    if not product:
        fail(404, "Product not found in your shop.", "product_not_found")
    check_category(db, shop, payload.category_id)
    product.product_name, product.price, product.category_id = payload.product_name, Decimal(payload.price), payload.category_id
    if "catalog_details" in payload.model_fields_set:
        product.catalog_details = payload.catalog_details.model_dump() if payload.catalog_details else None
    db.commit()
    return product_json(db, product)
