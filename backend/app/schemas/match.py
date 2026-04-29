from typing import Optional
from pydantic import BaseModel


class MatchCreate(BaseModel):
    mode: str = "1v1"
    ai_judge_active: bool = True


class JoinMatch(BaseModel):
    lobby_code: str
    role: str  # prosecutor, defense, witness


class MatchOut(BaseModel):
    id: str
    mode: str
    status: str
    lobby_code: Optional[str]
    judge_hp: int
    current_turn: str
    ai_judge_active: bool

    class Config:
        from_attributes = True


class StartMatch(BaseModel):
    match_id: str
