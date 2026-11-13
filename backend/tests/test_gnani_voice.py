"""
Comprehensive integration tests for Gnani-powered AI Voice Assistant.
Tests include:
1. Kannada credit command ("100 rupai Rohan hesralli bari")
2. Hindi credit command ("Rohan ke naam 150 udhar likho")
3. English credit command ("Add 500 credit for Rohan")
4. Payment recording ("Rohan 200 rupayi kottiddane")
5. Balance inquiry ("Rohan eshtu baaki iddane?")
6. Unknown customer handling
7. Duplicate / ambiguous customer names handling
8. Rejected confirmation ("beda" / "nahi")
9. Duplicate transaction prevention (idempotency)
10. Database persistence & ledger consistency
11. Daily report voice intent ("Ivattu eshtu business aagide?")
12. Gnani service fallback & error safety
"""
from decimal import Decimal
from uuid import uuid4
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from backend.app.database.models import Base, Customer, Shop, Transaction, User
from backend.app.schemas.inputs import TransactionInput
from backend.app.schemas.voice import VoiceProcessInput
from backend.app.services import ledger
from backend.app.services.voice_nlu import extract_amount, extract_customer_name, match_customer, parse_intent
from backend.app.services.gnani import GnaniClient
from backend.app.api.ai import voice_process, ai_command, integration_status


@pytest.fixture
def sqlite_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def test_setup(sqlite_db):
    user = User(
        id=str(uuid4()),
        name="Kirana Owner",
        email="owner@kirana.test",
        mobile_number="9876543210",
        password_hash="test-hash",
    )
    shop = Shop(
        id=str(uuid4()),
        owner_id=user.id,
        shop_name="Sri Manjunatha Kirana",
        preferred_language="kn",
    )
    cust_rohan = Customer(
        id=str(uuid4()),
        shop_id=shop.id,
        customer_name="Rohan",
        mobile_number="9988776655",
    )
    cust_suresh = Customer(
        id=str(uuid4()),
        shop_id=shop.id,
        customer_name="Suresh Kumar",
        mobile_number="9988776644",
    )
    sqlite_db.add_all([user, shop, cust_rohan, cust_suresh])
    sqlite_db.commit()
    return user, shop, cust_rohan, cust_suresh


def test_1_kannada_credit_command(sqlite_db, test_setup):
    """Test 1: Kannada credit command -> asks confirmation -> verbal confirm -> commits transaction."""
    user, shop, cust_rohan, _ = test_setup

    # 1. Shopkeeper says: "100 rupai Rohan hesralli bari"
    payload = VoiceProcessInput(
        text="100 rupai Rohan hesralli bari",
        language="kn",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "confirmation_required"
    assert res["state"] == "awaiting_confirmation"
    assert res["intent"] == "add_credit"
    assert res["pending_operation"]["amount"] == "100.00"
    assert res["pending_operation"]["customer_id"] == cust_rohan.id
    assert "ಉದ್ಧಾರ ಬರೆಯಲಾ" in res["message"] or "Rohan" in res["message"]

    # 2. Verbal confirmation: "Howdu"
    confirm_payload = VoiceProcessInput(
        text="Howdu",
        language="kn",
        pending_operation=res["pending_operation"],
    )
    res_confirmed = voice_process(confirm_payload, shop=shop, user=user, db=sqlite_db)

    assert res_confirmed["status"] == "committed"
    assert res_confirmed["state"] == "completed"
    assert res_confirmed["customer"]["balance"] == "100.00"
    assert res_confirmed["transaction"]["amount"] == "100.00"
    assert res_confirmed["transaction"]["transaction_type"] == "credit"
    assert "ಉದ್ಧಾರ ಬರೆಯಲಾಗಿದೆ" in res_confirmed["message"]


def test_2_hindi_credit_command(sqlite_db, test_setup):
    """Test 2: Hindi credit command -> asks confirmation in Hindi -> confirm -> commits."""
    user, shop, cust_rohan, _ = test_setup

    payload = VoiceProcessInput(
        text="Rohan ke naam pe 150 udhar likho",
        language="hi",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "confirmation_required"
    assert res["intent"] == "add_credit"
    assert res["pending_operation"]["amount"] == "150.00"
    assert "उधार लिखूं" in res["message"]

    confirm_payload = VoiceProcessInput(
        text="haan",
        language="hi",
        pending_operation=res["pending_operation"],
    )
    res_confirmed = voice_process(confirm_payload, shop=shop, user=user, db=sqlite_db)

    assert res_confirmed["status"] == "committed"
    assert res_confirmed["customer"]["balance"] == "150.00"
    assert "उधार जोड़ दिया गया है" in res_confirmed["message"]


def test_3_english_credit_command(sqlite_db, test_setup):
    """Test 3: English credit command -> confirmation -> commit."""
    user, shop, cust_rohan, _ = test_setup

    payload = VoiceProcessInput(
        text="Add 250 credit for Rohan",
        language="en",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "confirmation_required"
    assert res["pending_operation"]["amount"] == "250.00"

    confirm_payload = VoiceProcessInput(
        text="yes",
        language="en",
        pending_operation=res["pending_operation"],
    )
    res_confirmed = voice_process(confirm_payload, shop=shop, user=user, db=sqlite_db)
    assert res_confirmed["status"] == "committed"
    assert res_confirmed["customer"]["balance"] == "250.00"


def test_4_payment_recording(sqlite_db, test_setup):
    """Test 4: Payment recording ("Rohan 200 rupayi kottiddane")."""
    user, shop, cust_rohan, _ = test_setup

    payload = VoiceProcessInput(
        text="Rohan 200 rupayi kottiddane",
        language="kn",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "confirmation_required"
    assert res["intent"] == "record_payment"
    assert res["pending_operation"]["amount"] == "200.00"

    # Confirm
    confirm_payload = VoiceProcessInput(
        text="sari",
        language="kn",
        pending_operation=res["pending_operation"],
    )
    res_confirmed = voice_process(confirm_payload, shop=shop, user=user, db=sqlite_db)
    assert res_confirmed["status"] == "committed"
    assert res_confirmed["transaction"]["transaction_type"] == "payment"
    assert res_confirmed["customer"]["balance"] == "-200.00"  # Advance balance


def test_5_balance_inquiry(sqlite_db, test_setup):
    """Test 5: Balance inquiry ("Rohan eshtu baaki iddane?")."""
    user, shop, cust_rohan, _ = test_setup

    # First add a credit entry
    tx_input = TransactionInput(
        customer_id=cust_rohan.id,
        amount="350.00",
        transaction_type="credit",
        idempotency_key=str(uuid4()),
        description="Initial credit",
    )
    ledger.add_entry(sqlite_db, shop, user, tx_input)
    sqlite_db.commit()

    payload = VoiceProcessInput(
        text="Rohan eshtu baaki iddane?",
        language="kn",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "balance"
    assert res["state"] == "completed"
    assert res["customer"]["balance"] == "350.00"
    assert "350" in res["message"]


def test_6_unknown_customer(sqlite_db, test_setup):
    """Test 6: Unknown customer inquiry without auto-create flag or for balance inquiries."""
    user, shop, _, _ = test_setup

    payload = VoiceProcessInput(
        text="Ramesh eshtu baaki iddane?",
        language="kn",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "customer_not_found"
    assert res["state"] == "error"
    assert "ಸಿಗಲಿಲ್ಲ" in res["message"] or "not found" in res["message"]

    # Also test auto-customer creation when command requests credit for a brand new customer
    new_cust_payload = VoiceProcessInput(
        text="100 rupai Mahesh hesralli bari",
        language="kn",
        auto_create_customer=True,
    )
    auto_res = voice_process(new_cust_payload, shop=shop, user=user, db=sqlite_db)
    assert auto_res["status"] == "confirmation_required"
    assert auto_res["newly_created_customer"] is True
    assert auto_res["customer"]["customer_name"] == "Mahesh"


def test_7_duplicate_customer_names(sqlite_db, test_setup):
    """Test 7: Duplicate customer names disambiguation."""
    user, shop, _, _ = test_setup

    # Add two customers with same first name
    c1 = Customer(id=str(uuid4()), shop_id=shop.id, customer_name="Ramesh Gowda")
    c2 = Customer(id=str(uuid4()), shop_id=shop.id, customer_name="Ramesh Sharma")
    sqlite_db.add_all([c1, c2])
    sqlite_db.commit()

    payload = VoiceProcessInput(
        text="100 rupai Ramesh hesralli bari",
        language="kn",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "multiple_matches"
    assert res["state"] == "awaiting_disambiguation"
    assert len(res["candidates"]) == 2


def test_8_rejected_confirmation(sqlite_db, test_setup):
    """Test 8: Shopkeeper rejects confirmation verbally ("beda" / "no")."""
    user, shop, cust_rohan, _ = test_setup

    payload = VoiceProcessInput(
        text="100 rupai Rohan hesralli bari",
        language="kn",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)
    assert res["status"] == "confirmation_required"

    reject_payload = VoiceProcessInput(
        text="beda",
        language="kn",
        pending_operation=res["pending_operation"],
    )
    res_reject = voice_process(reject_payload, shop=shop, user=user, db=sqlite_db)

    assert res_reject["status"] == "cancelled"
    # Ensure no transaction was committed
    cust = ledger.get_customer(sqlite_db, shop.id, cust_rohan.id)
    assert cust["balance"] == "0.00"


def test_9_duplicate_transaction_prevention(sqlite_db, test_setup):
    """Test 9: Duplicate transaction prevention via idempotency key."""
    user, shop, cust_rohan, _ = test_setup

    op = {
        "intent": "add_credit",
        "customer_id": cust_rohan.id,
        "customer_name": "Rohan",
        "amount": "100.00",
        "idempotency_key": "stable-key-12345678",
        "description": "Voice credit",
    }
    payload1 = VoiceProcessInput(
        confirmed=True,
        pending_operation=op,
        idempotency_key="stable-key-12345678",
    )
    res1 = voice_process(payload1, shop=shop, user=user, db=sqlite_db)
    assert res1["status"] == "committed"

    # Retry identical operation key
    res2 = voice_process(payload1, shop=shop, user=user, db=sqlite_db)
    assert res2["status"] == "committed"
    assert res2["transaction"]["id"] == res1["transaction"]["id"]

    # Customer balance should be only 100.00 (not 200.00)
    cust = ledger.get_customer(sqlite_db, shop.id, cust_rohan.id)
    assert cust["balance"] == "100.00"


def test_10_daily_report_voice_intent(sqlite_db, test_setup):
    """Test 10: Daily report voice command ("Ivattu eshtu business aagide?")."""
    user, shop, cust_rohan, _ = test_setup

    # Add a credit transaction first
    tx_input = TransactionInput(
        customer_id=cust_rohan.id,
        amount="500.00",
        transaction_type="credit",
        idempotency_key=str(uuid4()),
        description="Daily report test",
    )
    ledger.add_entry(sqlite_db, shop, user, tx_input)
    sqlite_db.commit()

    payload = VoiceProcessInput(
        text="Ivattu eshtu business aagide?",
        language="kn",
    )
    res = voice_process(payload, shop=shop, user=user, db=sqlite_db)

    assert res["status"] == "success"
    assert res["intent"] == "get_daily_report"
    assert res["report"]["total_credit"] == "500.00"


def test_11_gnani_service_fallback(sqlite_db, test_setup):
    """Test 11: Gnani service fallback gracefully provides responses without failure."""
    client = GnaniClient(api_key="")
    assert not client.is_configured()

    tts = client.text_to_speech("ನಮಸ್ಕಾರ", language="kn")
    assert tts["source"] == "timbre_fallback"
    assert tts["text"] == "ನಮಸ್ಕಾರ"
