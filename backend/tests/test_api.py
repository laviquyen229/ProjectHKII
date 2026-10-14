import datetime as dt

from tests.conftest import user_id


# ---------- Auth ----------
def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_login_wrong_password_is_generic(client):
    r = client.post("/auth/login", json={"username": "admin", "password": "sai-mat-khau"})
    assert r.status_code == 401
    r2 = client.post("/auth/login", json={"username": "khong-ton-tai", "password": "x"})
    assert r2.status_code == 401
    assert r.json()["detail"] == r2.json()["detail"]  # không lộ tài khoản có tồn tại


def test_account_locks_after_repeated_failures(client):
    for _ in range(5):
        client.post("/auth/login", json={"username": "hv02", "password": "sai"})
    r = client.post("/auth/login", json={"username": "hv02", "password": "Hkii@12345"})
    assert r.status_code == 423


def test_requires_token(client):
    assert client.get("/classes").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer rac"}).status_code == 401


# ---------- Phân quyền ----------
def test_student_cannot_create_class_or_user(client, student):
    assert client.post("/classes", json={"code": "X", "name": "X"}, headers=student).status_code == 403
    body = {"username": "abcd", "full_name": "A", "password": "12345678", "role": "student"}
    assert client.post("/users", json=body, headers=student).status_code == 403


def test_parent_sees_only_own_child(client, parent, admin):
    students = client.get("/students", headers=parent).json()
    assert [s["username"] for s in students] == ["hv01"]
    other_id = user_id(client, admin, "hv02")
    assert client.get(f"/attendance/summary/{other_id}", headers=parent).status_code == 403
    own_id = user_id(client, admin, "hv01")
    assert client.get(f"/attendance/summary/{own_id}", headers=parent).status_code == 200


def test_teacher_cannot_manage_other_teachers_class(client, teacher, admin):
    classes = client.get("/classes", headers=admin).json()
    other = next(c for c in classes if c["code"] == "GIAOTIEP-1")  # của gv.minh
    r = client.post(
        "/attendance/batch",
        json={"class_id": other["id"], "date": "2026-01-05", "records": [{"student_id": 1, "status": "present"}]},
        headers=teacher,
    )
    assert r.status_code == 403


def test_teacher_cannot_see_tuition(client, teacher):
    assert client.get("/tuition", headers=teacher).status_code == 403


# ---------- Điểm danh / điểm ----------
def test_attendance_batch_is_upsert(client, teacher, admin):
    cls = next(c for c in client.get("/classes", headers=teacher).json() if c["code"] == "IELTS-A1")
    students = client.get(f"/classes/{cls['id']}/students", headers=teacher).json()
    day = "2030-03-01"
    first = [{"student_id": s["id"], "status": "present"} for s in students]
    r1 = client.post("/attendance/batch", json={"class_id": cls["id"], "date": day, "records": first}, headers=teacher)
    assert r1.status_code == 200
    second = [{"student_id": students[0]["id"], "status": "absent", "note": "ốm"}]
    r2 = client.post("/attendance/batch", json={"class_id": cls["id"], "date": day, "records": second}, headers=teacher)
    assert r2.status_code == 200
    rows = client.get(f"/attendance?class_id={cls['id']}&date_from={day}&date_to={day}", headers=teacher).json()
    assert len(rows) == len(students)  # không tạo trùng
    assert next(x for x in rows if x["student_id"] == students[0]["id"])["status"] == "absent"


def test_attendance_rejects_student_not_in_class(client, teacher, admin):
    cls = next(c for c in client.get("/classes", headers=teacher).json() if c["code"] == "IELTS-A1")
    outsider = user_id(client, admin, "hv08")  # hv08 không thuộc IELTS-A1
    r = client.post(
        "/attendance/batch",
        json={"class_id": cls["id"], "date": "2030-03-02", "records": [{"student_id": outsider, "status": "present"}]},
        headers=teacher,
    )
    assert r.status_code == 400


def test_score_validation_and_summary(client, teacher, admin):
    cls = next(c for c in client.get("/classes", headers=teacher).json() if c["code"] == "IELTS-A1")
    sid = user_id(client, admin, "hv01")
    base = {"class_id": cls["id"], "student_id": sid, "kind": "final"}
    assert client.post("/scores", json={**base, "value": 11, "max_value": 10}, headers=teacher).status_code == 400
    ok = client.post("/scores", json={**base, "value": 8, "max_value": 10}, headers=teacher)
    assert ok.status_code == 201
    summary = client.get(f"/scores/student/{sid}/summary", headers=teacher).json()
    assert any(row["class_id"] == cls["id"] and row["count"] >= 1 for row in summary)


# ---------- Học phí ----------
def test_tuition_overdue_and_pay(client, admin):
    past = (dt.date.today() - dt.timedelta(days=3)).isoformat()
    sid = user_id(client, admin, "hv01")
    created = client.post(
        "/tuition", json={"student_id": sid, "amount": 1000000, "due_date": past}, headers=admin
    )
    assert created.status_code == 201
    record_id = created.json()["id"]
    assert client.post("/tuition/mark-overdue", headers=admin).json()["updated"] >= 1
    rows = client.get("/tuition?status=overdue", headers=admin).json()
    assert any(r["id"] == record_id for r in rows)
    paid = client.post(f"/tuition/{record_id}/pay", headers=admin)
    assert paid.status_code == 200 and paid.json()["status"] == "paid"
    assert client.post(f"/tuition/{record_id}/pay", headers=admin).status_code == 409


# ---------- Báo cáo ----------
def test_class_report_and_excel(client, teacher):
    cls = next(c for c in client.get("/classes", headers=teacher).json() if c["code"] == "IELTS-A1")
    summary = client.get(f"/reports/class/{cls['id']}/summary", headers=teacher).json()
    assert summary["student_count"] == 4
    assert summary["average_score_10"] is not None
    xlsx = client.get(f"/reports/class/{cls['id']}/export.xlsx", headers=teacher)
    assert xlsx.status_code == 200
    assert xlsx.content[:2] == b"PK"  # file xlsx là zip


# ---------- AI Coach ----------
def test_coach_uses_rule_based_fallback(client, student):
    text = "I like learning English because it helps me talk with many people. " * 3
    r = client.post("/coach/feedback", json={"kind": "writing", "text": text}, headers=student)
    assert r.status_code == 201
    assert r.json()["provider"] == "rules"
    hist = client.get("/coach/history", headers=student).json()
    assert len(hist) == 1


def test_parent_cannot_use_coach(client, parent):
    r = client.post("/coach/feedback", json={"kind": "writing", "text": "x" * 40}, headers=parent)
    assert r.status_code == 403
