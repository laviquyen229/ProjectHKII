"""Báo cáo bằng pandas: tổng hợp lớp học và xuất Excel."""
import io
from decimal import Decimal

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Attendance,
    AttendanceStatus,
    Classroom,
    Enrollment,
    Score,
    TuitionRecord,
    User,
)


def class_summary_frame(db: Session, classroom: Classroom) -> pd.DataFrame:
    """Mỗi dòng một học viên: chuyên cần + điểm trung bình (thang 10)."""
    students = db.execute(
        select(User.id, User.full_name)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.class_id == classroom.id)
        .order_by(User.full_name)
    ).all()
    columns = [
        "student_id", "full_name", "sessions", "present", "late", "absent", "excused",
        "attendance_rate", "score_count", "average_10",
    ]
    if not students:
        return pd.DataFrame(columns=columns)

    att = pd.DataFrame(
        db.execute(
            select(Attendance.student_id, Attendance.status).where(Attendance.class_id == classroom.id)
        ).all(),
        columns=["student_id", "status"],
    )
    sc = pd.DataFrame(
        db.execute(
            select(Score.student_id, Score.value, Score.max_value).where(Score.class_id == classroom.id)
        ).all(),
        columns=["student_id", "value", "max_value"],
    )

    rows = []
    for student_id, full_name in students:
        mine = att[att.student_id == student_id]["status"] if not att.empty else []
        counts = {s: int((mine == s).sum()) if len(mine) else 0 for s in AttendanceStatus}
        total = len(mine)
        denominator = total - counts[AttendanceStatus.excused]
        rate = (
            round((counts[AttendanceStatus.present] + counts[AttendanceStatus.late]) / denominator, 4)
            if denominator > 0
            else None
        )
        s_mine = sc[sc.student_id == student_id] if not sc.empty else sc
        if len(s_mine):
            scaled = s_mine["value"].astype(float) / s_mine["max_value"].astype(float) * 10
            avg, n = round(float(scaled.mean()), 2), int(len(s_mine))
        else:
            avg, n = None, 0
        rows.append(
            {
                "student_id": student_id,
                "full_name": full_name,
                "sessions": total,
                "present": counts[AttendanceStatus.present],
                "late": counts[AttendanceStatus.late],
                "absent": counts[AttendanceStatus.absent],
                "excused": counts[AttendanceStatus.excused],
                "attendance_rate": rate,
                "score_count": n,
                "average_10": avg,
            }
        )
    return pd.DataFrame(rows, columns=columns)


def class_summary_payload(db: Session, classroom: Classroom) -> dict:
    frame = class_summary_frame(db, classroom)
    rates = frame["attendance_rate"].dropna()
    avgs = frame["average_10"].dropna()
    clean = frame.astype(object).where(frame.notna(), None)
    return {
        "class_id": classroom.id,
        "class_code": classroom.code,
        "class_name": classroom.name,
        "student_count": int(len(frame)),
        "average_attendance_rate": round(float(rates.mean()), 4) if len(rates) else None,
        "average_score_10": round(float(avgs.mean()), 2) if len(avgs) else None,
        "students": clean.to_dict(orient="records"),
    }


def class_summary_xlsx(db: Session, classroom: Classroom) -> bytes:
    frame = class_summary_frame(db, classroom).rename(
        columns={
            "student_id": "Mã HV",
            "full_name": "Họ tên",
            "sessions": "Số buổi",
            "present": "Có mặt",
            "late": "Đi trễ",
            "absent": "Vắng",
            "excused": "Vắng có phép",
            "attendance_rate": "Tỷ lệ chuyên cần",
            "score_count": "Số đầu điểm",
            "average_10": "Điểm TB (thang 10)",
        }
    )
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, index=False, sheet_name=classroom.code[:31] or "Lop")
    return buffer.getvalue()


def tuition_xlsx(db: Session) -> bytes:
    rows = db.execute(
        select(
            TuitionRecord.id,
            User.full_name,
            TuitionRecord.amount,
            TuitionRecord.due_date,
            TuitionRecord.status,
            TuitionRecord.paid_at,
        )
        .join(User, User.id == TuitionRecord.student_id)
        .order_by(TuitionRecord.due_date)
    ).all()
    data = [
        {
            "Mã khoản": r.id,
            "Học viên": r.full_name,
            "Số tiền": float(r.amount) if isinstance(r.amount, Decimal) else r.amount,
            "Hạn đóng": r.due_date,
            "Trạng thái": r.status.value,
            "Ngày đóng": r.paid_at.replace(tzinfo=None) if r.paid_at else None,
        }
        for r in rows
    ]
    frame = pd.DataFrame(
        data, columns=["Mã khoản", "Học viên", "Số tiền", "Hạn đóng", "Trạng thái", "Ngày đóng"]
    )
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, index=False, sheet_name="HocPhi")
    return buffer.getvalue()
