import random
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.db.models import Case, Evidence


async def get_random_case(db: AsyncSession) -> Optional[Case]:
    """Veritabanından rastgele bir dava çeker."""
    result = await db.execute(select(func.count()).select_from(Case))
    count = result.scalar()
    if count == 0:
        return None
    offset = random.randint(0, count - 1)
    result = await db.execute(
        select(Case).options(selectinload(Case.evidence)).offset(offset).limit(1)
    )
    return result.scalar_one_or_none()


async def get_case_by_id(db: AsyncSession, case_id: str) -> Optional[Case]:
    result = await db.execute(
        select(Case).options(selectinload(Case.evidence)).where(Case.id == case_id)
    )
    return result.scalar_one_or_none()


async def get_all_cases(db: AsyncSession) -> List[Case]:
    result = await db.execute(select(Case).options(selectinload(Case.evidence)))
    return result.scalars().all()


async def get_evidence_for_case(db: AsyncSession, case_id: str) -> List[Evidence]:
    result = await db.execute(
        select(Evidence).where(Evidence.case_id == case_id)
    )
    return result.scalars().all()


async def seed_sample_cases(db: AsyncSession):
    """Geliştirme ortamı için örnek davalar ekler."""
    existing = await db.execute(select(func.count()).select_from(Case))
    if existing.scalar() > 0:
        return  # Zaten dolu

    cases_data = [
        {
            "title": "Şirket Kasasının Soyulması",
            "description": (
                "2024 yılı Ocak ayında, TechCorp A.Ş. şirketinin muhasebe müdürü "
                "Ali Demir, şirket hesaplarından 2 milyon TL'yi sahte faturalar "
                "aracılığıyla zimmete geçirmekle suçlanmaktadır."
            ),
            "category": "dolandırıcılık",
            "difficulty": 2,
            "prosecution_hint": "Banka transferi kayıtları ve sahte fatura imzaları elinizde.",
            "defense_hint": "Müvekkil bu faturaların gerçek olduğunu iddia ediyor, tanıklar var.",
            "witness_agenda": "Şirketin CEO'su da bu transferleri biliyordu ama söylemek istemiyor.",
            "evidence": [
                {"name": "Banka Transfer Kayıtları", "description": "3 farklı hesaba yapılan şüpheli transferler", "evidence_type": "document", "owner_role": "prosecution", "weight": 8},
                {"name": "Sahte Faturalar (x12)", "description": "Var olmayan tedarikçilere kesilmiş faturalar", "evidence_type": "document", "owner_role": "prosecution", "weight": 9},
                {"name": "Tanık İfadesi", "description": "Muhasebe asistanının sözlü ifadesi", "evidence_type": "testimony", "owner_role": "defense", "weight": 6},
            ]
        },
        {
            "title": "Gece Yarısı Cinayeti",
            "description": (
                "İstanbul Bostancı'da bir villada yaşayan emekli iş insanı "
                "Mehmet Yıldız, 15 Mart 2024 gece 02:30'da ölü bulundu. "
                "Gece villa yakınında görülen komşu Selim Kaçar, "
                "cinayetle suçlanmaktadır."
            ),
            "category": "cinayet",
            "difficulty": 4,
            "prosecution_hint": "Parmak izi ve güvenlik kamerası görüntüsü var, ama görüntü bulanık.",
            "defense_hint": "Müvekkilin o saat için sağlam bir alibi var — gece kulübü kaydı.",
            "witness_agenda": "Villada çalışan aşçı, o gece başka birini gördü ama korktundan söylemedi.",
            "evidence": [
                {"name": "Güvenlik Kamerası Görüntüsü", "description": "Bulanık, kimliği net belirsiz bir siluet", "evidence_type": "forensic", "owner_role": "prosecution", "weight": 5},
                {"name": "Parmak İzi Raporu", "description": "Kapı kolunda tespit edilen kısmi parmak izi", "evidence_type": "forensic", "owner_role": "prosecution", "weight": 7},
                {"name": "Gece Kulübü Girişi", "description": "Sanığın o gece kulübe giriş kaydı", "evidence_type": "document", "owner_role": "defense", "weight": 8},
                {"name": "Aşçının Gizli Tanıklığı", "description": "Aşçı o gece farklı bir kişi gördüğünü söylüyor", "evidence_type": "testimony", "owner_role": "defense", "weight": 9},
            ]
        },
        {
            "title": "Marka Hırsızlığı Davası",
            "description": (
                "Startup girişimci Zeynep Arslan, büyük bir kozmetik firması "
                "GlamX'in kendi özgün parfüm formülünü çaldığını iddia ediyor. "
                "GlamX, formülü yasal yollarla geliştirdiğini savunuyor."
            ),
            "category": "fikri mülkiyet",
            "difficulty": 3,
            "prosecution_hint": "Zeynep'in formülü 6 ay önce patent başvurusunda kayıtlı.",
            "defense_hint": "GlamX'in kendi AR-GE ekibi var, bağımsız geliştirdiklerini kanıtlayabilirler.",
            "witness_agenda": "Eski GlamX çalışanı şirketten ayrılmadan önce formüle erişti.",
            "evidence": [
                {"name": "Patent Başvurusu", "description": "Zeynep'in 8 ay önceki patent kaydı", "evidence_type": "document", "owner_role": "prosecution", "weight": 9},
                {"name": "E-posta Yazışmaları", "description": "GlamX çalışanlarının şüpheli iletişimleri", "evidence_type": "document", "owner_role": "prosecution", "weight": 6},
                {"name": "AR-GE Raporu", "description": "GlamX'in bağımsız geliştirme belgesi", "evidence_type": "document", "owner_role": "defense", "weight": 7},
            ]
        }
    ]

    for c_data in cases_data:
        evidence_list = c_data.pop("evidence", [])
        case = Case(**c_data)
        db.add(case)
        await db.flush()
        for e_data in evidence_list:
            ev = Evidence(case_id=case.id, **e_data)
            db.add(ev)
    await db.flush()
