"""
Schemas for AI Handwritten Khata Import.
"""
from typing import Annotated, Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.inputs import Input, Key, Name


class ExtractedKhataItem(BaseModel):
    id: str = Field(description="Temporary unique ID for row editing in UI")
    customer_name: str
    matched_customer_id: Optional[str] = None
    is_new_customer: bool = False
    transaction_type: Literal["credit", "payment"] = "credit"
    amount: str
    date: Optional[str] = None
    description: Optional[str] = "Imported from handwritten Khata"
    uncertain: bool = False
    raw_text: Optional[str] = None


class OcrExtractResponse(BaseModel):
    success: bool
    filename: str
    extracted_entries: List[ExtractedKhataItem]
    total_found: int
    message: str


class KhataBatchSaveItem(BaseModel):
    customer_name: Name
    matched_customer_id: Optional[str] = None
    is_new_customer: bool = False
    transaction_type: Literal["credit", "payment"]
    amount: str
    description: Optional[str] = "Imported from handwritten Khata"
    idempotency_key: Key


class KhataBatchSaveInput(Input):
    entries: List[KhataBatchSaveItem]
