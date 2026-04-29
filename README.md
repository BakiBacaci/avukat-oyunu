# Avukat Oyunu 🏛️⚖️

> Çevrimiçi çok oyunculu hukuk ve mahkeme simülasyonu. AI Hakim her argümanı değerlendirir.

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Python FastAPI + WebSockets |
| Veritabanı | SQLite (dev) / PostgreSQL (prod) |
| AI Hakim | Ollama (local) → HuggingFace API (fallback) |
| Deploy | Vercel (frontend) + Render (backend) |

## Hızlı Başlangıç

### Backend

```bash
cd backend
cp .env.example .env
# .env içinde SECRET_KEY ve HUGGINGFACE_API_KEY düzenle

pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger UI)
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

## Oyun Modları

- **1v1 Düello** — Savcı vs Savunma Avukatı, sıra tabanlı
- **Çok Oyunculu** — 1 Savcı + 2 Avukat + 1 Tanık lobi sistemi

## AI Hakim

- Yerel Ollama (llama3.2) → Production'da HuggingFace API (Mistral-7B)
- Türkçe ve İngilizce prompt desteği
- Her argüman çiftini 0-100 arası puanlar
- Kazanan tarafa göre Hakim Sabrı barını günceller

## Deploy (GitHub → Vercel + Render)

Bkz. `implementation_plan.md` için detaylı adımlar.

### GitHub Secrets Gereken Değerler

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL
VITE_WS_URL
RENDER_DEPLOY_HOOK_URL
```

## Proje Yapısı

```
avukat-oyunu/
├── backend/       # FastAPI + SQLAlchemy
├── frontend/      # React + Vite
└── .github/
    └── workflows/ # CI/CD
```
