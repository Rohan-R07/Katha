from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from backend.app.database.models import Transaction
from backend.app.schemas.inputs import TransactionInput, parse_money
from backend.app.services.ledger import day_bounds
from backend.tests.conftest import create_account


def add(client, customer, amount, kind="credit", key=None):
    return client.post("/api/transactions", json={
        "customer_id": customer["id"], "transaction_type": kind, "amount": amount,
        "idempotency_key": key or str(uuid4()), "description": "API financial test",
    })


def test_credit_payment_balance_and_committed_records(client, customer, db):
    credit = add(client, customer, "500.00")
    assert credit.status_code == 201, credit.text
    payment = client.post("/api/payments", json={
        "customer_id": customer["id"], "amount": "200.00", "idempotency_key": str(uuid4()),
    })
    assert payment.status_code == 201, payment.text
    khata = client.get(f"/api/khata/customers/{customer['id']}").json()
    assert khata["customer"]["balance"] == "300.00"
    assert khata["customer"]["total_credit"] == "500.00"
    assert khata["customer"]["total_payments"] == "200.00"
    assert len(khata["transactions"]) == 2
    assert db.scalar(select(Transaction.id).where(Transaction.id == credit.json()["id"]))
    summary = client.get("/api/khata/summary").json()
    assert summary["total_outstanding"] == "300.00"
    assert summary["today_credit"] == "500.00"
    assert summary["today_payments"] == "200.00"
    report = client.get("/api/reports/daily").json()
    assert report["transaction_count"] == 2
    assert report["total_outstanding"] == "300.00"


def test_exact_decimal_arithmetic(client, customer):
    assert add(client, customer, "0.10").status_code == 201
    assert add(client, customer, "0.20").status_code == 201
    assert client.get(f"/api/customers/{customer['id']}").json()["balance"] == "0.30"


def test_idempotent_retry_and_conflict(client, customer):
    key = str(uuid4())
    first = add(client, customer, "125.25", key=key)
    second = add(client, customer, "125.25", key=key)
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    conflict = add(client, customer, "126.25", key=key)
    assert conflict.status_code == 409
    assert client.get(f"/api/customers/{customer['id']}").json()["balance"] == "125.25"


@pytest.mark.parametrize("amount", ["-1", "0", "NaN", "Infinity", "0.001", "1e3", "1000000000000", 1.25])
def test_invalid_money_never_writes(client, customer, amount):
    assert add(client, customer, amount).status_code == 422
    assert client.get(f"/api/customers/{customer['id']}").json()["balance"] == "0.00"


def test_auditable_reversal_and_duplicate_protection(client, customer):
    original = add(client, customer, "500.00").json()
    add(client, customer, "200.00", "payment")
    key = str(uuid4())
    endpoint = f"/api/transactions/{original['id']}/reverse"
    data = {"reason": "Incorrect grocery bill", "idempotency_key": key}
    reverse = client.post(endpoint, json=data)
    assert reverse.status_code == 201, reverse.text
    assert reverse.json()["reversal_of"] == original["id"]
    assert reverse.json()["signed_amount"] == "-500.00"
    assert client.post(endpoint, json=data).json()["id"] == reverse.json()["id"]
    assert client.post(endpoint, json={**data, "idempotency_key": str(uuid4())}).status_code == 409
    assert client.post(f"/api/transactions/{reverse.json()['id']}/reverse", json={**data, "idempotency_key": str(uuid4())}).status_code == 409
    original_after = client.get(f"/api/transactions/{original['id']}").json()
    assert original_after["amount"] == "500.00"
    assert original_after["is_reversed"]
    khata = client.get(f"/api/khata/customers/{customer['id']}").json()
    assert len(khata["transactions"]) == 3
    assert khata["customer"]["balance"] == "-200.00"
    assert khata["customer"]["total_credit"] == "0.00"
    summary = client.get("/api/khata/summary").json()
    assert summary["total_outstanding"] == "0.00"
    assert summary["total_advance"] == "200.00"


def test_reverse_payment_restores_balance(client, customer):
    add(client, customer, "500.00")
    payment = add(client, customer, "200.00", "payment").json()
    response = client.post(f"/api/transactions/{payment['id']}/reverse", json={"reason": "Payment not received", "idempotency_key": str(uuid4())})
    assert response.status_code == 201
    result = client.get(f"/api/customers/{customer['id']}").json()
    assert result["balance"] == "500.00"
    assert result["total_payments"] == "0.00"


def test_opening_balance_import_is_atomic_and_idempotent(client, shop):
    data = {"customer_name": "Opening Balance", "opening_balance": "500.00", "idempotency_key": str(uuid4())}
    first = client.post("/api/customers", json=data)
    assert first.status_code == 201, first.text
    assert first.json()["balance"] == "500.00"
    assert client.post("/api/customers", json=data).json()["id"] == first.json()["id"]
    assert client.post("/api/customers", json={**data, "opening_balance": "600.00"}).status_code == 409
    khata = client.get(f"/api/khata/customers/{first.json()['id']}").json()
    assert len(khata["transactions"]) == 1
    assert khata["transactions"][0]["source"] == "opening_balance"


def test_shop_isolation(client, customer):
    original = add(client, customer, "99.00").json()
    create_account(client, "Other")
    assert client.get(f"/api/customers/{customer['id']}").status_code == 404
    assert client.get(f"/api/khata/customers/{customer['id']}").status_code == 404
    assert client.get(f"/api/transactions/{original['id']}").status_code == 404
    assert add(client, customer, "5.00").status_code == 404
    assert client.post(f"/api/transactions/{original['id']}/reverse", json={"reason": "Foreign record", "idempotency_key": str(uuid4())}).status_code == 404
    assert client.get("/api/customers").json() == []
    assert client.get("/api/khata/summary").json()["total_outstanding"] == "0.00"


def test_ai_requires_confirmation_and_uses_same_ledger(client, customer):
    command = {"intent": "add_credit", "customer_id": customer["id"], "amount": "300.00", "idempotency_key": str(uuid4()), "session_id": str(uuid4())}
    assert client.post("/api/ai/command", json=command).status_code == 409
    assert client.get(f"/api/customers/{customer['id']}").json()["balance"] == "0.00"
    result = client.post("/api/ai/command", json={**command, "confirmed": True})
    assert result.status_code == 200, result.text
    assert result.json()["status"] == "committed"
    assert result.json()["customer"]["balance"] == "300.00"
    assert client.post("/api/ai/command", json={**command, "confirmed": True}).json()["transaction"]["id"] == result.json()["transaction"]["id"]
    balance = client.post("/api/ai/command", json={"intent": "get_balance", "customer_id": customer["id"]}).json()
    assert balance["customer"]["balance"] == "300.00"
    assert balance["transaction"] is None
    assert client.post("/api/ai/voice/process").status_code == 503


def test_customer_edit_search_and_filters(client, customer):
    assert client.put(f"/api/customers/{customer['id']}", json={"customer_name": "Edited Customer", "mobile_number": "9876543210", "notes": "Regular shopper"}).status_code == 200
    assert len(client.get("/api/customers", params={"search": "Edited"}).json()) == 1
    assert client.get("/api/customers", params={"balance_status": "outstanding"}).json() == []
    add(client, customer, "10.00")
    assert len(client.get("/api/customers", params={"balance_status": "outstanding"}).json()) == 1
    assert len(client.get("/api/transactions", params={"customer_id": customer["id"], "search": "Edited", "transaction_type": "credit"}).json()) == 1
    assert client.get("/api/transactions", params={"date_from": "2026-11-12", "date_to": "2026-11-01"}).status_code == 422


def test_catalog_and_category_isolation(client, shop):
    category = client.post("/api/categories", json={"category_name": "Staples"}).json()
    response = client.post("/api/products", json={"product_name": "Rice", "price": "62.50", "category_id": category["id"]})
    assert response.status_code == 201, response.text
    product = response.json()
    assert product["category_name"] == "Staples"
    assert client.put(f"/api/products/{product['id']}", json={"product_name": "Rice 1 kg", "price": "64.00", "category_id": category["id"]}).json()["price"] == "64.00"
    assert len(client.get("/api/products", params={"search": "Rice", "category_id": category["id"]}).json()) == 1
    create_account(client, "Other Catalog")
    assert client.post("/api/products", json={"product_name": "Foreign", "price": "1", "category_id": category["id"]}).status_code == 404


def test_login_logout_and_session_revocation(client, db):
    email = f"{uuid4().hex}@example.com"
    data = {"name": "Auth Test", "email": email, "mobile_number": "9876543210", "password": "test-only-password-123"}
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/register", json=data).status_code == 201
    old_cookie = client.cookies.get("khata_session")
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_cookie}"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": "incorrect-password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": data["password"]}).status_code == 200
    assert client.get("/api/auth/me").json()["user"]["email"] == email
    assert client.post("/api/auth/register", json=data).status_code == 409


def test_origin_and_auth_protection(client):
    assert client.get("/api/customers").status_code == 401
    assert client.post("/api/auth/login", headers={"Origin": "https://evil.example"}, json={}).status_code == 403
    invalid = client.post("/api/auth/register", json={"password": "never-echo-this-password"}).json()
    assert "never-echo-this-password" not in str(invalid)


def test_decimal_parser_and_ist_boundaries():
    from datetime import date
    assert parse_money("0.10") + parse_money("0.20") == Decimal("0.30")
    start, end = day_bounds(date(2026, 11, 11))
    assert start.isoformat() == "2026-11-10T18:30:00+00:00"
    assert (end - start).total_seconds() == 86400
    with pytest.raises(ValidationError):
        TransactionInput(customer_id="x", transaction_type="credit", amount=1.2, idempotency_key="long-enough")
