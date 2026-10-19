# Phân công công việc nhóm (2 thành viên)

> Bản nháp để hai bạn cùng chỉnh. Điền tên vào bảng đầu tiên, đổi lại các mục nếu hai bạn mạnh yếu khác nhau.
> Nguyên tắc chính: **mỗi người làm trọn một nhóm module** (API, giao diện, test) và **cả hai đều phải giải thích được toàn bộ hệ thống** khi bảo vệ.

## 1. Thành viên

| | Họ tên | Mã sinh viên | GitHub |
|---|---|---|---|
| **A** (học vụ và dữ liệu) | | | |
| **B** (tài chính, AI và vận hành) | | | |

## 2. Phân công theo module

| | **A: học vụ và dữ liệu** | **B: tài chính, AI và vận hành** |
|---|---|---|
| Module | 1. Đăng nhập, phân quyền<br>2. Lớp học<br>3. Điểm danh, điểm số, báo cáo | 4. Học phí<br>5. AI Coach |
| Backend (`backend/app/routers/`) | `auth.py`, `users.py`, `classes.py`, `attendance.py`, `scores.py`, `reports.py` | `tuition.py`, `coach.py` (và `services/coach.py`) |
| Dịch vụ | `services/report.py` (pandas, Excel) | `services/coach.py` (Gemini, bộ nhận xét theo luật) |
| Giao diện (`frontend/src/pages/`) | `Login`, `Dashboard`, `Classes`, `ClassDetail`, `Attendance`, `Grades`, `Users` | `Tuition`, `Coach` |
| Hạ tầng | Thiết kế CSDL, `models.py`, Alembic | `docker-compose.yml`, `Dockerfile`, `nginx.conf`, `.env`, CI |
| Test (`backend/tests/`) | Đăng nhập, phân quyền, điểm danh, điểm số, báo cáo | Học phí, AI Coach |
| Tài liệu | Sơ đồ ER, ma trận phân quyền | Hướng dẫn chạy, kịch bản demo |

File dùng chung (`models.py`, `schemas.py`, `seed.py`, `components/ui.jsx`): ai sửa thì báo người kia trước, sửa nhỏ và commit riêng.

## 3. Việc còn lại

### Thành viên A
- [ ] Màn **đổi mật khẩu** trên giao diện (API `POST /auth/change-password` đã có)
- [ ] Màn **liên kết phụ huynh với học viên** cho admin (API `POST /users/{id}/children` đã có)
- [ ] Chức năng **sửa điểm** trên giao diện (API `PATCH /scores/{id}` đã có; nút xóa điểm đã có sẵn)
- [ ] Thêm test cho ghi danh vào lớp và quản lý người dùng
- [ ] Vẽ lại sơ đồ ER và ma trận phân quyền bằng lời của nhóm (không chép nguyên từ slide)

### Thành viên B
- [ ] Test giới hạn **20 lượt AI Coach mỗi ngày**
- [ ] **GitHub Actions** chạy `pytest` và `npm run build` mỗi lần push
- [ ] Chạy test trên **PostgreSQL thật** (hiện test chạy SQLite)
- [ ] Rà soát bảo mật cấu hình: `SECRET_KEY`, mật khẩu mẫu, `.env` không bị commit
- [ ] (Tùy chọn) Bật Gemini thật bằng `GEMINI_API_KEY` và thử một lượt

### Cả hai
- [ ] Mỗi người **giảng lại phần của mình** cho người kia (20–30 phút), rồi đổi vai
- [ ] Chạy thử từ đầu trên máy sạch: `git clone`, `docker compose up --build`, đăng nhập
- [ ] Tập demo theo `docs/HUONG-DAN-CHAY.md` (mục 3), có phương án dự phòng
- [ ] Đọc danh sách câu hỏi bảo vệ (mục 4 cùng file) và tự trả lời không nhìn tài liệu
- [ ] Kiểm tra quy định của trường về việc **khai báo công cụ AI**, ghi vào báo cáo nếu cần

## 4. Cách làm việc với Git

> **Issues:** mỗi ô trong mục 3 có một Issue tương ứng. Tạo bằng `python scripts/create_issues.py` (chạy thử trước: `--dry-run`). Cần đăng nhập `gh` bằng tài khoản **chủ repo** có quyền ghi.

- Mỗi người một nhánh: `feature/<tên-module>`. **Không commit thẳng vào `main`.**
- Gộp bằng pull request, **người kia duyệt** trước khi gộp. Commit nhỏ, nội dung rõ.
- **Alembic:** mỗi lúc chỉ một người tạo migration mới (hai người cùng tạo sẽ sinh hai "đầu" và lỗi khi chạy). Báo nhau trước.
- Chủ repo (`laviquyen229`) mời thành viên còn lại: **Settings, Collaborators**.
- Trước khi gộp nhớ chạy: `docker compose run --rm --no-deps api python -m pytest -q` và `npm run build` trong `frontend/`.

## 5. Chia phần thuyết trình

Bài thuyết trình có 17 slide (`docs/HKII-ThuyetTrinh.pptx`), mỗi slide có ghi chú lời nói.

| Người nói | Nội dung | Slide |
|---|---|---|
| **A** | Mở đầu, 5 module, kiến trúc, CSDL, phân quyền | 1–7 |
| **A** | Demo giáo viên điểm danh, báo cáo, phụ huynh theo dõi con | 8–10 |
| **B** | Demo học phí, AI Coach | 11–12 |
| **B** | API, Docker, kiểm thử, hạn chế, kết luận | 13–17 |

Cả hai cùng trả lời phần hỏi đáp, ai nắm rõ hơn thì trả lời trước, người kia bổ sung.

## 6. Thứ tự gợi ý

1. **Thiết lập:** mời cộng tác, mỗi người clone repo và chạy được `docker compose up` trên máy mình.
2. **Hoàn thiện:** mỗi người làm các việc còn lại ở mục 3 trên nhánh riêng, gộp qua pull request.
3. **Kiểm thử chéo:** đổi vai, mỗi người thử phần của người kia như người dùng và ghi lỗi tìm được.
4. **Luyện tập:** đọc chéo, tập demo, đo thời gian, chốt phương án dự phòng.

Thêm ngày hạn vào từng giai đoạn sau khi biết lịch của trường.
