"""
Endpoints for AI Handwritten Khata Import.
- POST /api/documents/extract-khata (File upload -> AI OCR vision extraction -> JSON)
- POST /api/documents/save-batch (User confirmed entries -> Customer check/create -> Ledger persistence)
"""
from __future__ import annotations

import logging
import uuid
from decimal import Decimal
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from backend.app.core.security import current_shop, current_user, fail, lock_shop
from backend.app.database.connection import get_db
from backend.app.database.models import Customer, Shop, User
from backend.app.schemas.inputs import TransactionInput
from backend.app.schemas.ocr import ExtractedKhataItem, KhataBatchSaveInput, OcrExtractResponse
from backend.app.services import ledger
from backend.app.services.ocr_service import process_khata_document
from backend.app.services.voice_nlu import match_customer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Document AI"])


@router.post("/extract-khata", response_model=OcrExtractResponse)
async def extract_khata(
    file: UploadFile = File(...),
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    """
    Receives an image (JPEG, PNG) or PDF document containing handwritten Khata entries.
    Runs deep learning OCR vision pipeline to extract customer names, amounts, transaction types,
    and maps them to existing customers where possible.
    """
    file_bytes = await file.read()
    if not file_bytes:
        fail(422, "Uploaded file is empty.", "empty_file")

    fn = file.filename or "document.jpg"
    try:
        raw_items = process_khata_document(file_bytes, fn)
    except Exception as e:
        logger.error("OCR extraction failed: %s", e)
        fail(422, f"Failed to extract text from document: {str(e)}", "ocr_failed")

    # Match each item to existing shop customers
    shop_customers = ledger.customers(db, shop.id)
    structured_items: List[ExtractedKhataItem] = []

    for item in raw_items:
        cust_query = item.get("customer_name") or ""
        matched_cust, _, status = match_customer(cust_query, shop_customers)

        matched_id = matched_cust["id"] if matched_cust else None
        is_new = matched_id is None

        structured_items.append(
            ExtractedKhataItem(
                id=str(uuid.uuid4()),
                customer_name=matched_cust["customer_name"] if matched_cust else cust_query,
                matched_customer_id=matched_id,
                is_new_customer=is_new,
                transaction_type=item.get("transaction_type", "credit"),
                amount=item.get("amount", "0.00"),
                date=item.get("date"),
                description=item.get("description") or "Imported from handwritten Khata",
                uncertain=item.get("uncertain", False) or is_new,
                raw_text=item.get("raw_text"),
            )
        )

    return OcrExtractResponse(
        success=True,
        filename=fn,
        extracted_entries=structured_items,
        total_found=len(structured_items),
        message=f"Successfully extracted {len(structured_items)} entries from {fn}.",
    )


@router.post("/save-batch", status_code=201)
def save_khata_batch(
    payload: KhataBatchSaveInput,
    shop: Shop = Depends(current_shop),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """
    Saves verified handwritten Khata entries into PostgreSQL ledger after user confirmation.
    - If customer doesn't exist, safely creates customer record in shop.
    - Adds credit/payment transaction via authoritative ledger service with idempotency.
    - Updates balances immediately.
    """
    lock_shop(db, shop)
    saved_transactions = []
    created_customers = []

    for item in payload.entries:
        cust_id = item.matched_customer_id

        # 1. Resolve or create customer
        if not cust_id or item.is_new_customer:
            clean_name = item.customer_name.strip().title()
            # Double check if customer name already exists to avoid duplicate
            existing = db.query(Customer).filter(
                Customer.shop_id == shop.id,
                Customer.customer_name.ilike(clean_name),
            ).first()
            if existing:
                cust_id = existing.id
            else:
                new_cust = Customer(
                    shop_id=shop.id,
                    customer_name=clean_name,
                    mobile_number="",
                    address="",
                    notes="Imported via AI Handwritten Khata",
                )
                db.add(new_cust)
                db.flush()
                cust_id = new_cust.id
                created_customers.append(clean_name)

        # 2. Persist transaction into ledger
        tx_input = TransactionInput(
            customer_id=cust_id,
            transaction_type=item.transaction_type,
            amount=item.amount,
            description=item.description or "Imported from handwritten Khata",
            idempotency_key=item.idempotency_key,
        )
        entry = ledger.add_entry(db, shop, user, tx_input, source="handwritten_import")
        saved_transactions.append(ledger.get_transaction(db, shop.id, entry.id))

    db.commit()

    return {
        "success": True,
        "saved_count": len(saved_transactions),
        "created_customers": created_customers,
        "transactions": saved_transactions,
        "message": f"Successfully persisted {len(saved_transactions)} transactions into database.",
    }
