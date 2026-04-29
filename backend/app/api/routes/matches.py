from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db import crud
from app.core.auth import get_current_user
from app.schemas.match import MatchCreate, JoinMatch, MatchOut
from app.api.websocket.manager import manager
from datetime import datetime

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.post("/", response_model=MatchOut, status_code=201)
async def create_match(
    payload: MatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = await crud.cases.get_random_case(db)
    match = await crud.matches.create_match(
        db,
        mode=payload.mode,
        case_id=case.id if case else None,
        ai_judge_active=payload.ai_judge_active,
    )
    await crud.matches.add_participant(db, match.id, current_user.id, "prosecutor")

    if payload.mode == "bot":
        # Bot kullanıcısını bul veya oluştur
        bot_user = await crud.users.get_user_by_username(db, "AI_Avukat")
        if not bot_user:
            bot_user = await crud.users.create_user(db, "AI_Avukat", "bot@avukat.local", "", skip_hash=True)
        await crud.matches.add_participant(db, match.id, bot_user.id, "defense")

    return MatchOut.model_validate(match)


@router.post("/join", response_model=MatchOut)
async def join_match(
    payload: JoinMatch,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    match = await crud.matches.get_match_by_lobby_code(db, payload.lobby_code.upper())
    if not match:
        raise HTTPException(status_code=404, detail="Lobi bulunamadı.")
    if match.status == "finished":
        raise HTTPException(status_code=400, detail="Bu maç zaten bitti.")

    existing = [p for p in match.participants if p.user_id == current_user.id]
    if existing:
        return MatchOut.model_validate(match)

    await crud.matches.add_participant(db, match.id, current_user.id, payload.role)

    # Lobideki herkese yeni oyuncu bildir
    await manager.broadcast(match.id, {
        "type": "player_joined",
        "user_id": current_user.id,
        "username": current_user.username,
    })

    return MatchOut.model_validate(match)


@router.post("/{match_id}/start", response_model=MatchOut)
async def start_match(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.db.models import Match
    match = await crud.matches.get_match_by_id(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Maç bulunamadı.")
    if match.status != "waiting":
        raise HTTPException(status_code=400, detail="Maç zaten başladı veya bitti.")

    match_obj = await db.get(Match, match_id)
    match_obj.status = "active"
    match_obj.started_at = datetime.utcnow()
    await db.flush()

    # TÜM oyunculara oyunun başladığını bildir → redirect
    await manager.broadcast(match_id, {
        "type": "game_started",
        "match_id": match_id,
        "case": {
            "title": match.case.title if match.case else "Bilinmeyen Dava",
            "description": match.case.description if match.case else "",
        },
    })

    return MatchOut.model_validate(match_obj)


@router.get("/lobby/{code}")
async def get_lobby_info(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lobi bilgilerini döndürür — polling için."""
    match = await crud.matches.get_match_by_lobby_code(db, code.upper())
    if not match:
        raise HTTPException(status_code=404, detail="Lobi bulunamadı.")
    return {
        "match_id": match.id,
        "status": match.status,
        "lobby_code": match.lobby_code,
        "participants": [
            {"user_id": p.user_id, "username": p.user.username, "role": p.role}
            for p in match.participants
        ],
    }


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    match = await crud.matches.get_match_by_id(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Maç bulunamadı.")
    return MatchOut.model_validate(match)
