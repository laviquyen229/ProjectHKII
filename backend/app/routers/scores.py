from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import (
    current_user,
    ensure_can_manage_class,
    ensure_can_view_student,
    get_class_or_404,
    require_roles,
    scope_class_student_query,
)
from app.models import Classroom, Enrollment, Role, Score, User
from app.schemas import ScoreClassSummary, ScoreCreate, ScoreOut, ScoreUpdate

router = APIRouter(prefix="/scores", tags=["scores"])
staff = require_roles(Role.admin, Role.teacher)


def _load_score(db: Session, score_id: int, user: User) -> Score:
    score = db.get(Score, score_id)
    if score is None:
        raise HTTPException(404, "Không tìm thấy điểm.")
    ensure_can_manage_class(user, get_class_or_404(db, score.class_id))
    return score


@router.post("", response_model=ScoreOut, status_code=201)
def create_score(data: ScoreCreate, db: Session = Depends(get_db), user: User = Depends(staff)):
    ensure_can_manage_class(user, get_class_or_404(db, data.class_id))
    if data.value > data.max_value:
        raise HTTPException(400, "Điểm không được lớn hơn điểm tối đa.")
    enrolled = db.scalar(
        select(Enrollment.id).where(
            Enrollment.class_id == data.class_id, Enrollment.student_id == data.student_id
        )
    )
    if not enrolled:
        raise HTTPException(400, "Học viên không thuộc lớp này.")
    score = Score(
        class_id=data.class_id,
        student_id=data.student_id,
        kind=data.kind,
        value=Decimal(str(data.value)),
        max_value=Decimal(str(data.max_value)),
        note=data.note,
        recorded_by=user.id,
    )
    db.add(score)
    db.commit()
    return score


@router.get("", response_model=list[ScoreOut])
def list_scores(
    class_id: int | None = None,
    student_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = select(Score).order_by(Score.recorded_at.desc(), Score.id.desc())
    query = scope_class_student_query(db, user, query, Score)
    if class_id is not None:
        query = query.where(Score.class_id == class_id)
    if student_id is not None:
        query = query.where(Score.student_id == student_id)
    return db.scalars(query).all()


@router.patch("/{score_id}", response_model=ScoreOut)
def update_score(
    score_id: int,
    data: ScoreUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(staff),
):
    score = _load_score(db, score_id, user)
    if data.value is not None:
        if Decimal(str(data.value)) > score.max_value:
            raise HTTPException(400, "Điểm không được lớn hơn điểm tối đa.")
        score.value = Decimal(str(data.value))
    if data.note is not None:
        score.note = data.note
    db.commit()
    return score


@router.delete("/{score_id}", status_code=204)
def delete_score(score_id: int, db: Session = Depends(get_db), user: User = Depends(staff)):
    score = _load_score(db, score_id, user)
    db.delete(score)
    db.commit()


@router.get("/student/{student_id}/summary", response_model=list[ScoreClassSummary])
def student_summary(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Điểm trung bình (thang 10) của học viên theo từng lớp."""
    ensure_can_view_student(db, user, student_id)
    query = select(Score).where(Score.student_id == student_id)
    if user.role == Role.teacher:
        own = select(Classroom.id).where(Classroom.teacher_id == user.id)
        query = query.where(Score.class_id.in_(own))
    per_class: dict[int, list[float]] = defaultdict(list)
    for s in db.scalars(query):
        per_class[s.class_id].append(float(s.value) / float(s.max_value) * 10)
    return [
        ScoreClassSummary(class_id=cid, count=len(vals), average_10=round(sum(vals) / len(vals), 2))
        for cid, vals in sorted(per_class.items())
    ]
