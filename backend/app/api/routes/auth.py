from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import random
import string

from app.db.database import get_db
from app.db import crud
from app.core.auth import verify_password, create_access_token, get_current_user
from app.schemas.user import UserRegister, UserLogin, UserOut, Token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GuestLogin(BaseModel):
    username: str


@router.post("/guest", response_model=Token)
async def guest_login(payload: GuestLogin, db: AsyncSession = Depends(get_db)):
    """Sadece kullanıcı adıyla giriş/kayıt."""
    username = payload.username.strip()
    if not username or len(username) < 2:
        raise HTTPException(status_code=400, detail="Kullanıcı adı en az 2 karakter olmalı.")
    if len(username) > 30:
        raise HTTPException(status_code=400, detail="Kullanıcı adı en fazla 30 karakter.")

    user = await crud.users.get_user_by_username(db, username)
    if not user:
        suffix = ''.join(random.choices(string.digits, k=4))
        # Bcrypt max 72 byte — kısa ve güvenli tut
        safe_password = f"gst{suffix}"  # max 7 karakter, sorun yok
        fake_email = f"{username.lower().replace(' ', '_')}_{suffix}@avukat-oyunu.local"
        user = await crud.users.create_user(db, username, fake_email, safe_password)

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    if await crud.users.get_user_by_username(db, payload.username):
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış.")
    if await crud.users.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı.")
    user = await crud.users.create_user(db, payload.username, payload.email, payload.password)
    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await crud.users.get_user_by_username(db, payload.username)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı.")
    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user=Depends(get_current_user)):
    return UserOut.model_validate(current_user)
