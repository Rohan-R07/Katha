"""
Multilingual Natural Language Voice Intent & Slot Parsing Engine (Gnani Aion integration).
Handles Kannada, Hindi, and English natural speech, phonetic variations, and mixed-language kirana queries.
"""
from __future__ import annotations

import difflib
import logging
import re
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Numeric words mapping for Kannada, Hindi, and English
NUMBER_WORDS: Dict[str, Decimal] = {
    # Kannada numbers
    "ಒಂದು": Decimal("1"), "ಒಂದ": Decimal("1"),
    "ಎರಡು": Decimal("2"), "ಎರಡ": Decimal("2"),
    "ಮೂರು": Decimal("3"), "ಮೂರ": Decimal("3"),
    "ನಾಲ್ಕು": Decimal("4"), "ನಾಲ್ಕ": Decimal("4"),
    "ಐದು": Decimal("5"), "ಐದ": Decimal("5"),
    "ಆರು": Decimal("6"), "ಆರ": Decimal("6"),
    "ಏಳು": Decimal("7"), "ಏಳ": Decimal("7"),
    "ಎಂಟು": Decimal("8"), "ಎಂಟ": Decimal("8"),
    "ಒಂಬತ್ತು": Decimal("9"), "ಒಂಬತ್ತ": Decimal("9"),
    "ಹತ್ತು": Decimal("10"), "ಹತ್ತ": Decimal("10"),
    "ಇಪ್ಪತ್ತು": Decimal("20"), "ಮೂವತ್ತು": Decimal("30"), "ನಲವತ್ತು": Decimal("40"), "ಐವತ್ತು": Decimal("50"),
    "ನೂರು": Decimal("100"), "ನೂರ": Decimal("100"), "ಇನ್ನೂರು": Decimal("200"), "ಮುನ್ನೂರು": Decimal("300"),
    "ಸಾವಿರ": Decimal("1000"), "ಸಾವಿರದ": Decimal("1000"), "ಅರ್ಧ": Decimal("0.5"), "ಕಾಲು": Decimal("0.25"),
    # Hindi numbers
    "एक": Decimal("1"), "दो": Decimal("2"), "तीन": Decimal("3"), "चार": Decimal("4"), "पाँच": Decimal("5"), "पांच": Decimal("5"),
    "छह": Decimal("6"), "सात": Decimal("7"), "आठ": Decimal("8"), "नौ": Decimal("9"), "दस": Decimal("10"),
    "बीस": Decimal("20"), "तीस": Decimal("30"), "चालीस": Decimal("40"), "पचास": Decimal("50"),
    "सौ": Decimal("100"), "दो सौ": Decimal("200"), "हजार": Decimal("1000"), "आधा": Decimal("0.5"),
    # English & Hinglish/Kanglish numbers
    "one": Decimal("1"), "two": Decimal("2"), "three": Decimal("3"), "four": Decimal("4"), "five": Decimal("5"),
    "six": Decimal("6"), "seven": Decimal("7"), "eight": Decimal("8"), "nine": Decimal("9"), "ten": Decimal("10"),
    "twenty": Decimal("20"), "fifty": Decimal("50"), "hundred": Decimal("100"), "thousand": Decimal("1000"),
    "half": Decimal("0.5"), "quarter": Decimal("0.25"),
}

# Unit mappings
UNIT_KEYWORDS = {
    "kg": ["kg", "kilo", "kilogram", "ಕೆಜಿ", "ಕಿಲೋ", "किलो", "किलोग्राम"],
    "gram": ["g", "gm", "gram", "grams", "ಗ್ರಾಂ", "ಗ್ರಾಮ್", "ग्राम"],
    "packet": ["pkt", "packet", "packets", "ಪ್ಯಾಕೆಟ್", "पैकेट"],
    "piece": ["pc", "piece", "pieces", "ಪೀಸ್", "ನಗ", "पीस"],
    "litre": ["l", "ltr", "litre", "litres", "ಲೀಟರ್", "लीटर"],
    "bottle": ["bottle", "bottles", "ಬಾಟಲ್", "बोतल"],
    "box": ["box", "boxes", "ಡಬ್ಬ", "डिब्बा"],
}


def detect_language(text: str, default_lang: str = "en") -> str:
    """
    Detects whether the spoken or typed phrase is Kannada, Hindi, or English.
    Checks Unicode scripts, transliterated phonetic keywords, and grammatical markers.
    """
    if not text or not text.strip():
        return default_lang if default_lang in ("kn", "hi", "en") else "en"

    t = text.strip()

    # 1. Direct Unicode script check
    if re.search(r"[\u0C80-\u0CFF]", t):
        return "kn"
    if re.search(r"[\u0900-\u097F]", t):
        return "hi"

    # 2. Transliterated / romanized keywords
    lower = t.lower()
    words = re.findall(r"\b\w+\b", lower)

    kn_keywords = {
        "hesaru", "hesralli", "hesaralli", "hesrli", "bari", "haaku", "kodi",
        "kottiddane", "kottidare", "kotta", "bantu", "banthu", "bandide",
        "eshtu", "estu", "baaki", "baki", "iddane", "idare", "ivattu",
        "sakkare", "rotti", "belagge", "sanje", "howdu", "beda", "illa",
        "sari", "rupayi", "rupai", "tumba", "dhanyavada", "namaskara", "khata", "khatege"
    }
    hi_keywords = {
        "naam", "likho", "likh", "diye", "diya", "mile", "mila", "aaye", "aaya",
        "bhare", "jama", "jamakare", "udhar", "udhari", "udhaar", "kitna",
        "hai", "karo", "dedo", "dena", "ka", "ke", "ki", "ko", "se", "ne",
        "me", "mein", "theek", "shukriya", "dhanyawad", "namaste", "rupaye"
    }
    en_keywords = {
        "save", "add", "record", "credit", "payment", "paid", "received", "balance",
        "rupees", "rupee", "bill", "today", "yesterday", "customer", "please",
        "for", "from", "to", "what", "how", "much", "total", "history", "store", "rs"
    }

    kn_score = sum(1 for w in words if w in kn_keywords)
    hi_score = sum(1 for w in words if w in hi_keywords)
    en_score = sum(1 for w in words if w in en_keywords)

    # Check for Kannada suffixes like 'inda', 'ige'
    if any(w.endswith("inda") or w.endswith("ige") for w in words if len(w) > 4):
        kn_score += 1

    if kn_score > hi_score and kn_score > en_score:
        return "kn"
    if hi_score > kn_score and hi_score > en_score:
        return "hi"
    if en_score > kn_score and en_score > hi_score:
        return "en"

    # Default fallback
    return default_lang if default_lang in ("kn", "hi", "en") else "en"


def extract_amount(text: str) -> Optional[Decimal]:
    """Extract numeric amount from speech text."""
    # 1. Match digits with optional decimals: 100, 100.50, 100 rupai, ₹100
    digit_match = re.search(r"₹?\s*(\d+(\.\d{1,2})?)", text)
    if digit_match:
        try:
            return Decimal(digit_match.group(1)).quantize(Decimal("0.01"))
        except Exception:
            pass

    # 2. Match spoken words (e.g. "nooru rupayi", "ek sau rupaye", "hundred rupees")
    text_lower = text.lower()
    for word, val in NUMBER_WORDS.items():
        # Check boundary
        pattern = r"\b" + re.escape(word.lower()) + r"\b"
        if re.search(pattern, text_lower):
            return val.quantize(Decimal("0.01"))

    return None


def extract_customer_name(text: str) -> Optional[str]:
    """
    Extracts customer name from natural Kannada, Hindi, and English patterns.
    Examples:
    - 'save ramesh's 2000 rupees' -> ramesh
    - '100 rupai Rohan hesralli bari' -> Rohan
    - 'Rohan 200 rupayi kottiddane' -> Rohan
    - 'Rohan eshtu baaki iddane?' -> Rohan
    - 'Rohan ka balance kitna hai' -> Rohan
    - 'Rohan ne 200 diye' -> Rohan
    - 'Add 100 credit for Rohan' -> Rohan
    - 'Payment of 200 from Rohan' -> Rohan
    - 'Rohaninda 50 bantu' -> Rohan
    - 'Rohan ge 100 kodi' -> Rohan
    - 'Rohan se 200 mile' -> Rohan
    """
    cleaned = text.strip()

    # Strip conversational suffix particles and possessives from names
    def clean_name(name: str) -> str:
        n = name.strip()
        # English / Hindi / Kannada possessives
        n = re.sub(r"['’]s$", "", n, flags=re.IGNORECASE).strip()
        # Kannada suffixes: -inda (from), -ge/-ige (to), -du/-da (of), -na/-ra
        for suff in ["inda", "ದಿಂದ", "ige", "ಗೆ", "ge", "du", "ದು", "da", "ದ"]:
            if n.lower().endswith(suff) and len(n) > len(suff) + 2:
                n = n[:-len(suff)]
                break
        # Hindi suffixes: -ji, -bhai
        for suff in ["ji", "जी", "bhai", "भाई"]:
            if n.lower().endswith(suff) and len(n) > len(suff) + 2:
                n = n[:-len(suff)]
                break
        return n.strip()

    # Priority 0: Explicit Action + Customer Name (e.g. "save ramesh's 2000 rupees", "record payment from ramesh", "save ramesh 2000")
    m = re.search(r"(?:save|add|record|enter|put|note|write)\s+(?:credit|payment|udhar|jama)?\s*([A-Za-z\u0C80-\u0CFF\u0900-\u097F]+(?:['’]s)?)\b", cleaned, re.IGNORECASE)
    if m:
        cand = clean_name(m.group(1))
        if cand.lower() not in ["credit", "payment", "udhar", "rupees", "rupayi", "rs", "bill", "today", "yesterday", "money", "cash", "upi"]:
            return cand

    # Priority 0b: Possessive name pattern: e.g. "ramesh's 2000 rupees" or "save ramesh's 2000"
    m = re.search(r"\b([A-Za-z\u0C80-\u0CFF\u0900-\u097F]+)(?:['’]s)\b", cleaned, re.IGNORECASE)
    if m:
        cand = clean_name(m.group(1))
        if cand.lower() not in ["today", "yesterday", "shop", "store", "credit", "payment"]:
            return cand

    # Kannada Patterns
    # <name> hesaru / hesralli / hesaralli / ಹೆಸರಲ್ಲಿ / ಹೆಸರು
    m = re.search(r"([A-Za-z\u0C80-\u0CFF]+)\s+(?:hesaru|hesaralli|hesralli|hesrli|ಹೆಸರಲ್ಲಿ|ಹೆಸರು|ಖಾತೆಗೆ|ಖಾತೆಲಿ)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <amount> [rupai/rupayi] <name> hesaralli/hesralli [bari/haaku]
    m = re.search(r"(?:\d+|[a-zA-Z]+)?\s*(?:rupai|rupayi|ರೂಪಾಯಿ|ರೂ)?\s*([A-Za-z\u0C80-\u0CFF]+)\s+(?:hesaralli|hesralli|hesaru|ಹೆಸರಲ್ಲಿ|ಹೆಸರು|ಖಾತೆಗೆ|ಖಾತೆಲಿ)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name> <amount> [rupai] kottiddane / kottidare / kottan
    m = re.search(r"([A-Za-z\u0C80-\u0CFF]+)\s+\d+.*(?:kottiddane|kottidare|kotta|ಕೊಟ್ಟಿದ್ದಾನೆ|ಕೊಟ್ಟಿದ್ದಾರೆ)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name>inda ... bantu / kottidare
    m = re.search(r"([A-Za-z\u0C80-\u0CFF]+(?:inda|ದಿಂದ))\s+.*(?:bantu|kottidare|kottiddane|banthu)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name>ge ... udhar / kodi
    m = re.search(r"([A-Za-z\u0C80-\u0CFF]+(?:ge|ige|ಗೆ))\s+.*(?:udhar|kodi|bari|haaku)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name> eshtu baaki [iddane/idare]?
    m = re.search(r"([A-Za-z\u0C80-\u0CFF]+)\s+(?:eshtu|estu|ಎಷ್ಟು)\s+(?:baaki|baki|ಬಾಕಿ)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name> du history / purchases
    m = re.search(r"([A-Za-z\u0C80-\u0CFF]+)(?:du|na|ra)?\s+(?:history|purchases|bills|ಖರೀದಿ|ಹಿಸ್ಟರಿ)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # Hindi Patterns
    # <name> ke naam pe / par <amount> udhar / <name> के नाम
    m = re.search(r"([A-Za-z\u0900-\u097F]+)\s+(?:ke|के)\s+(?:naam|नाम|khate|खाते|khata|खाता)\s*(?:pe|par|me|mein|पे|पर|में)?", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name> ko <amount> udhar / <name> को उधार
    m = re.search(r"([A-Za-z\u0900-\u097F]+)\s+(?:ko|को)\s+.*(?:udhar|udhaar|उधार|dena|do|देना|दो|likho|लिखो)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name> se <amount> mile / payment / <name> से मिले
    m = re.search(r"([A-Za-z\u0900-\u097F]+)\s+(?:se|से)\s+.*(?:mile|aaye|aaya|mila|jama|मिले|आए|आया|मिला|जमा)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name> ne <amount> diye / jamakare / <name> ने दिए
    m = re.search(r"([A-Za-z\u0900-\u097F]+)\s+(?:ne|ने)\s+.*(?:diye|jama|bhare|diya|दिए|दिया|जमा|भरे)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # <name> ka balance / baaki kitna hai / <name> का हिसाब
    m = re.search(r"([A-Za-z\u0900-\u097F]+)\s+(?:ka|का)\s+(?:balance|khata|baaki|udhar|hisab|बैलेंस|खाता|बाकी|उधार|हिसाब)", cleaned, re.IGNORECASE)
    if m:
        return clean_name(m.group(1))

    # English Patterns
    # for <name> / to <name> / from <name>
    m = re.search(r"(?:for|to|from|on)\s+([A-Za-z]+)", cleaned, re.IGNORECASE)
    if m:
        cand = m.group(1).strip()
        if cand.lower() not in ["credit", "debit", "payment", "bill", "today", "cash", "upi"]:
            return clean_name(cand)

    # Check words with broad stop list
    stop_words = {
        "save", "add", "record", "give", "how", "much", "what", "is", "the",
        "balance", "of", "udhar", "udhaar", "credit", "payment", "put", "enter",
        "note", "write", "please", "can", "you", "ivattu", "today", "aaj",
        "kilo", "rupai", "rupayi", "rupees", "rupee", "rs", "inr", "money"
    }
    words = [w for w in cleaned.split() if w.lower() not in stop_words]
    if words and words[0].isalpha() and words[0].lower() not in stop_words:
        return clean_name(words[0])

    # Check last word if it looks like a proper name (e.g. "udhar 300 rohan" or "100 rohan")
    if words and len(words) > 1 and words[-1].isalpha() and words[-1].lower() not in stop_words and words[-1].lower() not in ["kottiddane", "bari", "likho", "do", "kodi"]:
        return clean_name(words[-1])

    return None


COMMON_TRANSLITERATIONS: Dict[str, str] = {
    "ರಮೇಶ್": "ramesh", "ರಮೇಶ": "ramesh", "ರಮೇಶಕುಮಾರ": "ramesh kumar", "ರಮೇಶ್ ಕುಮಾರ್": "ramesh kumar",
    "रमेश": "ramesh", "रमेश कुमार": "ramesh kumar",
    "ರೋಹನ್": "rohan", "ರೋಹನ್ ಕುಮಾರ್": "rohan kumar", "रोहन": "rohan", "रोहन कुमार": "rohan kumar",
    "ಸುರೇಶ್": "suresh", "ಸುರೇಶ": "suresh", "सुरेश": "suresh",
    "ಮಹೇಶ್": "mahesh", "ಮಹೇಶ": "mahesh", "महेश": "mahesh",
    "ಅಮೋಘ": "amogh", "अमोघ": "amogh",
    "ರಾಜು": "raju", "ರಾಜೇಶ": "rajesh", "राजू": "raju", "राजेश": "rajesh",
    "ಪ್ರಕಾಶ್": "prakash", "प्रकाश": "prakash",
}


def match_customer(
    name_query: str,
    shop_customers: List[Dict[str, Any]],
) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]], str]:
    """
    Matches a spoken or transliterated customer name against the shop's customer list.
    Returns (matched_customer_or_none, candidates_list, status_code).
    Status codes:
    - 'matched'
    - 'multiple_matches'
    - 'not_found'
    """
    if not name_query or not shop_customers:
        return None, [], "not_found"

    q = name_query.strip().lower()
    q_trans = COMMON_TRANSLITERATIONS.get(q, q)

    # 1. Exact match (original or transliterated)
    exact_matches = [
        c for c in shop_customers
        if c["customer_name"].strip().lower() in (q, q_trans)
    ]
    if len(exact_matches) == 1:
        return exact_matches[0], exact_matches, "matched"
    elif len(exact_matches) > 1:
        return None, exact_matches, "multiple_matches"

    # 2. Prefix / Contains match (original or transliterated)
    contains_matches = [
        c for c in shop_customers
        if q in c["customer_name"].strip().lower()
        or c["customer_name"].strip().lower() in q
        or q_trans in c["customer_name"].strip().lower()
        or c["customer_name"].strip().lower() in q_trans
    ]
    if len(contains_matches) == 1:
        return contains_matches[0], contains_matches, "matched"
    elif len(contains_matches) > 1:
        return None, contains_matches, "multiple_matches"

    # 3. Fuzzy matching for transliterations (e.g. 'Rohan' vs 'Rohan R' vs 'Rohana')
    scored = []
    for c in shop_customers:
        c_name = c["customer_name"].strip().lower()
        score = difflib.SequenceMatcher(None, q, c_name).ratio()
        if score >= 0.70:
            scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return None, [], "not_found"

    # If top score is distinctly ahead (> 0.85 and runner-up differs significantly)
    if len(scored) == 1 or (scored[0][0] >= 0.85 and scored[0][0] - scored[1][0] > 0.15):
        return scored[0][1], [scored[0][1]], "matched"

    # Close duplicate scores -> multiple matches
    candidates = [item[1] for item in scored[:4]]
    return None, candidates, "multiple_matches"


def parse_intent(
    text: str,
    language: str = "kn",
) -> Dict[str, Any]:
    """
    Analyzes spoken text and extracts structured intent, amounts, customer names,
    itemized bill items, or daily report queries.
    """
    cleaned = text.strip()
    lower = cleaned.lower()

    # Check for confirmation responses
    if lower in ["howdu", "ha", "yes", "sari", "bari", "kodi", "theek hai", "haan", "ok", "confirm", "proceed", "ಖಂಡಿತ", "ಹೌದು", "ಸರಿ", "हाँ", "ठीक है"]:
        return {
            "intent": "confirmation_yes",
            "raw_text": cleaned,
        }
    if lower in ["beda", "illa", "no", "nahi", "cancel", "stop", "ಬೇಡ", "ಇಲ್ಲ", "नहीं", "रद्द"]:
        return {
            "intent": "confirmation_no",
            "raw_text": cleaned,
        }

    # 1. Daily Report Intent
    # "Ivattu eshtu business aagide?", "aaj kitna business hua", "today's report", "daily report"
    if any(k in lower for k in ["business aagide", "business aytu", "eshtu business", "ivattu eshtu", "aaj ka hisab", "aaj kitna business", "daily report", "today report", "today's sales"]):
        return {
            "intent": "get_daily_report",
            "date": "today",
            "raw_text": cleaned,
        }

    # 2. Customer History / Purchases Intent
    # "Rohan du history torsu", "What did Rohan buy", "Rohan ka purana hisab"
    if any(k in lower for k in ["history", "purchases", "buy", "bought", "kharidi", "purana bill", "bills", "ಹಿಸ್ಟರಿ", "ಖರೀದಿ"]):
        cust_name = extract_customer_name(cleaned)
        return {
            "intent": "get_customer_history",
            "customer_name": cust_name,
            "raw_text": cleaned,
        }

    # 3. Balance Inquiry Intent
    # "Rohan eshtu baaki iddane?", "Rohan ka balance kitna hai?", "What is Rohan's balance?"
    if any(k in lower for k in ["baaki", "baki", "eshtu baaki", "kitna balance", "kitna baaki", "balance kitna", "balance", "due", "ಬಾಕಿ", "ಎಷ್ಟು ಬಾಕಿ"]):
        cust_name = extract_customer_name(cleaned)
        return {
            "intent": "get_balance",
            "customer_name": cust_name,
            "raw_text": cleaned,
        }

    # 4. Itemized Purchase / Bill Creation Intent
    # "2 kilo sakkare bill maadu", "1 packet maggi bill", "create purchase"
    if any(k in lower for k in ["bill maadu", "bill madi", "bill banao", "bill karo", "create bill", "create purchase", "ಬಿಲ್ ಮಾಡು", "बिल बनाओ"]):
        # Extract items
        items = parse_bill_items(cleaned)
        cust_name = extract_customer_name(cleaned)
        return {
            "intent": "create_purchase",
            "customer_name": cust_name,
            "items": items,
            "raw_text": cleaned,
        }

    # 5. Payment Recording Intent
    # "Rohan 200 rupayi kottiddane", "Rohan ne 200 diye", "Record payment of 200 from Rohan", "Rohan se 300 mile", "Rohaninda 50 bantu"
    payment_cues = [
        "kottiddane", "kottidare", "kotta", "bantu", "banthu", "bandide", "jama", "jamaa", "diye", "diya",
        "mile", "mila", "aaye", "aaya", "bhare", "vasooli", "paid", "received", "payment", "repaid",
        "ಕೊಟ್ಟಿದ್ದಾನೆ", "ಕೊಟ್ಟಿದ್ದಾರೆ", "ಬಂತು", "ಜಮಾ", "दिए", "मिला", "मिले", "जमा"
    ]
    if any(cue in lower for cue in payment_cues):
        amount = extract_amount(cleaned)
        cust_name = extract_customer_name(cleaned)
        return {
            "intent": "record_payment",
            "amount": str(amount) if amount else None,
            "customer_name": cust_name,
            "raw_text": cleaned,
        }

    # 6. Add Credit Intent
    # "save ramesh's 2000 rupees", "100 rupai Rohan hesralli bari", "Rohan ke naam 100 udhar likho", "Add 100 credit to Rohan", "Rohan ko 500 do", "Rohan ge 50 kodi"
    credit_cues = [
        "save", "add", "record", "enter", "put", "note", "hesralli", "hesaralli", "bari", "haaku", "kodi",
        "udhar", "udhaar", "credit", "likho", "udhari", "dena", "dedo", "khatemein", "khate me",
        "ಖಾತೆಗೆ", "ಹೆಸರಲ್ಲಿ", "ಬರೆ", "ಉದ್ದರಿ", "ಉದ್ಧಾರ", "ಕೊಡಿ", "ಹಾಕು", "उधार", "लिखो"
    ]
    if any(cue in lower for cue in credit_cues):
        amount = extract_amount(cleaned)
        cust_name = extract_customer_name(cleaned)
        return {
            "intent": "add_credit",
            "amount": str(amount) if amount else None,
            "customer_name": cust_name,
            "raw_text": cleaned,
        }

    # Fallback checks: If an amount and customer name exist, check if credit or payment is implied
    amount = extract_amount(cleaned)
    cust_name = extract_customer_name(cleaned)
    if amount and cust_name:
        return {
            "intent": "add_credit",
            "amount": str(amount),
            "customer_name": cust_name,
            "raw_text": cleaned,
        }

    return {
        "intent": "unknown_intent",
        "raw_text": cleaned,
    }


def parse_bill_items(text: str) -> List[Dict[str, Any]]:
    """Parse item quantity, unit, and product name from a voice bill command."""
    # Example: "2 kilo sakkare bill maadu" -> quantity: 2.000, unit: kg, product_name: sakkare
    items = []
    # Simple regex for quantity + unit + product
    match = re.search(r"(\d+(?:\.\d+)?)\s*(kilo|kg|gram|gm|packet|pkt|piece|litre|box|ಕೆಜಿ|ಕಿಲೋ|ಪ್ಯಾಕೆಟ್|ಲೀಟರ್|ಪೀಸ್)?\s+([A-Za-z\u0C80-\u0CFF\u0900-\u097F]+)", text, re.IGNORECASE)
    if match:
        qty_str = match.group(1)
        unit_str = match.group(2) or "piece"
        prod_name = match.group(3).strip()

        # normalize unit
        norm_unit = "piece"
        for u, aliases in UNIT_KEYWORDS.items():
            if unit_str.lower() in aliases:
                norm_unit = u
                break

        try:
            qty_dec = Decimal(qty_str).quantize(Decimal("0.001"))
        except Exception:
            qty_dec = Decimal("1.000")

        items.append({
            "product_name": prod_name,
            "quantity": str(qty_dec),
            "unit": norm_unit,
            "unit_price": "0.00",
        })
    return items
