from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import User
from app.core.auth import hash_password
import secrets


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    username: str,
    email: str,
    password: str,
    skip_hash: bool = False,
) -> User:
    # skip_hash=True: guest kullanıcılar için — bcrypt bypass
    if skip_hash:
        # Güvenli rastgele token sakla, kullanıcı şifre kullanmayacak
        pw_hash = f"GUEST::{secrets.token_hex(16)}"
    else:
        pw_hash = hash_password(password)
    user = User(
        username=username,
        email=email,
        password_hash=pw_hash,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def update_user_stats(db: AsyncSession, user_id: str, won: bool):
    user = await get_user_by_id(db, user_id)
    if user:
        if won:
            user.wins += 1
        else:
            user.losses += 1
        await db.flush()
