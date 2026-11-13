"""Voice processing input schemas."""
from typing import Annotated, Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.inputs import Input, Key


class VoiceProcessInput(Input):
    """
    Input for /api/ai/voice/process.
    Accepts raw audio_base64 (PCM / WAV / WebM) or speech text, language preference,
    session_id, and optional confirmation flags.
    """
    audio_base64: Optional[str] = None
    text: Optional[str] = None
    language: Literal["kn", "hi", "en"] = "kn"
    session_id: Optional[str] = Field(default=None, max_length=128)
    confirmed: bool = False
    auto_create_customer: bool = True
    idempotency_key: Optional[Key] = None
    pending_operation: Optional[Dict[str, Any]] = None
