"""Strict purchase inputs; all amounts are decimal strings, never caller totals."""
from decimal import Decimal
import re
from typing import Literal

from pydantic import Field, field_validator, model_validator

from backend.app.schemas.inputs import Input, Key, parse_money


class PurchaseLineInput(Input):
    product_id: str | None = Field(default=None, min_length=1, max_length=36)
    product_name: str = Field(default="", max_length=150)
    quantity: str
    unit: str = Field(min_length=1, max_length=30)
    unit_price: str

    @field_validator("quantity")
    @classmethod
    def positive_quantity(cls, value):
        if not re.fullmatch(r"\d{1,9}(\.\d{1,3})?", value) or Decimal(value) <= 0:
            raise ValueError("Quantity must be a positive decimal string with up to 9 whole digits and 3 decimal places")
        return format(Decimal(value).quantize(Decimal("0.001")), ".3f")

    @field_validator("unit_price")
    @classmethod
    def price(cls, value):
        return format(parse_money(value, allow_zero=True), ".2f")

    @model_validator(mode="after")
    def item_identity(self):
        if not self.product_id and not self.product_name:
            raise ValueError("Choose a product or enter an item name")
        return self


class PurchaseInput(Input):
    customer_id: str = Field(min_length=1, max_length=36)
    payment_method: Literal["cash", "upi", "khata"]
    items: list[PurchaseLineInput] = Field(min_length=1, max_length=100)
    notes: str = Field(default="", max_length=1000)
    idempotency_key: Key
