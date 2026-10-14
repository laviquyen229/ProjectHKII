import datetime as dt

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
from app.models import Attendance, AttendanceStatus, Classroom, Enrollment, Role, User
from app.schemas import AttendanceBatchIn, AttendanceOut, AttendanceSummary

router = APIRouter(prefix="/attendance", tags=["attendance"])


def compute_summary(student_id: int, statuses: list[AttendanceStatus]) -> AttendanceSummary:
    counts = {s: 0 for s in AttendanceStatus}
    for status in statuses:
        counts[status] += 1
    total = len(statuses)
    denominator = total - counts[AttendanceStatus.excused]
    rate = None
    if denominator > 0:
        rate = round((counts[AttendanceStatus.present] + counts[AttendanceStatus.late]) / denominator, 4)
    return AttendanceSummary(
        student_id=student_id,
        total=total,
        present=counts[AttendanceStatus.present],
        late=counts[AttendanceStatus.late],
        absent=counts[AttendanceStatus.absent],
        excused=counts[AttendanceStatus.excused],
        attendance_rate=rate,
    )


@router.post("/batch", response_model=list[AttendanceOut])
def save_attendance(
    data: AttendanceBatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.teacher)),
):
    """Điểm danh cả lớp một ngày. Gọi lại cho cùng ngày sẽ cập nhật (upsert)."""
    classroom = get_class_or_404(db, data.class_id)
    ensure_can_manage_class(user, classroom)

    enrolled = set(
        db.scalars(select(Enrollment.student_id).where(Enrollment.class_id == data.class_id))
    )
    unknown = {r.student_id for r in data.records} - enrolled
    if unknown:
        raise HTTPException(400, f"Học viên không thuộc lớp: {sorted(unknown)}")

    existing = {
        a.student_id: a
        for a in db.scalars(
            select(Attendance).where(
                Attendance.class_id == data.class_id, Attendance.date == data.date
            )
        )
    }
    saved: list[Attendance] = []
    for record in data.records:
        row = existing.get(record.student_id)
        if row is None:
            row = Attendance(class_id=data.class_id, student_id=record.student_id, date=data.date)
            db.add(row)
        row.status = record.status
        row.note = record.note
        row.recorded_by = user.id
        saved.append(row)
    db.commit()
    return saved


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    class_id: int | None = None,
    student_id: int | None = None,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = select(Attendance).order_by(Attendance.date.desc(), Attendance.id)
    query = scope_class_student_query(db, user, query, Attendance)
    if class_id is not None:
        query = query.where(Attendance.class_id == class_id)
    if student_id is not None:
        query = query.where(Attendance.student_id == student_id)
    if date_from:
        query = query.where(Attendance.date >= date_from)
    if date_to:
        query = query.where(Attendance.date <= date_to)
    return db.scalars(query).all()


@router.get("/summary/{student_id}", response_model=AttendanceSummary)
def attendance_summary(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    ensure_can_view_student(db, user, student_id)
    query = select(Attendance.status).where(Attendance.student_id == student_id)
    if user.role == Role.teacher:
        own =select(Classroom.id).where(Classroom.teacher_id == user.id)
        query = query.where(Attendance.class_id.in_(own))
    return compute_summary(student_id, list(db.scalars(query)))
