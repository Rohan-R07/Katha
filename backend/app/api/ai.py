import base64
import logging
import os
import re
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, ValidationError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.core.security import current_shop, current_user, fail, lock_shop
from backend.app.database.connection import get_db
from backend.app.database.models import AiConversation, Customer, Shop, User
from backend.app.schemas.inputs import AiCommandInput, TransactionInput
from backend.app.schemas.voice import VoiceProcessInput
from backend.app.services import ledger
from backend.app.services.gnani import gnani_client
from backend.app.services.voice_nlu import detect_language, extract_amount, match_customer, parse_intent

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Module integration"])


@router.get("/integrations/status")
def integration_status(shop: Shop = Depends(current_shop), db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    has_gnani = gnani_client.is_configured()
    return {
        "backend": "ready",
        "database": "connected",
        "onboarding_api": "ready",
        "structured_commands": "ready",
        "speech_to_text": "ready" if has_gnani else "available",
        "text_to_speech": "ready" if has_gnani else "available",
        "llm": "ready" if has_gnani else "available",
        "gnani_configured": has_gnani,
        "documentation_url": "/api/docs",
    }


class TtsRequest(BaseModel):
    text: str
    language: str = "kn"


@router.get("/ai/tts")
def stream_tts(text: str = Query(..., min_length=1), language: str = Query("kn")):
    tts_result = gnani_client.text_to_speech(text, language=language)
    if tts_result.get("audio_base64"):
        audio_bytes = base64.b64decode(tts_result["audio_base64"])
        return Response(content=audio_bytes, media_type=tts_result.get("format", "audio/mpeg"))
    return Response(content=b"", status_code=204)


@router.post("/ai/tts")
def generate_tts(payload: TtsRequest):
    return gnani_client.text_to_speech(payload.text, language=payload.language)


@router.post("/ai/command")
def ai_command(
    payload: AiCommandInput,
    shop: Shop = Depends(current_shop),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    lock_shop(db, shop)
    ledger.get_customer(db, shop.id, payload.customer_id)
    if payload.intent != "get_balance" and not payload.confirmed:
        fail(409, "Ask the shopkeeper to confirm before recording this operation.", "confirmation_required")
    entry = None
    if payload.intent != "get_balance":
        if not payload.amount or not payload.idempotency_key:
            fail(422, "A positive decimal amount and idempotency key are required.", "invalid_command")
        try:
            validated = TransactionInput(
                customer_id=payload.customer_id,
                amount=payload.amount,
                transaction_type="credit" if payload.intent == "add_credit" else "payment",
                idempotency_key=payload.idempotency_key,
                description=payload.description or "Voice command",
            )
        except ValidationError:
            fail(422, "Use a positive decimal amount with at most two decimal places.", "invalid_amount")
        entry = ledger.add_entry(db, shop, user, validated, source="ai_command")
    if payload.session_id:
        exists = db.scalar(
            select(AiConversation.id).where(
                AiConversation.shop_id == shop.id,
                AiConversation.user_id == user.id,
                AiConversation.session_id == payload.session_id,
            )
        )
        if not exists:
            db.add(AiConversation(shop_id=shop.id, user_id=user.id, session_id=payload.session_id))
    db.commit()
    return {
        "status": "committed" if entry else "balance",
        "customer": ledger.get_customer(db, shop.id, payload.customer_id),
        "transaction": ledger.get_transaction(db, shop.id, entry.id) if entry else None,
    }


def _confirmation_prompt(intent: str, customer_name: str, amount: str, lang: str) -> str:
    amt_int = int(Decimal(amount)) if Decimal(amount) % 1 == 0 else amount
    if lang == "kn":
        if intent == "add_credit":
            return f"{customer_name} ಹೆಸರಲ್ಲಿ {amt_int} ರೂಪಾಯಿ ಉದ್ಧಾರ ಬರೆಯಲಾ?"
        return f"{customer_name} ಅವರಿಂದ {amt_int} ರೂಪಾಯಿ ಜಮಾ ಮಾಡಿಕೊಳ್ಳಲಾ?"
    elif lang == "hi":
        if intent == "add_credit":
            return f"{customer_name} के नाम पे {amt_int} रुपये उधार लिखूं?"
        return f"{customer_name} से {amt_int} रुपये जमा करूं?"
    else:
        if intent == "add_credit":
            return f"Should I record ₹{amount} credit for {customer_name}?"
        return f"Should I record ₹{amount} payment from {customer_name}?"


def _success_announcement(intent: str, customer_name: str, amount: str, balance: str, lang: str) -> str:
    amt_int = int(Decimal(amount)) if Decimal(amount) % 1 == 0 else amount
    bal_int = int(Decimal(balance)) if Decimal(balance) % 1 == 0 else balance
    if lang == "kn":
        if intent == "add_credit":
            return f"{customer_name} ಹೆಸರಲ್ಲಿ {amt_int} ರೂಪಾಯಿ ಉದ್ಧಾರ ಬರೆಯಲಾಗಿದೆ. ಈಗ ಅವರ ಒಟ್ಟು ಬಾಕಿ {bal_int} ರೂಪಾಯಿ."
        return f"{customer_name} ಅವರಿಂದ {amt_int} ರೂಪಾಯಿ ಜಮಾ ಮಾಡಿಕೊಳ್ಳಲಾಗಿದೆ. ಈಗ ಅವರ ಒಟ್ಟು ಬಾಕಿ {bal_int} ರೂಪಾಯಿ."
    elif lang == "hi":
        if intent == "add_credit":
            return f"{customer_name} के खाते में {amt_int} रुपये उधार जोड़ दिया गया है। कुल बकाया {bal_int} रुपये है।"
        return f"{customer_name} से {amt_int} रुपये जमा कर लिए गए हैं। कुल बकाया {bal_int} रुपये है।"
    else:
        if intent == "add_credit":
            return f"Successfully added ₹{amount} credit for {customer_name}. Total balance is ₹{balance}."
        return f"Successfully recorded ₹{amount} payment from {customer_name}. Total balance is ₹{balance}."


@router.post("/ai/voice/process")
def voice_process(
    payload: Optional[VoiceProcessInput] = None,
    shop: Shop = Depends(current_shop),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """
    Multilingual Gnani-powered AI Voice Assistant endpoint.
    Processes audio or speech transcript, resolves customers safely, extracts intents,
    directly executes clear financial commands (e.g. 'save ramesh's 2000 rupees') without confusion,
    and announces responses in the exact same language spoken (Kannada, Hindi, or English).
    """
    lock_shop(db, shop)
    if not payload:
        fail(503, "No speech or text was provided.", "empty_input")

    lang = payload.language or shop.preferred_language or "kn"
    session_id = payload.session_id or str(uuid.uuid4())

    # Step 1: Speech to Text (Gnani Prisma)
    transcript = payload.text or ""
    if not transcript and payload.audio_base64:
        try:
            audio_bytes = base64.b64decode(payload.audio_base64)
            transcript = gnani_client.speech_to_text(audio_bytes, language=lang)
        except Exception as e:
            logger.error("Audio decoding/transcription failed: %s", e)
            fail(422, "Unable to process audio input.", "invalid_audio")

    if not transcript and not payload.confirmed and not payload.pending_operation:
        fail(503, "No speech or text was provided.", "empty_input")

    # Detect the exact language spoken in the speech / text
    spoken_lang = detect_language(transcript, default_lang=lang)

    # Step 2: Handle explicit confirmation of a pending financial operation
    # Either verbally ("howdu", "ha", "yes", etc.) or programmatically (confirmed=True)
    parsed = parse_intent(transcript, language=spoken_lang) if transcript else {}
    intent = parsed.get("intent")

    if (payload.confirmed or intent == "confirmation_yes") and payload.pending_operation:
        op = payload.pending_operation
        op_intent = op.get("intent")
        cust_id = op.get("customer_id")
        amount = op.get("amount")
        key = payload.idempotency_key or op.get("idempotency_key") or str(uuid.uuid4())

        if op_intent not in ("add_credit", "record_payment"):
            fail(422, "Invalid pending financial operation.", "invalid_operation")

        # Execute structured financial command via ledger service
        validated = TransactionInput(
            customer_id=cust_id,
            amount=amount,
            transaction_type="credit" if op_intent == "add_credit" else "payment",
            idempotency_key=key,
            description=op.get("description") or "Voice command",
        )
        entry = ledger.add_entry(db, shop, user, validated, source="ai_voice")
        cust = ledger.get_customer(db, shop.id, cust_id)

        # Record AI conversation
        db.add(AiConversation(shop_id=shop.id, user_id=user.id, session_id=session_id))
        db.commit()

        # Gnani Timbre vocal announcement in spoken language
        spoken_msg = _success_announcement(op_intent, cust["customer_name"], amount, cust["balance"], spoken_lang)
        tts_res = gnani_client.text_to_speech(spoken_msg, language=spoken_lang)

        return {
            "status": "committed",
            "state": "completed",
            "intent": op_intent,
            "transcript": transcript,
            "customer": cust,
            "newly_created_customer": bool(op.get("newly_created_customer")),
            "transaction": ledger.get_transaction(db, shop.id, entry.id),
            "message": spoken_msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    if intent == "confirmation_no" and payload.pending_operation:
        cancel_msg = "ಆಪರೇಶನ್ ರದ್ದು ಮಾಡಲಾಗಿದೆ." if spoken_lang == "kn" else ("कार्रवाई रद्द कर दी गई है।" if spoken_lang == "hi" else "Operation cancelled.")
        tts_res = gnani_client.text_to_speech(cancel_msg, language=spoken_lang)
        return {
            "status": "cancelled",
            "state": "cancelled",
            "transcript": transcript,
            "message": cancel_msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    # Step 3: Intent understanding (Gnani Aion)
    shop_customers = ledger.customers(db, shop.id)

    # 3a. Daily Report
    if intent == "get_daily_report":
        today_date = ledger.today()
        report = ledger.daily_report(db, shop, today_date)
        if spoken_lang == "kn":
            msg = f"ಇವತ್ತು ಒಟ್ಟು {report['total_credit']} ರೂಪಾಯಿ ಉದ್ಧಾರ ಮತ್ತು {report['total_payments']} ರೂಪಾಯಿ ವಸೂಲಿ ಆಗಿದೆ. ಒಟ್ಟು {report['transaction_count']} ವ್ಯವಹಾರಗಳು ನಡೆದಿವೆ."
        elif spoken_lang == "hi":
            msg = f"आज कुल {report['total_credit']} रुपये उधार और {report['total_payments']} रुपये जमा हुए हैं। कुल {report['transaction_count']} लेनदेन हुए हैं।"
        else:
            msg = f"Today's report: ₹{report['total_credit']} credit given, ₹{report['total_payments']} payments collected across {report['transaction_count']} transactions."

        tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
        return {
            "status": "success",
            "state": "completed",
            "intent": "get_daily_report",
            "transcript": transcript,
            "report": report,
            "message": msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    # Customer-dependent operations
    cust_query = parsed.get("customer_name")
    if not cust_query and payload.pending_operation:
        cust_query = payload.pending_operation.get("customer_name")

    if not cust_query:
        # If we got an amount and intent but no customer name, remember the intent/amount in pending_op
        pending_op = None
        if parsed.get("amount") and intent in ("add_credit", "record_payment"):
            pending_op = {
                "intent": intent,
                "amount": parsed.get("amount"),
                "idempotency_key": str(uuid.uuid4()),
            }
        msg = "ಗ್ರಾಹಕರ ಹೆಸರನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ." if spoken_lang == "kn" else ("कृपया ग्राहक का नाम बताएं।" if spoken_lang == "hi" else "Please state the customer's name.")
        tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
        return {
            "status": "clarification_needed",
            "state": "awaiting_clarification",
            "intent": intent,
            "transcript": transcript,
            "pending_operation": pending_op,
            "message": msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    matched_cust, candidates, match_status = match_customer(cust_query, shop_customers)

    newly_created_customer = False
    if match_status == "not_found":
        # Feature 1: Automatic Customer Creation
        # If the command involves a financial operation or request for a new customer, and auto_create_customer is enabled
        if payload.auto_create_customer and (intent in ("add_credit", "record_payment", "create_purchase") or (payload.pending_operation and payload.pending_operation.get("intent") in ("add_credit", "record_payment"))):
            clean_cust_name = cust_query.strip().title()
            new_cust = Customer(
                shop_id=shop.id,
                customer_name=clean_cust_name,
                mobile_number="",
                address="",
                notes="Auto-created via Gnani Voice Assistant",
            )
            db.add(new_cust)
            db.flush()
            matched_cust = ledger.get_customer(db, shop.id, new_cust.id)
            match_status = "matched"
            newly_created_customer = True
            logger.info("Auto-created new customer '%s' (%s) for shop %s", clean_cust_name, new_cust.id, shop.id)
        else:
            msg = f"{cust_query} ಹೆಸರಿನ ಗ್ರಾಹಕರು ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಸಿಗಲಿಲ್ಲ." if spoken_lang == "kn" else (f"{cust_query} नाम के ग्राहक आपके खाते में नहीं मिले।" if spoken_lang == "hi" else f"Customer '{cust_query}' not found in your shop.")
            tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
            return {
                "status": "customer_not_found",
                "state": "error",
                "intent": intent,
                "transcript": transcript,
                "customer_query": cust_query,
                "pending_operation": payload.pending_operation,
                "message": msg,
                "audio": tts_res,
                "language": spoken_lang,
                "session_id": session_id,
            }

    if match_status == "multiple_matches":
        cand_names = ", ".join([c["customer_name"] for c in candidates])
        if spoken_lang == "kn":
            msg = f"ಹಲವಾರು ಗ್ರಾಹಕರು ಸಿಕ್ಕಿದ್ದಾರೆ: {cand_names}. ಯಾವ ಗ್ರಾಹಕರು ಎಂದು ಸ್ಪಷ್ಟಪಡಿಸಿ."
        elif spoken_lang == "hi":
            msg = f"एक से अधिक ग्राहक मिले: {cand_names}। कृपया स्पष्ट करें।"
        else:
            msg = f"Multiple customers found: {cand_names}. Please specify which one."

        tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
        return {
            "status": "multiple_matches",
            "state": "awaiting_disambiguation",
            "intent": intent,
            "transcript": transcript,
            "candidates": candidates,
            "message": msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    # 3b. Balance Inquiry
    if intent == "get_balance":
        cust_balance = ledger.get_customer(db, shop.id, matched_cust["id"])
        bal = Decimal(cust_balance["balance"])
        bal_int = int(bal) if bal % 1 == 0 else bal
        if spoken_lang == "kn":
            if bal > 0:
                msg = f"{matched_cust['customer_name']} ಅವರು {bal_int} ರೂಪಾಯಿ ಬಾಕಿ ಕೊಡಬೇಕು."
            elif bal < 0:
                msg = f"{matched_cust['customer_name']} ಅವರ ಬಳಿ {abs(bal_int)} ರೂಪಾಯಿ ಮುಂಗಡ (Advance) ಇದೆ."
            else:
                msg = f"{matched_cust['customer_name']} ಅವರ ಖಾತೆ ಚುಕ್ತಾ ಆಗಿದೆ, ಯಾವುದೇ ಬಾಕಿ ಇಲ್ಲ."
        elif spoken_lang == "hi":
            if bal > 0:
                msg = f"{matched_cust['customer_name']} का {bal_int} रुपये बकाया है।"
            elif bal < 0:
                msg = f"{matched_cust['customer_name']} का {abs(bal_int)} रुपये एडवांस जमा है।"
            else:
                msg = f"{matched_cust['customer_name']} का कोई बकाया नहीं है, खाता चुकता है।"
        else:
            if bal > 0:
                msg = f"{matched_cust['customer_name']} owes ₹{cust_balance['balance']}."
            elif bal < 0:
                msg = f"{matched_cust['customer_name']} has an advance of ₹{abs(bal)}."
            else:
                msg = f"{matched_cust['customer_name']} has zero balance (settled)."

        tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
        return {
            "status": "balance",
            "state": "completed",
            "intent": "get_balance",
            "transcript": transcript,
            "customer": cust_balance,
            "message": msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    # 3c. Customer Purchase History
    if intent == "get_customer_history":
        from backend.app.services import purchases
        hist = purchases.history(db, shop, customer_id=matched_cust["id"], limit=5)
        count = hist.get("total_count", 0)
        if spoken_lang == "kn":
            msg = f"{matched_cust['customer_name']} ಅವರ ಇತ್ತೀಚಿನ {count} ಖರೀದಿ ಬಿಲ್‌ಗಳು ದೊರೆತಿವೆ."
        elif spoken_lang == "hi":
            msg = f"{matched_cust['customer_name']} के हाल के {count} बिल मिले हैं।"
        else:
            msg = f"Found {count} recent purchases for {matched_cust['customer_name']}."

        tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
        return {
            "status": "history",
            "state": "completed",
            "intent": "get_customer_history",
            "transcript": transcript,
            "customer": matched_cust,
            "history": hist,
            "message": msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    # 3d. Itemized Purchase Bill creation
    if intent == "create_purchase":
        items = parsed.get("items", [])
        if spoken_lang == "kn":
            msg = f"{matched_cust['customer_name']} ಅವರ ಹೆಸರಲ್ಲಿ ಬಿಲ್ ಸಿದ್ಧವಾಗಿದೆ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ."
        elif spoken_lang == "hi":
            msg = f"{matched_cust['customer_name']} के नाम पर बिल तैयार है। कृपया पुष्टि करें।"
        else:
            msg = f"Bill prepared for {matched_cust['customer_name']}. Please review and confirm."
        tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
        return {
            "status": "purchase_ready",
            "state": "completed",
            "intent": "create_purchase",
            "transcript": transcript,
            "customer": matched_cust,
            "items": items,
            "message": msg,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    # 3e. Financial Operations: add_credit & record_payment -> Execute directly without confusion!
    if intent in ("add_credit", "record_payment") or (payload.pending_operation and payload.pending_operation.get("intent") in ("add_credit", "record_payment")):
        resolved_intent = intent if intent in ("add_credit", "record_payment") else payload.pending_operation.get("intent")
        amount = parsed.get("amount") or (payload.pending_operation.get("amount") if payload.pending_operation else None)
        if not amount:
            msg = "ಮೊತ್ತವನ್ನು ಸರಿಯಾಗಿ ಹೇಳಿ." if spoken_lang == "kn" else ("कृपया सही राशि बताएं।" if spoken_lang == "hi" else "Please specify the amount.")
            tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
            pending_op = {
                "intent": resolved_intent,
                "customer_id": matched_cust["id"],
                "customer_name": matched_cust["customer_name"],
                "idempotency_key": str(uuid.uuid4()),
            }
            return {
                "status": "amount_missing",
                "state": "awaiting_clarification",
                "intent": resolved_intent,
                "transcript": transcript,
                "customer": matched_cust,
                "pending_operation": pending_op,
                "message": msg,
                "audio": tts_res,
                "language": spoken_lang,
                "session_id": session_id,
            }

        # Check if direct save requested (e.g. "save ramesh's 2000 rupees") or explicit confirmation was already given
        is_direct_save = bool(re.search(r"\b(?:save|direct|ಖಾತೆಲಿ ಹಾಕು|ಖಾತೆಗೆ ಹಾಕು|सेव)\b", transcript, re.IGNORECASE)) or payload.confirmed

        if is_direct_save:
            # Save immediately to ledger without confusion
            key = payload.idempotency_key or (payload.pending_operation.get("idempotency_key") if payload.pending_operation else None) or str(uuid.uuid4())
            validated = TransactionInput(
                customer_id=matched_cust["id"],
                amount=amount,
                transaction_type="credit" if resolved_intent == "add_credit" else "payment",
                idempotency_key=key,
                description=f"Voice {resolved_intent} - {transcript}",
            )
            entry = ledger.add_entry(db, shop, user, validated, source="ai_voice")
            updated_cust = ledger.get_customer(db, shop.id, matched_cust["id"])

            # Record AI conversation
            db.add(AiConversation(shop_id=shop.id, user_id=user.id, session_id=session_id))
            db.commit()

            # Generate response in the exact same language spoken
            spoken_msg = _success_announcement(resolved_intent, updated_cust["customer_name"], str(amount), updated_cust["balance"], spoken_lang)
            if newly_created_customer:
                if spoken_lang == "kn":
                    spoken_msg = f"{updated_cust['customer_name']} ಹೊಸ ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಲಾಗಿದೆ. " + spoken_msg
                elif spoken_lang == "hi":
                    spoken_msg = f"{updated_cust['customer_name']} नए ग्राहक को जोड़ा गया। " + spoken_msg
                else:
                    spoken_msg = f"Created new customer '{updated_cust['customer_name']}'. " + spoken_msg

            tts_res = gnani_client.text_to_speech(spoken_msg, language=spoken_lang)
            return {
                "status": "committed",
                "state": "completed",
                "intent": resolved_intent,
                "transcript": transcript,
                "customer": updated_cust,
                "newly_created_customer": newly_created_customer,
                "transaction": ledger.get_transaction(db, shop.id, entry.id),
                "message": spoken_msg,
                "audio": tts_res,
                "language": spoken_lang,
                "session_id": session_id,
            }

        # Otherwise require confirmation for safety
        prompt = _confirmation_prompt(resolved_intent, matched_cust["customer_name"], amount, spoken_lang)
        if newly_created_customer:
            if spoken_lang == "kn":
                prompt = f"{matched_cust['customer_name']} ಹೊಸ ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಲಾಗಿದೆ. " + prompt
            elif spoken_lang == "hi":
                prompt = f"{matched_cust['customer_name']} नए ग्राहक को जोड़ा गया है। " + prompt
            else:
                prompt = f"Created new customer '{matched_cust['customer_name']}'. " + prompt

        tts_res = gnani_client.text_to_speech(prompt, language=spoken_lang)
        pending_op = {
            "intent": resolved_intent,
            "customer_id": matched_cust["id"],
            "customer_name": matched_cust["customer_name"],
            "amount": amount,
            "newly_created_customer": newly_created_customer,
            "idempotency_key": (payload.pending_operation.get("idempotency_key") if payload.pending_operation else None) or str(uuid.uuid4()),
            "description": f"Voice {resolved_intent} - {transcript}",
        }
        return {
            "status": "confirmation_required",
            "state": "awaiting_confirmation",
            "intent": resolved_intent,
            "transcript": transcript,
            "customer": matched_cust,
            "newly_created_customer": newly_created_customer,
            "pending_operation": pending_op,
            "message": prompt,
            "audio": tts_res,
            "language": spoken_lang,
            "session_id": session_id,
        }

    # Unknown Intent
    msg = "ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಆದೇಶ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ." if spoken_lang == "kn" else ("माफ़ कीजिए, मुझे समझ नहीं आया। कृपया दोबारा बोलें।" if spoken_lang == "hi" else "Sorry, I did not understand that command. Please try again.")
    tts_res = gnani_client.text_to_speech(msg, language=spoken_lang)
    return {
        "status": "unknown_intent",
        "state": "unknown",
        "intent": "unknown_intent",
        "transcript": transcript,
        "message": msg,
        "audio": tts_res,
        "language": spoken_lang,
        "session_id": session_id,
    }
