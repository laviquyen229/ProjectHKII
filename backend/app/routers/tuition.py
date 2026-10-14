import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user, require_roles, visible_student_ids
from app.models import Role, TuitionRecord, TuitionStatus, User, utcnow
from app.schemas import TuitionCreate, TuitionOut, TuitionSummary

router = APIRouter(prefix="/tuition", tags=["tuition"])
admin_only = require_roles(Role.admin)


@router.post("", response_model=TuitionOut, status_code=201)
def create_record(data: TuitionCreate, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    student = db.get(User, data.student_id)
    if not student or student.role != Role.student:
        raise HTTPException(404, "Không tìm thấy học viên.")
    record = TuitionRecord(
        student_id=data.student_id,
        class_id=data.class_id,
        amount=Decimal(str(data.amount)),
        due_date=data.due_date,
        note=data.note,
        status=TuitionStatus.unpaid,
    )
    db.add(record)
    db.commit()
    return record


@router.get("", response_model=list[TuitionOut])
def list_records(
    student_id: int | None = None,
    status: TuitionStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if user.role == Role.teacher:
        raise HTTPException(403, "Giáo viên không xem học phí.")
    query = select(TuitionRecord).order_by(TuitionRecord.due_date.desc(), TuitionRecord.id.desc())
    ids = visible_student_ids(db, user)
    if ids is not None:
        query = query.where(TuitionRecord.student_id.in_(list(ids)))
    if student_id is not None:
        query = query.where(TuitionRecord.student_id == student_id)
    if status is not None:
        query = query.where(TuitionRecord.status == status)
    return db.scalars(query).all()


@router.post("/{record_id}/pay", response_model=TuitionOut)
def mark_paid(record_id: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    record = db.get(TuitionRecord, record_id)
    if record is None:
        raise HTTPException(404, "Không tìm thấy khoản học phí.")
    if record.status == TuitionStatus.paid:
        raise HTTPException(409, "Khoản này đã được thanh toán.")
    record.status = TuitionStatus.paid
    record.paid_at = utcnow()
    db.commit()
    return record


@router.post("/mark-overdue")
def mark_overdue(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    """Đánh dấu quá hạn các khoản chưa đóng có hạn trước hôm nay (tương đương tuitionAutoOverdue)."""
    result = db.execute(
        update(TuitionRecord)
        .where(TuitionRecord.status == TuitionStatus.unpaid, TuitionRecord.due_date < dt.date.today())
        .values(status=TuitionStatus.overdue)
    )
    db.commit()
    return {"updated": result.rowcount}


@router.get("/summary", response_model=TuitionSummary)
def summary(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    rows = db.execute(
        select(TuitionRecord.status, func.count(), func.coalesce(func.sum(TuitionRecord.amount), 0))
        .group_by(TuitionRecord.status)
    ).all()
    totals = {s.value: 0.0 for s in TuitionStatus}
    counts = {s.value: 0 for s in TuitionStatus}
    for status, count, total in rows:
        totals[status.value] = float(total)
        counts[status.value] = int(count)
    return TuitionSummary(
        unpaid=totals["unpaid"], paid=totals["paid"], overdue=totals["overdue"], count_by_status=counts
    )
