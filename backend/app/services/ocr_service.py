"""
AI Vision / OCR Service for Handwritten Khata Ledger Extraction.
Uses EasyOCR (PyTorch-based deep learning vision model) + PyMuPDF for PDF documents.
Extracts: Customer Name, Transaction Type (credit/payment), Amount, Date, Description/Notes.
"""
from __future__ import annotations

import io
import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

try:
    from PIL import Image
except ImportError:
    Image = None

logger = logging.getLogger(__name__)

# Initialize EasyOCR reader lazily to avoid heavy startup overhead
_easyocr_reader = None


def get_ocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        import easyocr
        # English + Indic / Kannada/Hindi support
        # English and Hindi are standard easyocr languages.
        logger.info("Initializing EasyOCR reader...")
        _easyocr_reader = easyocr.Reader(["en", "hi"], gpu=False)
    return _easyocr_reader


def extract_pages_from_file(file_bytes: bytes, filename: str) -> list:
    """Extracts PIL Images from uploaded PDF or Image file (JPEG, PNG)."""
    fn_lower = filename.lower()
    images = []

    if fn_lower.endswith(".pdf") or file_bytes[:4] == b"%PDF":
        try:
            import fitz
        except ImportError:
            raise RuntimeError("PyMuPDF is required for PDF processing")
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
            images.append(img)
    else:
        # Standard image (JPEG, PNG, WebP)
        if Image is None:
            raise RuntimeError("Pillow is required for image processing")
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        images.append(img)

    return images


def parse_handwritten_line(line_text: str) -> Optional[Dict[str, Any]]:
    """
    Parses a single handwritten text line into structured Khata entry fields:
    - Customer Name
    - Transaction Type (credit / payment)
    - Amount
    - Date (if present)
    - Description / Notes
    """
    text = line_text.strip()
    if not text or len(text) < 2:
        return None

    # Check for date patterns (e.g., 12/11, 12-11-2026, 12/11/26, 12 Nov)
    date_val = None
    date_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b", text)
    if date_match:
        date_str = date_match.group(1)
        text = text.replace(date_str, "").strip()
        date_val = date_str

    # Extract numeric amount (e.g. ₹500, 500.00, 500/-, Rs 500, 500)
    amount_val = None
    amt_match = re.search(r"(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\s*(?:/-)?", text, re.IGNORECASE)
    if amt_match:
        try:
            amt_num = Decimal(amt_match.group(1))
            if amt_num > 0:
                amount_val = str(amt_num.quantize(Decimal("0.01")))
                # Remove matched amount from remaining text to find name & type
                text = text[:amt_match.start()] + " " + text[amt_match.end():]
        except Exception:
            pass

    # Extract transaction type cues
    lower = text.lower()
    tx_type = "credit"  # Default in Kirana Khata is Udhar/Credit
    uncertain = False

    payment_keywords = ["jama", "jamaa", "paid", "payment", "received", "diye", "bantu", "kotta", "rec", "cr", "जमा", "दिए"]
    credit_keywords = ["udhar", "udhari", "credit", "dr", "baaki", "khatemein", "bari", "उधार", "ಉದ್ಧಾರ"]

    has_payment = any(re.search(r"\b" + re.escape(w) + r"\b", lower) for w in payment_keywords)
    has_credit = any(re.search(r"\b" + re.escape(w) + r"\b", lower) for w in credit_keywords)

    if has_payment and not has_credit:
        tx_type = "payment"
    elif has_credit:
        tx_type = "credit"
    else:
        # If no explicit cue, defaults to credit but flagged as slightly uncertain
        tx_type = "credit"
        if not amount_val:
            uncertain = True

    # Clean remaining text for customer name and notes
    keyword_strip_regex = r"\b(" + "|".join(re.escape(w) for w in (payment_keywords + credit_keywords)) + r")\b"
    cleaned_name = re.sub(keyword_strip_regex, "", text, flags=re.IGNORECASE)
    cleaned_name = re.sub(r"(?:₹|rs\.?|inr|/-)", "", cleaned_name, flags=re.IGNORECASE)
    cleaned_name = re.sub(r"[^\w\s\u0C80-\u0CFF\u0900-\u097F]", " ", cleaned_name).strip()
    words = [w for w in cleaned_name.split() if len(w) > 1 and not w.isdigit()]

    if not words and not amount_val:
        return None

    cust_name = " ".join(words[:3]).title() if words else "Unspecified Customer"
    notes = " ".join(words[3:]) if len(words) > 3 else "Imported from handwritten Khata"

    if not amount_val or cust_name == "Unspecified Customer":
        uncertain = True

    return {
        "customer_name": cust_name,
        "transaction_type": tx_type,
        "amount": amount_val or "0.00",
        "date": date_val or datetime.now().strftime("%Y-%m-%d"),
        "description": notes,
        "uncertain": uncertain,
        "raw_text": line_text,
    }


def process_khata_document(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Performs OCR and converts document into list of structured transaction proposals.
    """
    images = extract_pages_from_file(file_bytes, filename)
    reader = get_ocr_reader()

    extracted_entries: List[Dict[str, Any]] = []

    for page_idx, img in enumerate(images):
        import numpy as np
        img_np = np.array(img)
        # Read text with EasyOCR
        # Results format: [ ( [coords], "text", confidence ), ... ]
        ocr_results = reader.readtext(img_np, detail=1, paragraph=False)

        # Sort OCR bounding boxes top-to-bottom
        ocr_results.sort(key=lambda r: (r[0][0][1], r[0][0][0]))

        # Group lines that have similar Y coordinates (within same row)
        rows: List[List[str]] = []
        current_row: List[str] = []
        current_y = None

        for bbox, text, conf in ocr_results:
            y_mid = (bbox[0][1] + bbox[2][1]) / 2.0
            if current_y is None or abs(y_mid - current_y) < 25:
                current_row.append(text)
                current_y = y_mid
            else:
                if current_row:
                    rows.append(current_row)
                current_row = [text]
                current_y = y_mid
        if current_row:
            rows.append(current_row)

        for row_tokens in rows:
            line_str = " ".join(row_tokens)
            parsed = parse_handwritten_line(line_str)
            if parsed and (Decimal(parsed["amount"]) > 0 or parsed["customer_name"] != "Unspecified Customer"):
                parsed["page"] = page_idx + 1
                extracted_entries.append(parsed)

    return extracted_entries
