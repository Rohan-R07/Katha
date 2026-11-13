from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import COOKIE_NAME
from backend.app.core.security import check_password, current_user, fail, hasher, issue_session, throttle
from backend.app.database.connection import get_db
from backend.app.database.models import AuthSession, Shop, User
from backend.app.schemas.inputs import LoginInput, RegistrationInput
from backend.app.services.ledger import entity

router = APIRouter(prefix="/auth", tags=["Authentication"])
SHOP_FIELDS = ["id", "owner_id", "shop_name", "shop_type", "address", "city", "state", "contact_number", "preferred_language", "profile_details", "created_at"]


def identity(db: Session, user: User):
    shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
    return {
        "user": entity(user, ["id", "name", "email", "mobile_number", "created_at"]),
        "shop": entity(shop, SHOP_FIELDS) if shop else None,
    }


@router.post("/register", status_code=201)
def register(payload: RegistrationInput, response: Response, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    email = str(payload.email).lower()
    if db.scalar(select(User.id).where(User.email == email)):
        fail(409, "An account with this email already exists.", "account_exists")
    user = User(name=payload.name, email=email, mobile_number=payload.mobile_number, password_hash=hasher.hash(payload.password))
    db.add(user)
    db.flush()
    issue_session(db, user, response, request)
    db.commit()
    return identity(db, user)


@router.post("/login")
def login(payload: LoginInput, response: Response, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not check_password(payload.password, user):
        fail(401, "Email or password is incorrect.", "invalid_credentials")
    issue_session(db, user, response, request)
    db.commit()
    return identity(db, user)


@router.post("/logout")
def logout(request: Request, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.get(AuthSession, request.state.session_id)
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/api")
    return {"message": "You have been signed out."}


@router.get("/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return identity(db, user)
