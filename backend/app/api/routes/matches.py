from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db import crud
from app.core.auth import get_current_user
from app.schemas.match import MatchCreate, JoinMatch, MatchOut

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.post("/", response_model=MatchOut, status_code=201)
async def create_match(
    payload: MatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Yeni maç oluştur ve savcı olarak katıl."""
    # Rastgele bir dava çek
    case = await crud.cases.get_random_case(db)
    match = await crud.matches.create_match(
        db,
        mode=payload.mode,
        case_id=case.id if case else None,
        ai_judge_active=payload.ai_judge_active,
    )
    # Oluşturan oyuncuyu savcı olarak ekle
    await crud.matches.add_participant(db, match.id, current_user.id, "prosecutor")
    return MatchOut.model_validate(match)


@router.post("/join", response_model=MatchOut)
async def join_match(
    payload: JoinMatch,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lobi kodu ile maça katıl."""
    match = await crud.matches.get_match_by_lobby_code(db, payload.lobby_code.upper())
    if not match:
        raise HTTPException(status_code=404, detail="Lobi bulunamadı.")
    if match.status == "finished":
        raise HTTPException(status_code=400, detail="Bu maç zaten bitti.")

    # Aynı kişi iki kez katılmasın
    existing = [p for p in match.participants if p.user_id == current_user.id]
    if existing:
        raise HTTPException(status_code=400, detail="Zaten bu maçtasın.")

    await crud.matches.add_participant(db, match.id, current_user.id, payload.role)
    return MatchOut.model_validate(match)


@router.post("/{match_id}/start", response_model=MatchOut)
async def start_match(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Maçı başlat (host tetikler)."""
    match = await crud.matches.get_match_by_id(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Maç bulunamadı.")
    if match.status != "waiting":
        raise HTTPException(status_code=400, detail="Maç zaten başladı veya bitti.")

    match_obj = await db.get(__import__('app.db.models', fromlist=['Match']).Match, match_id)
    match_obj.status = "active"
    match_obj.started_at = datetime.utcnow()
    await db.flush()
    return MatchOut.model_validate(match_obj)


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
