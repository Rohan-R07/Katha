from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Name = Annotated[str, Field(min_length=1, max_length=150)]
Key = Annotated[str, Field(min_length=8, max_length=128)]


def parse_money(value: str, allow_zero: bool = False) -> Decimal:
    if not isinstance(value, str) or not re.fullmatch(r"\d{1,12}(\.\d{1,2})?", value):
        raise ValueError("Money must be a decimal string with at most 12 whole digits and two decimal places")
    try:
        amount = Decimal(value)
    except InvalidOperation:
        raise ValueError("Invalid monetary amount")
    if not amount.is_finite() or amount < 0 or (not allow_zero and amount == 0):
        raise ValueError("Amount must be positive" if not allow_zero else "Amount cannot be negative")
    return amount.quantize(Decimal("0.01"))


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class RegistrationInput(Input):
    name: Annotated[str, Field(min_length=1, max_length=120)]
    email: EmailStr
    mobile_number: str = Field(pattern=r"^\+?[0-9]{10,13}$")
    password: str = Field(min_length=10, max_length=128)


class LoginInput(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ShopDetails(Input):
    shopkeeper_name: str = Field(default="", max_length=120)
    alternate_phone: str = Field(default="", max_length=16)
    email: str = Field(default="", max_length=254)
    market_area: str = Field(default="", max_length=150)
    pincode: str = Field(default="", max_length=12)
    upi_id: str = Field(default="", max_length=150)
    gst_number: str = Field(default="", max_length=30)

    @field_validator("alternate_phone")
    @classmethod
    def phone(cls, value):
        if value and not re.fullmatch(r"\+?[0-9]{10,13}", value):
            raise ValueError("Use a valid alternate mobile number")
        return value


class CustomerDetails(Input):
    alternate_phone: str = Field(default="", max_length=16)
    alternate_phone_label: str = Field(default="", max_length=100)
    # Informational preference, not an enforced credit policy.
    credit_limit: str = "0.00"

    @field_validator("alternate_phone")
    @classmethod
    def phone(cls, value):
        return ShopDetails.phone(value)

    @field_validator("credit_limit")
    @classmethod
    def money(cls, value):
        return str(parse_money(value, allow_zero=True))


class CatalogDetails(Input):
    name_kannada: str = Field(default="", max_length=150)
    name_hindi: str = Field(default="", max_length=150)
    pricing_type: Literal["per_unit", "per_kg"] = "per_unit"
    unit: Literal["kg", "gram", "packet", "piece", "box", "litre", "bottle", "pouch", "dozen", "tin"] = "piece"
    stock_quantity: float = Field(default=0, ge=0, le=1e12, allow_inf_nan=False)
    min_stock_alert: float = Field(default=0, ge=0, le=1e12, allow_inf_nan=False)
    barcode: str = Field(default="", max_length=150)
    voice_keywords: list[Annotated[str, Field(max_length=100)]] = Field(default_factory=list, max_length=100)
    is_available: bool = True
    emoji: str = Field(default="", max_length=30)


class ShopInput(Input):
    shop_name: Name
    shop_type: str = Field(default="Kirana", max_length=80)
    address: str = Field(default="", max_length=2000)
    city: str = Field(default="", max_length=100)
    state: str = Field(default="", max_length=100)
    contact_number: str = Field(default="", max_length=16)
    preferred_language: str = Field(default="en", max_length=30)
    profile_details: ShopDetails | None = None

    @field_validator("contact_number")
    @classmethod
    def phone(cls, value):
        if value and not re.fullmatch(r"\+?[0-9]{10,13}", value):
            raise ValueError("Use a valid mobile number (10 to 13 digits)")
        return value


class CustomerUpdate(Input):
    customer_name: Name
    mobile_number: str = Field(default="", max_length=16)
    address: str = Field(default="", max_length=2000)
    notes: str = Field(default="", max_length=2000)
    contact_details: CustomerDetails | None = None

    @field_validator("mobile_number")
    @classmethod
    def phone(cls, value):
        if value and not re.fullmatch(r"\+?[0-9]{10,13}", value):
            raise ValueError("Use a valid mobile number (10 to 13 digits)")
        return value


class CustomerInput(CustomerUpdate):
    opening_balance: str = "0.00"
    idempotency_key: Key | None = None

    @field_validator("opening_balance")
    @classmethod
    def money(cls, value):
        return str(parse_money(value, allow_zero=True))


class TransactionInput(Input):
    customer_id: str = Field(min_length=1, max_length=36)
    transaction_type: Literal["credit", "payment"]
    amount: str
    description: str = Field(default="", max_length=500)
    idempotency_key: Key

    @field_validator("amount")
    @classmethod
    def money(cls, value):
        return str(parse_money(value))


class PaymentInput(Input):
    customer_id: str = Field(min_length=1, max_length=36)
    amount: str
    description: str = Field(default="", max_length=500)
    idempotency_key: Key

    @field_validator("amount")
    @classmethod
    def money(cls, value):
        return str(parse_money(value))


class ReversalInput(Input):
    reason: str = Field(min_length=3, max_length=500)
    idempotency_key: Key


class CategoryInput(Input):
    category_name: Annotated[str, Field(min_length=1, max_length=100)]


class ProductInput(Input):
    product_name: Name
    category_id: str | None = Field(default=None, max_length=36)
    price: str
    catalog_details: CatalogDetails | None = None

    @field_validator("price")
    @classmethod
    def money(cls, value):
        return str(parse_money(value, allow_zero=True))


class AiCommandInput(Input):
    intent: Literal["add_credit", "record_payment", "get_balance"]
    customer_id: str = Field(min_length=1, max_length=36)
    amount: str | None = None
    description: str = Field(default="", max_length=500)
    confirmed: bool = False
    idempotency_key: Key | None = None
    session_id: str | None = Field(default=None, min_length=1, max_length=128)
