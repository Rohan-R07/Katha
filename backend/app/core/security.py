from datetime import datetime, timedelta, timezone
from collections import defaultdict, deque
import threading
import time
from uuid import uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import COOKIE_NAME, SESSION_HOURS, signing_secret
from backend.app.database.connection import get_db
from backend.app.database.models import AuthSession, Shop, User

hasher = PasswordHasher()
_dummy_hash = hasher.hash(str(uuid4()))
_attempts: dict[str, deque] = defaultdict(deque)
_attempt_lock = threading.Lock()


def fail(status: int, message: str, code: str):
    raise HTTPException(status_code=status, detail={"error": message, "code": code})


def throttle(request: Request):
    # Coarse local guard; upstream/distributed rate limiting is documented for production scaling.
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _attempt_lock:
        q = _attempts[key]
        while q and q[0] < now - 900:
            q.popleft()
        if len(q) >= 30:
            fail(429, "Too many sign-in attempts. Try again in 15 minutes.", "rate_limited")
        q.append(now)


def check_password(password: str, user: User | None) -> bool:
    try:
        return hasher.verify(user.password_hash if user else _dummy_hash, password) and user is not None
    except (VerificationError, InvalidHashError):
        return False


def issue_session(db: Session, user: User, response: Response, request: Request):
    expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
    session = AuthSession(user_id=user.id, expires_at=expires)
    db.add(session)
    db.flush()
    token = jwt.encode(
        {"sub": user.id, "jti": session.id, "exp": expires, "iat": datetime.now(timezone.utc), "iss": "khata"},
        signing_secret(), algorithm="HS256",
    )
    secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto", "").split(",")[0] == "https"
    response.set_cookie(
        COOKIE_NAME, token, httponly=True, secure=secure, samesite="lax",
        max_age=SESSION_HOURS * 3600, path="/api",
    )


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    bearer = request.headers.get("authorization", "")
    if bearer.lower().startswith("bearer "):
        token = bearer[7:]
    if not token:
        fail(401, "Please sign in to your shop.", "unauthenticated")
    try:
        claims = jwt.decode(
            token, signing_secret(), algorithms=["HS256"], issuer="khata",
            options={"require": ["sub", "jti", "exp", "iat"]},
        )
    except jwt.InvalidTokenError:
        fail(401, "Your session has expired. Please sign in again.", "unauthenticated")
    session = db.get(AuthSession, claims["jti"])
    exp = session.expires_at if session else None
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if not session or session.revoked_at or session.user_id != claims["sub"] or (exp and exp <= datetime.now(timezone.utc)):
        fail(401, "Your session has expired. Please sign in again.", "unauthenticated")
    user = db.get(User, claims["sub"])
    if not user:
        fail(401, "Account not found.", "unauthenticated")
    request.state.session_id = session.id
    return user


def current_shop(user: User = Depends(current_user), db: Session = Depends(get_db)) -> Shop:
    shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
    if not shop:
        fail(409, "Set up your shop first.", "shop_required")
    return shop


def lock_shop(db: Session, shop: Shop):
    # Serializes writes per shop so idempotency checks and reversals are race-safe.
    if db.bind and db.bind.dialect.name == "sqlite":
        db.scalar(select(Shop).where(Shop.id == shop.id))
    else:
        db.scalar(select(Shop).where(Shop.id == shop.id).with_for_update())
