"""Website 1 contract tests against the existing PostgreSQL and ledger services."""
from uuid import uuid4
from decimal import Decimal

from sqlalchemy import select

from backend.app.database.models import Customer, Product, Shop, Transaction


def test_website1_shop_profile_language_and_legacy_update(client, db):
    response = client.post("/api/auth/register", json={
        "name": "Onboarding Test", "email": f"{uuid4().hex}@example.com",
        "mobile_number": "9876543210", "password": "integration-test-only-123",
    })
    assert response.status_code == 201
    assert response.json()["shop"] is None
    payload = {
        "shop_name": "Website One Test Shop", "preferred_language": "kn",
        "contact_number": "9876543210", "profile_details": {
            "alternate_phone": "9876543211", "upi_id": "test@upi",
            "shopkeeper_name": "Onboarding Test", "pincode": "560001",
        },
    }
    shop = client.post("/api/shops", json=payload)
    assert shop.status_code == 201, shop.text
    shop_id = shop.json()["id"]
    assert client.get("/api/auth/me").json()["shop"]["profile_details"]["upi_id"] == "test@upi"
    updated = client.put("/api/shops/me", json={"shop_name": "Dashboard edited", "preferred_language": "hi"})
    assert updated.status_code == 200
    assert updated.json()["profile_details"]["alternate_phone"] == "9876543211"
    db.expire_all()
    saved = db.get(Shop, shop_id)
    assert saved.preferred_language == "hi"
    assert saved.profile_details["upi_id"] == "test@upi"
    assert client.post("/api/shops", json=payload).status_code == 409


def test_opening_balance_import_shared_dashboard_and_exactly_once(client, shop, db):
    payload = {
        "customer_name": "Imported Website One Customer", "mobile_number": "9876543210",
        "opening_balance": "500.25", "idempotency_key": str(uuid4()),
        "contact_details": {
            "alternate_phone": "9876543211", "alternate_phone_label": "Family", "credit_limit": "5000.00",
        },
    }
    first = client.post("/api/customers", json=payload)
    assert first.status_code == 201, first.text
    customer = first.json()
    second = client.post("/api/customers", json=payload)
    assert second.json()["id"] == customer["id"]
    assert second.json()["balance"] == "500.25"
    rows = list(db.scalars(select(Transaction).where(Transaction.customer_id == customer["id"])))
    assert len(rows) == 1
    assert rows[0].source == "opening_balance" and rows[0].amount == Decimal("500.25")
    assert client.get("/api/khata/summary").json()["total_outstanding"] == "500.25"
    assert client.get("/api/khata/customers/" + customer["id"]).json()["customer"]["balance"] == "500.25"
    assert any(c["id"] == customer["id"] for c in client.get("/api/customers").json())
    # Old dashboard edits must not discard Website 1 contact metadata or change money.
    edited = client.put("/api/customers/" + customer["id"], json={"customer_name": "Edited by dashboard"})
    assert edited.status_code == 200
    assert edited.json()["balance"] == "500.25"
    assert edited.json()["contact_details"]["alternate_phone"] == "9876543211"
    db.expire_all()
    assert db.get(Customer, customer["id"]).contact_details["credit_limit"] == "5000.00"
    changed = {**payload, "contact_details": {**payload["contact_details"], "alternate_phone_label": "Changed"}}
    assert client.post("/api/customers", json=changed).status_code == 409


def test_website1_catalog_metadata_survives_dashboard_updates(client, shop, db):
    category = client.post("/api/categories", json={"category_name": "Website One Staples"}).json()
    payload = {
        "product_name": "Test Rice", "category_id": category["id"], "price": "62.50",
        "catalog_details": {
            "pricing_type": "per_kg", "unit": "kg", "name_kannada": "ಅಕ್ಕಿ",
            "voice_keywords": ["rice", "akki"], "stock_quantity": 12.5, "is_available": True,
        },
    }
    response = client.post("/api/products", json=payload)
    assert response.status_code == 201, response.text
    product_id = response.json()["id"]
    updated = client.put(f"/api/products/{product_id}", json={
        "product_name": "Rice edited in dashboard", "category_id": category["id"], "price": "63.25",
    })
    assert updated.status_code == 200
    assert updated.json()["catalog_details"]["voice_keywords"] == ["rice", "akki"]
    db.expire_all()
    saved = db.get(Product, product_id)
    assert saved.price == Decimal("63.25")
    assert saved.catalog_details["stock_quantity"] == 12.5
    listed = client.get("/api/products").json()
    assert any(p["id"] == product_id and p["category_name"] == "Website One Staples" for p in listed)


def test_metadata_rejects_duplicate_financial_state_and_invalid_contacts(client, shop):
    assert client.post("/api/customers", json={
        "customer_name": "Invalid Contact", "contact_details": {"alternate_phone": "abc"},
    }).status_code == 422
    assert client.post("/api/customers", json={
        "customer_name": "No extra balance", "contact_details": {"balance": "500.00"},
    }).status_code == 422
    assert client.post("/api/products", json={
        "product_name": "No duplicate price", "price": "10.00", "catalog_details": {"price": "20.00"},
    }).status_code == 422
    assert client.post("/api/products", json={
        "product_name": "No negative stock", "price": "10.00", "catalog_details": {"stock_quantity": -1},
    }).status_code == 422


def test_existing_import_fingerprint_remains_compatible(client, shop, db):
    from backend.app.services.ledger import fingerprint
    payload = {"customer_name": "Pre-integration import", "mobile_number": "", "address": "",
               "notes": "", "opening_balance": "0.00"}
    key = str(uuid4())
    customer = Customer(shop_id=shop["id"], customer_name=payload["customer_name"],
                        import_key=key, import_fingerprint=fingerprint(payload))
    db.add(customer)
    db.commit()
    response = client.post("/api/customers", json={**payload, "idempotency_key": key})
    assert response.status_code == 201, response.text
    assert response.json()["id"] == customer.id
