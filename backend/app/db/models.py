import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text,
    DateTime, ForeignKey, Enum
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, DeclarativeBase
import enum


class Base(DeclarativeBase):
    pass


# ---------- Enums ----------

class RolePref(str, enum.Enum):
    prosecutor = "prosecutor"
    defense = "defense"
    witness = "witness"
    any = "any"


class MatchMode(str, enum.Enum):
    duel = "1v1"
    multiplayer = "multiplayer"


class MatchStatus(str, enum.Enum):
    waiting = "waiting"
    active = "active"
    finished = "finished"


class GameRole(str, enum.Enum):
    prosecutor = "prosecutor"
    defense = "defense"
    witness = "witness"
    judge = "judge"


class ActionType(str, enum.Enum):
    argument = "argument"
    objection = "objection"
    evidence_submit = "evidence_submit"
    ai_verdict = "ai_verdict"
    system = "system"


class EvidenceType(str, enum.Enum):
    document = "document"
    physical = "physical"
    testimony = "testimony"
    forensic = "forensic"


# ---------- Models ----------

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    avatar_url = Column(Text, nullable=True)
    role_pref = Column(String(20), default="any")
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    participations = relationship("MatchParticipant", back_populates="user")
    logs = relationship("MatchLog", back_populates="user")
    hosted_lobbies = relationship("Lobby", back_populates="host")


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)   # cinayet, dolandırıcılık, hırsızlık
    difficulty = Column(Integer, default=1)         # 1-5
    prosecution_hint = Column(Text, nullable=True)  # Savcıya gizli ipucu
    defense_hint = Column(Text, nullable=True)      # Avukata gizli ipucu
    witness_agenda = Column(Text, nullable=True)    # Tanığın gizli ajandası
    created_at = Column(DateTime, default=datetime.utcnow)

    evidence = relationship("Evidence", back_populates="case")
    matches = relationship("Match", back_populates="case")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence_type = Column(String(30), default="document")
    owner_role = Column(String(20), nullable=True)  # prosecution | defense
    weight = Column(Integer, default=5)             # 1-10 kanıt gücü

    case = relationship("Case", back_populates="evidence")
    logs = relationship("MatchLog", back_populates="evidence")


class Match(Base):
    __tablename__ = "matches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=True)
    mode = Column(String(20), nullable=False, default="1v1")
    status = Column(String(20), default="waiting")
    winner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    judge_hp = Column(Integer, default=100)          # Hakim Sabrı barı
    current_turn = Column(String(20), default="prosecutor")
    lobby_code = Column(String(10), unique=True, nullable=True)
    ai_judge_active = Column(Boolean, default=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="matches")
    participants = relationship("MatchParticipant", back_populates="match")
    logs = relationship("MatchLog", back_populates="match", order_by="MatchLog.timestamp")
    lobby = relationship("Lobby", back_populates="match", uselist=False)


class MatchParticipant(Base):
    __tablename__ = "match_participants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    match_id = Column(String(36), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)  # prosecutor, defense, witness, judge
    joined_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="participants")
    user = relationship("User", back_populates="participations")


class MatchLog(Base):
    __tablename__ = "match_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    match_id = Column(String(36), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action_type = Column(String(30), nullable=False)  # argument, objection, evidence_submit, ai_verdict
    content = Column(Text, nullable=True)
    evidence_id = Column(String(36), ForeignKey("evidence.id"), nullable=True)
    ai_score = Column(Float, nullable=True)           # AI'nın hamleye verdiği puan (0-100)
    ai_reasoning = Column(Text, nullable=True)
    judge_hp_delta = Column(Integer, default=0)       # HP değişimi
    timestamp = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="logs")
    user = relationship("User", back_populates="logs")
    evidence = relationship("Evidence", back_populates="logs")


class Lobby(Base):
    __tablename__ = "lobbies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(10), unique=True, nullable=False, index=True)
    host_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    match_id = Column(String(36), ForeignKey("matches.id"), nullable=True)
    max_players = Column(Integer, default=4)
    is_open = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    host = relationship("User", back_populates="hosted_lobbies")
    match = relationship("Match", back_populates="lobby")
