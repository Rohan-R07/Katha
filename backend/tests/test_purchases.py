"""Purchase/ledger integration against real PostgreSQL, rolled back after each test."""
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from backend.app.database.models import Product, Purchase, PurchaseItem, Shop, Transaction, User
from backend.app.schemas.purchases import PurchaseInput
from backend.app.services import purchases
from backend.tests.conftest import create_account


def bill(customer, method="khata", **changes):
    return {
        "customer_id": customer["id"], "payment_method": method,
        "items": [{"product_name": "Rice", "quantity": "2", "unit": "kg", "unit_price": "26.25"}],
        "idempotency_key": str(uuid4()), **changes,
    }


def test_purchase_stores_item_snapshots_timestamp_and_one_credit(client, customer, db):
    category = client.post("/api/categories", json={"category_name": "Staples"}).json()
    product = client.post("/api/products", json={
        "product_name": "Rice catalog name", "price": "26.25", "category_id": category["id"],
        "catalog_details": {"unit": "kg", "stock_quantity": 12.5},
    }).json()
    payload = bill(customer, items=[
        {"product_id": product["id"], "product_name": "Do not trust client name", "quantity": "2", "unit": "kg", "unit_price": "26.25"},
        {"product_name": "Carry bag", "quantity": "1", "unit": "piece", "unit_price": "0.25"},
    ], notes="Customer purchase")
    response = client.post("/api/purchases", json=payload)
    assert response.status_code == 201, response.text
    purchase = response.json()
    assert purchase["total"] == "52.75"
    assert purchase["items"][0]["product_name"] == "Rice catalog name"
    assert purchase["items"][0]["quantity"] == "2.000"
    assert purchase["items"][0]["line_total"] == "52.50"
    assert purchase["items"][1]["unit"] == "piece"
    assert purchase["payment_status"] == "on_account"
    assert purchase["credit_transaction_id"] and purchase["credit_reversal_id"] is None
    assert purchase["timezone"] == "Asia/Kolkata"
    recorded = datetime.fromisoformat(purchase["purchased_at"])
    assert recorded.utcoffset() is not None
    assert abs((datetime.now(timezone.utc) - recorded).total_seconds()) < 60
    db.expire_all()
    persisted = db.get(Purchase, purchase["id"])
    assert persisted.total == Decimal("52.75") and len(persisted.items) == 2
    assert db.get(Product, product["id"]).catalog_details["stock_quantity"] == 12.5
    credit = db.get(Transaction, purchase["credit_transaction_id"])
    assert credit.source == "purchase" and credit.amount == Decimal("52.75")
    assert credit.customer_id == customer["id"] and credit.shop_id == purchase["shop_id"]
    assert client.get(f'/api/customers/{customer["id"]}').json()["balance"] == "52.75"
    assert client.get(f'/api/purchases/{purchase["id"]}').json()["items"] == purchase["items"]
    # Catalog edits never alter historical product names, units, quantities or prices.
    client.put(f'/api/products/{product["id"]}', json={"product_name": "Renamed rice", "price": "99.00"})
    old = client.get(f'/api/purchases/{purchase["id"]}').json()
    assert old["items"][0]["product_name"] == "Rice catalog name"
    assert old["items"][0]["unit_price"] == "26.25"


def test_purchase_idempotency_normalizes_decimals_and_rejects_changes(client, customer, db):
    payload = bill(customer)
    first = client.post("/api/purchases", json=payload).json()
    second = client.post("/api/purchases", json={
        **payload, "items": [{**payload["items"][0], "quantity": "2.000", "unit_price": "26.25"}],
    })
    assert second.status_code == 201
    assert second.json()["id"] == first["id"]
    assert second.json()["credit_transaction_id"] == first["credit_transaction_id"]
    assert db.scalar(select(func.count()).select_from(Purchase).where(Purchase.customer_id == customer["id"])) == 1
    assert db.scalar(select(func.count()).select_from(Transaction).where(Transaction.customer_id == customer["id"])) == 1
    assert client.post("/api/purchases", json={**payload, "payment_method": "cash"}).status_code == 409
    assert client.post("/api/purchases", json={**payload, "items": [{
        **payload["items"][0], "unit_price": "26.26",
    }]}).status_code == 409
    assert client.get(f'/api/customers/{customer["id"]}').json()["balance"] == "52.50"


def test_cash_upi_purchases_are_not_repayments_and_reports_do_not_double_count(client, customer, db):
    client.post("/api/transactions", json={
        "customer_id": customer["id"], "transaction_type": "credit",
        "amount": "500.00", "idempotency_key": str(uuid4()),
    })
    for method, price in [("cash", "20.00"), ("upi", "33.50")]:
        response = client.post("/api/purchases", json=bill(customer, method, items=[
            {"product_name": "Paid goods", "quantity": "1", "unit": "piece", "unit_price": price},
        ]))
        assert response.status_code == 201, response.text
        assert response.json()["payment_status"] == "paid"
        assert response.json()["credit_transaction_id"] is None
        assert client.get(f'/api/customers/{customer["id"]}').json()["balance"] == "500.00"
    credit = client.post("/api/purchases", json=bill(customer)).json()
    assert client.get(f'/api/customers/{customer["id"]}').json()["balance"] == "552.50"
    # Repayment is a separate existing payment operation, never a second purchase.
    client.post("/api/payments", json={"customer_id": customer["id"], "amount": "100.00", "idempotency_key": str(uuid4())})
    assert client.get(f'/api/customers/{customer["id"]}').json()["balance"] == "452.50"
    assert client.get(f'/api/purchases/{credit["id"]}').json()["payment_status"] == "on_account"
    report = client.get("/api/reports/daily").json()
    assert report["total_credit"] == "552.50"
    assert report["total_payments"] == "100.00"
    assert report["transaction_count"] == 3
    assert report["purchase_count"] == 3
    assert report["purchase_total"] == "106.00"
    assert report["cash_sales"] == "20.00" and report["upi_sales"] == "33.50"
    assert report["khata_sales"] == "52.50"
    assert db.scalar(select(func.count()).select_from(Purchase).where(Purchase.customer_id == customer["id"])) == 3


def test_fractional_quantities_round_each_line_half_up_and_sum_exactly(client, customer):
    response = client.post("/api/purchases", json=bill(customer, "cash", items=[
        {"product_name": "Weighted goods", "quantity": "0.333", "unit": "kg", "unit_price": "10.05"},
        {"product_name": "Tiny portion", "quantity": "0.005", "unit": "kg", "unit_price": "1.00"},
        {"product_name": "Free sample", "quantity": "1", "unit": "piece", "unit_price": "0"},
    ]))
    assert response.status_code == 201, response.text
    result = response.json()
    assert [i["line_total"] for i in result["items"]] == ["3.35", "0.01", "0.00"]
    assert result["total"] == "3.36"


@pytest.mark.parametrize("change", [
    {"payment_method": "split"}, {"payment_method": "card"}, {"items": []},
    {"items": [{"product_name": "", "quantity": "1", "unit": "kg", "unit_price": "1"}]},
    {"items": [{"product_name": "Bad", "quantity": "-1", "unit": "kg", "unit_price": "1"}]},
    {"items": [{"product_name": "Bad", "quantity": "0", "unit": "kg", "unit_price": "1"}]},
    {"items": [{"product_name": "Bad", "quantity": 1, "unit": "kg", "unit_price": "1"}]},
    {"items": [{"product_name": "Bad", "quantity": "1e2", "unit": "kg", "unit_price": "1"}]},
    {"items": [{"product_name": "Bad", "quantity": "1.0001", "unit": "kg", "unit_price": "1"}]},
    {"items": [{"product_name": "Bad", "quantity": "1", "unit": "", "unit_price": "1"}]},
    {"items": [{"product_name": "Bad", "quantity": "1", "unit": "kg", "unit_price": 1.25}]},
    {"items": [{"product_name": "Bad", "quantity": "1", "unit": "kg", "unit_price": "NaN"}]},
    {"items": [{"product_name": "Bad", "quantity": "1", "unit": "kg", "unit_price": "1.001"}]},
    {"items": [{"product_name": "Zero bill", "quantity": "1", "unit": "piece", "unit_price": "0"}]},
    {"items": [{"product_name": "Too big", "quantity": "999999999", "unit": "kg", "unit_price": "999999999999.99"}]},
    {"total": "0.01"}, {"shop_id": "caller-owned"}, {"credit_transaction_id": "injected"},
    {"purchased_at": "2026-01-01T00:00:00Z"},
])
def test_invalid_purchase_is_rejected_without_financial_side_effects(client, customer, db, change):
    response = client.post("/api/purchases", json=bill(customer, **change))
    assert response.status_code == 422, response.text
    assert db.scalar(select(func.count()).select_from(Purchase).where(Purchase.customer_id == customer["id"])) == 0
    assert db.scalar(select(func.count()).select_from(PurchaseItem).where(PurchaseItem.shop_id == customer["shop_id"])) == 0
    assert db.scalar(select(func.count()).select_from(Transaction).where(Transaction.customer_id == customer["id"])) == 0


def test_customer_product_purchase_tenant_isolation(client, customer, db):
    product = client.post("/api/products", json={"product_name": "First shop only", "price": "10.00"}).json()
    first = client.post("/api/purchases", json=bill(customer)).json()
    second_shop = create_account(client, "Second shop")
    second_customer = client.post("/api/customers", json={"customer_name": "Second customer"}).json()
    assert client.get("/api/purchases").json()["purchases"] == []
    assert client.get(f'/api/purchases/{first["id"]}').status_code == 404
    assert client.get("/api/purchases", params={"customer_id": customer["id"]}).status_code == 404
    assert client.post("/api/purchases", json=bill(customer)).status_code == 404
    response = client.post("/api/purchases", json=bill(second_customer, items=[
        {"product_id": product["id"], "quantity": "1", "unit": "piece", "unit_price": "10.00"},
    ]))
    assert response.status_code == 404
    assert db.scalar(select(func.count()).select_from(Transaction).where(Transaction.shop_id == second_shop["id"])) == 0


def test_history_filters_ist_boundaries_sort_pagination_and_voice_retrieval(client, customer, db):
    times = ["2026-11-09T18:29:59+00:00", "2026-11-09T18:30:00+00:00",
             "2026-11-10T18:29:59+00:00", "2026-11-10T18:30:00+00:00"]
    ids = []
    for index, instant in enumerate(times):
        result = client.post("/api/purchases", json=bill(customer, "cash", items=[
            {"product_name": f"Rice {index}", "quantity": "1", "unit": "kg", "unit_price": "10.00"},
        ])).json()
        ids.append(result["id"])
        db.get(Purchase, result["id"]).purchased_at = datetime.fromisoformat(instant)
        db.commit()
    params = {"customer_id": customer["id"], "date_from": "2026-11-10", "date_to": "2026-11-10", "search": "Rice"}
    # This is the exact shared endpoint Rohan can use for "what did <customer> buy yesterday?"
    history = client.get("/api/purchases", params=params).json()
    assert history["total_count"] == 2
    assert [p["id"] for p in history["purchases"]] == [ids[2], ids[1]]
    page = client.get("/api/purchases", params={**params, "limit": 1, "offset": 1}).json()
    assert page["total_count"] == 2 and len(page["purchases"]) == 1
    assert page["purchases"][0]["id"] == ids[1]
    report = client.get("/api/reports/daily", params={"date": "2026-11-10"}).json()
    assert report["purchase_count"] == 2 and report["purchase_total"] == "20.00"
    assert client.get("/api/purchases", params={"date_from": "2026-11-11", "date_to": "2026-11-10"}).status_code == 422
    assert client.get("/api/purchases", params={"limit": 101}).status_code == 422


def test_purchase_credit_reversal_retains_bill_and_does_not_claim_refund(client, customer):
    original = client.post("/api/purchases", json=bill(customer)).json()
    reverse = client.post(f'/api/transactions/{original["credit_transaction_id"]}/reverse', json={
        "reason": "Correcting an incorrect credit posting", "idempotency_key": str(uuid4()),
    })
    assert reverse.status_code == 201
    purchase = client.get(f'/api/purchases/{original["id"]}').json()
    assert purchase["payment_status"] == "credit_reversed"
    assert purchase["credit_reversal_id"] == reverse.json()["id"]
    assert purchase["items"] == original["items"]
    assert client.get(f'/api/customers/{customer["id"]}').json()["balance"] == "0.00"
    report = client.get("/api/reports/daily").json()
    assert report["purchase_total"] == "52.50"  # Gross purchase history, not an invented refund.
    assert report["reversal_net"] == "-52.50"
    assert client.put(f'/api/purchases/{original["id"]}', json={}).status_code == 405
    assert client.delete(f'/api/purchases/{original["id"]}').status_code == 405


def test_downstream_failure_rolls_back_credit_and_purchase_together(client, customer, shop, db):
    shop_model = db.get(Shop, shop["id"])
    user = db.scalar(select(User).where(User.id == shop["owner_id"]))
    payload = PurchaseInput.model_validate(bill(customer))
    original_add = db.add
    def fail_bill_add(instance, *args, **kwargs):
        if isinstance(instance, Purchase):
            raise RuntimeError("Simulated failure after credit")
        return original_add(instance, *args, **kwargs)
    with pytest.raises(RuntimeError):
        with db.begin_nested():
            with patch.object(db, "add", side_effect=fail_bill_add):
                purchases.create(db, shop_model, user, payload)
    assert db.scalar(select(func.count()).select_from(Transaction).where(Transaction.customer_id == customer["id"])) == 0
    assert db.scalar(select(func.count()).select_from(Purchase).where(Purchase.customer_id == customer["id"])) == 0


def test_legacy_opening_balance_has_no_fabricated_items_and_auth_is_required(client, shop):
    customer = client.post("/api/customers", json={
        "customer_name": "Historical balance only", "opening_balance": "500.00", "idempotency_key": str(uuid4()),
    }).json()
    assert client.get("/api/purchases", params={"customer_id": customer["id"]}).json()["purchases"] == []
    assert client.get(f'/api/customers/{customer["id"]}').json()["balance"] == "500.00"
    client.post("/api/auth/logout")
    assert client.get("/api/purchases").status_code == 401
    assert client.post("/api/purchases", json=bill(customer)).status_code == 401
