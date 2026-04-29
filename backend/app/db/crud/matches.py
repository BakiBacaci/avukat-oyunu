import random
import string
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.db.models import Match, MatchParticipant, MatchLog, Case, Lobby
from datetime import datetime


def _generate_lobby_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def create_match(
    db: AsyncSession,
    mode: str = "1v1",
    case_id: Optional[str] = None,
    ai_judge_active: bool = True,
) -> Match:
    lobby_code = _generate_lobby_code()
    match = Match(
        mode=mode,
        case_id=case_id,
        lobby_code=lobby_code,
        ai_judge_active=ai_judge_active,
    )
    db.add(match)
    await db.flush()
    await db.refresh(match)
    return match


async def get_match_by_id(db: AsyncSession, match_id: str) -> Optional[Match]:
    result = await db.execute(
        select(Match)
        .options(
            selectinload(Match.participants).selectinload(MatchParticipant.user),
            selectinload(Match.case),
            selectinload(Match.logs),
        )
        .where(Match.id == match_id)
    )
    return result.scalar_one_or_none()


async def get_match_by_lobby_code(db: AsyncSession, code: str) -> Optional[Match]:
    result = await db.execute(
        select(Match)
        .options(selectinload(Match.participants).selectinload(MatchParticipant.user))
        .where(Match.lobby_code == code)
    )
    return result.scalar_one_or_none()


async def add_participant(
    db: AsyncSession, match_id: str, user_id: str, role: str
) -> MatchParticipant:
    participant = MatchParticipant(match_id=match_id, user_id=user_id, role=role)
    db.add(participant)
    await db.flush()
    return participant


async def add_log(
    db: AsyncSession,
    match_id: str,
    action_type: str,
    content: Optional[str] = None,
    user_id: Optional[str] = None,
    evidence_id: Optional[str] = None,
    ai_score: Optional[float] = None,
    ai_reasoning: Optional[str] = None,
    judge_hp_delta: int = 0,
) -> MatchLog:
    log = MatchLog(
        match_id=match_id,
        user_id=user_id,
        action_type=action_type,
        content=content,
        evidence_id=evidence_id,
        ai_score=ai_score,
        ai_reasoning=ai_reasoning,
        judge_hp_delta=judge_hp_delta,
    )
    db.add(log)
    await db.flush()
    return log


async def update_match_hp(db: AsyncSession, match_id: str, delta: int) -> Match:
    match = await db.get(Match, match_id)
    if match:
        match.judge_hp = max(0, min(100, match.judge_hp + delta))
        if match.judge_hp == 0:
            match.status = "finished"
            match.ended_at = datetime.utcnow()
        await db.flush()
    return match


async def finish_match(db: AsyncSession, match_id: str, winner_id: str):
    match = await db.get(Match, match_id)
    if match:
        match.status = "finished"
        match.winner_id = winner_id
        match.ended_at = datetime.utcnow()
        await db.flush()
