"""API and service tests use PostgreSQL savepoints; no sample financial data survives."""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.database.connection import engine, get_db
from backend.app.main import app


@pytest.fixture
def db():
    with engine.connect() as connection:
        outer = connection.begin()
        with Session(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False) as session:
            yield session
        outer.rollback()


@pytest.fixture
def client(db):
    def test_db():
        yield db
    app.dependency_overrides[get_db] = test_db
    # Each test is an independent caller. Keep the real auth limiter enabled, but
    # don't pool dozens of test registrations into one synthetic client IP.
    with TestClient(app, client=(f"test-{uuid4().hex}", 50000)) as client:
        yield client
    app.dependency_overrides.clear()


def create_account(client, prefix="Owner"):
    unique = uuid4().hex
    response = client.post("/api/auth/register", json={
        "name": prefix, "email": f"{unique}@example.com",
        "mobile_number": "9876543210", "password": "test-only-password-123",
    })
    assert response.status_code == 201, response.text
    assert response.json()["shop"] is None
    response = client.post("/api/shops", json={"shop_name": f"{prefix} Kirana"})
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def shop(client):
    return create_account(client)


@pytest.fixture
def customer(client, shop):
    response = client.post("/api/customers", json={"customer_name": "Ledger Test Customer", "idempotency_key": str(uuid4())})
    assert response.status_code == 201, response.text
    return response.json()
