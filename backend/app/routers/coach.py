import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import require_roles
from app.models import CoachSession, Role, User, utcnow
from app.schemas import CoachIn, CoachOut
from app.services.coach import generate_feedback

router = APIRouter(prefix="/coach", tags=["coach"])
allowed = require_roles(Role.student, Role.teacher, Role.admin)


@router.post("/feedback", response_model=CoachOut, status_code=201)
def create_feedback(data: CoachIn, db: Session = Depends(get_db), user: User = Depends(allowed)):
    start_of_day = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    used = db.scalar(
        select(func.count())
        .select_from(CoachSession)
        .where(CoachSession.user_id == user.id, CoachSession.created_at >= start_of_day)
    )
    if used >= settings.coach_daily_limit:
        raise HTTPException(429, f"Đã dùng hết {settings.coach_daily_limit} lượt AI Coach hôm nay.")

    feedback, provider = generate_feedback(data.kind, data.text)
    session = CoachSession(
        user_id=user.id,
        kind=data.kind,
        input_text=data.text,
        feedback=feedback,
        provider=provider,
    )
    db.add(session)
    db.commit()
    return session


@router.get("/history", response_model=list[CoachOut])
def history(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(allowed),
):
    limit = max(1, min(limit, 100))
    query = (
        select(CoachSession)
        .where(CoachSession.user_id == user.id)
        .order_by(CoachSession.created_at.desc(), CoachSession.id.desc())
        .limit(limit)
    )
    return db.scalars(query).all()
