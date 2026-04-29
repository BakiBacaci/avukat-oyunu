from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db import crud
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("/random")
async def random_case(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = await crud.cases.get_random_case(db)
    if not case:
        raise HTTPException(status_code=404, detail="Henüz hiç dava eklenmemiş.")
    return {
        "id": case.id,
        "title": case.title,
        "description": case.description,
        "category": case.category,
        "difficulty": case.difficulty,
        "evidence_count": len(case.evidence),
    }


@router.get("/")
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cases = await crud.cases.get_all_cases(db)
    return [
        {
            "id": c.id,
            "title": c.title,
            "category": c.category,
            "difficulty": c.difficulty,
        }
        for c in cases
    ]


@router.get("/{case_id}")
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = await crud.cases.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Dava bulunamadı.")

    # Role-specific bilgi döndürmek için user rolü kontrol edilebilir
    return {
        "id": case.id,
        "title": case.title,
        "description": case.description,
        "category": case.category,
        "difficulty": case.difficulty,
        "evidence": [
            {
                "id": e.id,
                "name": e.name,
                "description": e.description,
                "evidence_type": e.evidence_type,
                "owner_role": e.owner_role,
                "weight": e.weight,
            }
            for e in case.evidence
        ],
    }
