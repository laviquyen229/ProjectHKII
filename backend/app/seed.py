"""Dữ liệu mẫu để demo. Toàn bộ là dữ liệu GIẢ, không lấy từ hệ thống thật.

Chạy tay: python -m app.seed
"""
import datetime as dt
import random
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import (
    Attendance,
    AttendanceStatus,
    Classroom,
    Enrollment,
    ParentStudent,
    Role,
    Score,
    TuitionRecord,
    TuitionStatus,
    User,
)
from app.security import hash_password


def seed_if_empty(db: Session) -> bool:
    if db.scalar(select(User.id).limit(1)) is not None:
        return False

    rng = random.Random(2026)
    pw = hash_password(settings.seed_password)

    def make(username: str, full_name: str, role: Role) -> User:
        user = User(username=username, full_name=full_name, password_hash=pw, role=role)
        db.add(user)
        return user

    make("admin", "Quản trị viên", Role.admin)
    teachers = [make("gv.lan", "Nguyễn Thị Lan", Role.teacher), make("gv.minh", "Trần Văn Minh", Role.teacher)]
    student_names = [
        "Lê Hoàng An", "Phạm Thu Hà", "Võ Minh Khôi", "Đặng Ngọc Mai",
        "Bùi Gia Bảo", "Hoàng Khánh Linh", "Ngô Quang Huy", "Đỗ Phương Thảo",
    ]
    students = [make(f"hv{i + 1:02d}", name, Role.student) for i, name in enumerate(student_names)]
    parents = [make("ph.an", "Lê Văn Hùng", Role.parent), make("ph.ha", "Phạm Thị Hoa", Role.parent)]
    db.flush()

    db.add_all(
        [
            ParentStudent(parent_id=parents[0].id, student_id=students[0].id),
            ParentStudent(parent_id=parents[1].id, student_id=students[1].id),
        ]
    )

    classes = [
        Classroom(code="IELTS-A1", name="IELTS Foundation A1", schedule="T2-T4 18:00", teacher_id=teachers[0].id),
        Classroom(code="IELTS-B2", name="IELTS Intermediate B2", schedule="T3-T5 19:30", teacher_id=teachers[0].id),
        Classroom(code="GIAOTIEP-1", name="Giao tiếp cơ bản", schedule="T7 09:00", teacher_id=teachers[1].id),
    ]
    db.add_all(classes)
    db.flush()

    membership = {
        classes[0].id: students[0:4],
        classes[1].id: students[3:6],
        classes[2].id: students[5:8] + students[0:1],
    }
    for class_id, members in membership.items():
        for s in members:
            db.add(Enrollment(class_id=class_id, student_id=s.id))

    today = dt.date.today()
    statuses = [AttendanceStatus.present] * 7 + [AttendanceStatus.late, AttendanceStatus.absent, AttendanceStatus.excused]
    for class_id, members in membership.items():
        for offset in range(1, 11):
            day = today - dt.timedelta(days=offset * 2)
            for s in members:
                db.add(
                    Attendance(
                        class_id=class_id,
                        student_id=s.id,
                        date=day,
                        status=rng.choice(statuses),
                        recorded_by=teachers[0].id,
                    )
                )
        for s in members:
            for kind in ("quiz-1", "quiz-2", "midterm"):
                db.add(
                    Score(
                        class_id=class_id,
                        student_id=s.id,
                        kind=kind,
                        value=Decimal(str(round(rng.uniform(5.0, 9.8), 1))),
                        max_value=Decimal("10"),
                        recorded_by=teachers[0].id,
                    )
                )

    for i, s in enumerate(students):
        due = today + dt.timedelta(days=rng.choice([-20, -5, 10, 25]))
        paid = i % 3 == 0
        db.add(
            TuitionRecord(
                student_id=s.id,
                class_id=classes[i % 3].id,
                amount=Decimal(rng.choice([1_500_000, 2_200_000, 3_000_000])),
                due_date=due,
                status=TuitionStatus.paid if paid else TuitionStatus.unpaid,
                paid_at=dt.datetime.now(dt.timezone.utc) if paid else None,
                note="Học phí tháng",
            )
        )

    db.commit()
    return True


if __name__ == "__main__":
    with SessionLocal() as session:
        print("Đã tạo dữ liệu mẫu." if seed_if_empty(session) else "DB đã có dữ liệu, bỏ qua.")
