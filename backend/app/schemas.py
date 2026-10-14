import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import AttendanceStatus, Role, TuitionStatus


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth / User ----------
class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORM):
    id: int
    username: str
    full_name: str
    role: Role
    is_active: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: Role


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    role: Role | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class ChildLinkIn(BaseModel):
    student_id: int


# ---------- Class ----------
class ClassCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    schedule: str | None = Field(default=None, max_length=200)
    teacher_id: int | None = None


class ClassUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    schedule: str | None = Field(default=None, max_length=200)
    teacher_id: int | None = None


class ClassOut(ORM):
    id: int
    code: str
    name: str
    schedule: str | None
    teacher_id: int | None


class EnrollIn(BaseModel):
    student_id: int


# ---------- Attendance ----------
class AttendanceRecordIn(BaseModel):
    student_id: int
    status: AttendanceStatus
    note: str | None = Field(default=None, max_length=300)


class AttendanceBatchIn(BaseModel):
    class_id: int
    date: dt.date
    records: list[AttendanceRecordIn] = Field(min_length=1)


class AttendanceOut(ORM):
    id: int
    class_id: int
    student_id: int
    date: dt.date
    status: AttendanceStatus
    note: str | None


class AttendanceSummary(BaseModel):
    student_id: int
    total: int
    present: int
    late: int
    absent: int
    excused: int
    attendance_rate: float | None  # (present+late)/(total-excused), None nếu chưa có buổi nào


# ---------- Score ----------
class ScoreCreate(BaseModel):
    class_id: int
    student_id: int
    kind: str = Field(min_length=1, max_length=40)
    value: float = Field(ge=0)
    max_value: float = Field(default=10, gt=0)
    note: str | None = Field(default=None, max_length=300)


class ScoreUpdate(BaseModel):
    value: float | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=300)


class ScoreOut(ORM):
    id: int
    class_id: int
    student_id: int
    kind: str
    value: float
    max_value: float
    note: str | None


class ScoreClassSummary(BaseModel):
    class_id: int
    count: int
    average_10: float  # quy về thang 10


# ---------- Tuition ----------
class TuitionCreate(BaseModel):
    student_id: int
    class_id: int | None = None
    amount: float = Field(gt=0)
    due_date: dt.date
    note: str | None = Field(default=None, max_length=300)


class TuitionOut(ORM):
    id: int
    student_id: int
    class_id: int | None
    amount: float
    due_date: dt.date
    status: TuitionStatus
    paid_at: dt.datetime | None
    note: str | None


class TuitionSummary(BaseModel):
    unpaid: float
    paid: float
    overdue: float
    count_by_status: dict[str, int]


# ---------- Coach ----------
class CoachIn(BaseModel):
    kind: Literal["writing", "speaking"]
    text: str = Field(min_length=20, max_length=4000)


class CoachOut(ORM):
    id: int
    kind: str
    feedback: str
    provider: str
    created_at: dt.datetime
