# HKII – FastAPI + PostgreSQL + Docker

Đồ án cuối kỳ: viết lại backend của hệ thống quản lý trung tâm (trước đây chạy trên Firebase Realtime
Database + Cloud Functions) bằng **FastAPI**, **PostgreSQL** và **Docker**. Phần AI và báo cáo viết bằng Python.

> Toàn bộ dữ liệu trong repo là **dữ liệu giả**. Không có khóa, credential hay dữ liệu thật của hệ thống cũ.

## 5 module

| # | Module | Endpoint chính |
|---|---|---|
| 1 | Đăng nhập và phân quyền (JWT, 4 vai trò) | `/auth/login`, `/auth/me`, `/users`, `/students` |
| 2 | Lớp học và học viên | `/classes`, `/classes/{id}/students` |
| 3 | Điểm danh và điểm số (+ báo cáo) | `/attendance/batch`, `/attendance/summary/{id}`, `/scores`, `/reports/class/{id}/summary`, `/reports/class/{id}/export.xlsx` |
| 4 | Học phí | `/tuition`, `/tuition/{id}/pay`, `/tuition/mark-overdue`, `/tuition/summary` |
| 5 | AI Coach | `/coach/feedback`, `/coach/history` |

Vai trò: `admin`, `teacher`, `student`, `parent`. Quyền được kiểm tra ở `backend/app/deps.py`
(thay cho `database.rules.json` của Firebase).

## Chạy bằng Docker

```bash
cp .env.example .env        # chỉnh mật khẩu DB và SECRET_KEY
docker compose up --build
```

- API: http://localhost:8000 · Tài liệu tương tác (Swagger): http://localhost:8000/docs
- PostgreSQL: `localhost:5433` (đổi bằng `DB_PORT`)
- Lần chạy đầu tự tạo bảng (Alembic) và dữ liệu mẫu (`SEED_ON_START=true`).

Tài khoản mẫu (mật khẩu `SEED_PASSWORD`, mặc định `Hkii@12345`; **đổi trước khi dùng thật**):

| Vai trò | Username |
|---|---|
| admin | `admin` |
| teacher | `gv.lan`, `gv.minh` |
| student | `hv01` … `hv08` |
| parent | `ph.an` (con: hv01), `ph.ha` (con: hv02) |

## Chạy test

Test dùng SQLite riêng, không đụng PostgreSQL:

```bash
docker compose run --rm --no-deps api python -m pytest -q
```

## AI Coach

Không cần key vẫn chạy (bộ nhận xét theo luật, `provider = "rules"`). Muốn dùng Gemini thật,
đặt `GEMINI_API_KEY` trong `.env`; nếu gọi lỗi, hệ thống tự rơi về bộ nhận xét theo luật.

## Cấu trúc

```
docker-compose.yml
backend/
  Dockerfile  requirements.txt  alembic.ini
  alembic/            # migration
  app/
    main.py config.py db.py models.py schemas.py security.py deps.py seed.py
    routers/          # auth users classes attendance scores tuition reports coach
    services/         # report.py (pandas), coach.py (AI)
  tests/
```

## Hướng dẫn tiếp theo

- Nối giao diện React: đổi lớp dữ liệu từ Firebase SDK sang gọi các endpoint ở trên (`Authorization: Bearer <token>`).
- Mở rộng module: chat, thông báo, game, Bonus nếu đề bài yêu cầu.
