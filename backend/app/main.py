from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import create_tables, get_db, AsyncSessionLocal
from app.db.crud.cases import seed_sample_cases
from app.api.routes import auth, matches, cases
from app.api.websocket.game import game_websocket_handler
from app.api.websocket.manager import manager

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başladığında tabloları oluştur ve örnek verileri ekle."""
    await create_tables()
    async with AsyncSessionLocal() as db:
        await seed_sample_cases(db)
        await db.commit()
    yield


app = FastAPI(
    title="Avukat Oyunu API",
    description="Çevrimiçi çok oyunculu hukuk ve mahkeme simülasyonu",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST Routes
app.include_router(auth.router)
app.include_router(matches.router)
app.include_router(cases.router)


# WebSocket Endpoint
@app.websocket("/ws/{match_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    match_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    await game_websocket_handler(websocket, match_id, user_id, db)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Avukat Oyunu API"}
