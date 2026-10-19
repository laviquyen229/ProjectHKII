#!/usr/bin/env python3
"""Tạo GitHub Issues cho các việc còn lại (xem docs/PHAN-CONG.md).

Yêu cầu: GitHub CLI (`gh`) đã đăng nhập bằng tài khoản có quyền GHI vào repo.

    python scripts/create_issues.py --dry-run     # chỉ in ra, không tạo gì
    python scripts/create_issues.py               # tạo thật

Tùy chọn gán người phụ trách (tên GitHub, không có dấu @):
    set ASSIGNEE_A=ten-github-cua-A      (PowerShell: $env:ASSIGNEE_A="...")
    set ASSIGNEE_B=ten-github-cua-B

Chạy lại nhiều lần an toàn: Issue trùng tiêu đề sẽ được bỏ qua.
"""
import argparse
import json
import os
import subprocess
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

DEFAULT_REPO = "laviquyen229/ProjectHKII"

LABELS = {
    "thành viên A": ("1d4ed8", "Việc của thành viên A (học vụ và dữ liệu)"),
    "thành viên B": ("7c3aed", "Việc của thành viên B (tài chính, AI, vận hành)"),
    "cả nhóm": ("059669", "Việc cả hai cùng làm"),
    "frontend": ("0ea5e9", "Giao diện React"),
    "backend": ("f59e0b", "FastAPI, cơ sở dữ liệu"),
    "test": ("ef4444", "Kiểm thử"),
    "devops": ("64748b", "Docker, CI, cấu hình"),
    "tài liệu": ("94a3b8", "Tài liệu, thuyết trình"),
    "tùy chọn": ("cbd5e1", "Không bắt buộc"),
}

ISSUES = [
    # ---------------- Thành viên A ----------------
    {
        "title": "Màn đổi mật khẩu trên giao diện",
        "who": "A",
        "labels": ["thành viên A", "frontend"],
        "body": """## Mục tiêu
Người dùng đã đăng nhập đổi được mật khẩu của chính mình ngay trên giao diện.

## Đã có sẵn
- API `POST /auth/change-password` với body `{ "old_password": "...", "new_password": "..." }`, trả 204 khi thành công.
- Mật khẩu hiện tại sai trả 400; mật khẩu mới dưới 8 ký tự bị từ chối (422).

## Việc cần làm
- [ ] Tạo trang `frontend/src/pages/ChangePassword.jsx` (form: mật khẩu hiện tại, mật khẩu mới, nhập lại)
- [ ] Thêm route trong `frontend/src/App.jsx` và lối vào ở thanh trên (`components/Layout.jsx`)
- [ ] Kiểm tra khớp "nhập lại mật khẩu" ở phía giao diện
- [ ] Hiện thông báo thành công và lỗi bằng `Notice` / `ErrorBox` (`components/ui.jsx`)

## Tiêu chí hoàn thành
- Đổi mật khẩu thành công, đăng xuất rồi đăng nhập lại bằng mật khẩu mới được.
- Nhập sai mật khẩu hiện tại hiện thông báo lỗi rõ ràng.
""",
    },
    {
        "title": "Màn liên kết phụ huynh với học viên (admin)",
        "who": "A",
        "labels": ["thành viên A", "frontend"],
        "body": """## Mục tiêu
Admin liên kết một phụ huynh với con của họ ngay trên giao diện, thay vì phải gọi API.

## Đã có sẵn
- `POST /users/{parent_id}/children` với body `{ "student_id": ... }` (201; 409 nếu đã liên kết; 404 nếu sai vai trò)
- `GET /users/{parent_id}/children` liệt kê các con

## Việc cần làm
- [ ] Trong trang `Users.jsx`, với người dùng có vai trò phụ huynh, thêm nút mở khung quản lý các con
- [ ] Hiển thị danh sách con hiện có; chọn học viên từ danh sách để thêm
- [ ] Xử lý lỗi 409 (đã liên kết) bằng thông báo dễ hiểu

## Tiêu chí hoàn thành
- Sau khi liên kết, đăng nhập bằng tài khoản phụ huynh đó thấy đúng con trong các trang Chuyên cần, Điểm số, Học phí.
""",
    },
    {
        "title": "Chức năng sửa điểm trên giao diện",
        "who": "A",
        "labels": ["thành viên A", "frontend"],
        "body": """## Mục tiêu
Giáo viên sửa được điểm và ghi chú đã nhập. Nút xóa điểm đã có sẵn, hiện chưa có phần sửa.

## Đã có sẵn
- `PATCH /scores/{id}` với body `{ "value": ..., "note": "..." }` (điểm không được lớn hơn điểm tối đa, nếu vượt trả 400)
- Tab Điểm số trong `frontend/src/pages/ClassDetail.jsx` (`ScoresTab`)

## Việc cần làm
- [ ] Thêm nút Sửa trên từng dòng điểm, mở ô nhập (sửa tại chỗ hoặc hộp thoại)
- [ ] Gọi `PATCH` và tải lại danh sách khi lưu
- [ ] Hiện lỗi khi điểm vượt tối đa

## Tiêu chí hoàn thành
- Sửa điểm xong, tab Báo cáo hiển thị điểm trung bình mới.
""",
    },
    {
        "title": "Thêm test cho ghi danh vào lớp và quản lý người dùng",
        "who": "A",
        "labels": ["thành viên A", "backend", "test"],
        "body": """## Mục tiêu
Tăng độ phủ test cho các API chưa có test riêng.

## Gợi ý các tình huống (thêm vào `backend/tests/test_api.py`)
- [ ] Ghi danh học viên vào lớp: thành công (201), trùng (409), không phải học viên (404)
- [ ] Xóa học viên khỏi lớp: thành công (204), không có trong lớp (404)
- [ ] Tạo người dùng: thành công (201), trùng tên đăng nhập (409), mật khẩu dưới 8 ký tự (422)
- [ ] Admin không thể tự khóa hoặc hạ quyền chính mình (400)
- [ ] Học viên gọi `/users` bị chặn (403)

## Chạy test
```bash
docker compose run --rm --no-deps api python -m pytest -q
```

## Tiêu chí hoàn thành
- Toàn bộ test đạt, số test tăng so với 15 hiện tại.
""",
    },
    {
        "title": "Viết sơ đồ ER và ma trận phân quyền bằng lời của nhóm",
        "who": "A",
        "labels": ["thành viên A", "tài liệu"],
        "body": """## Mục tiêu
Có tài liệu thiết kế CSDL và phân quyền do chính nhóm viết, để giải thích được khi bảo vệ.

## Việc cần làm
- [ ] Tạo `docs/THIET-KE-CSDL.md`: mô tả 8 bảng, khóa chính, khóa ngoại, ràng buộc duy nhất và lý do (đọc `backend/app/models.py`)
- [ ] Vẽ sơ đồ ER (có thể dùng Mermaid như trong `docs/HUONG-DAN-CHAY.md`) rồi chỉnh theo hiểu biết của nhóm
- [ ] Viết ma trận phân quyền theo 4 vai trò và chỉ ra nơi kiểm tra trong `backend/app/deps.py`

## Tiêu chí hoàn thành
- Thành viên A giải thích được từng bảng và từng quy tắc phân quyền mà không cần nhìn tài liệu.
""",
    },
    # ---------------- Thành viên B ----------------
    {
        "title": "Test giới hạn 20 lượt AI Coach mỗi ngày",
        "who": "B",
        "labels": ["thành viên B", "backend", "test"],
        "body": """## Mục tiêu
Kiểm chứng giới hạn lượt dùng AI Coach hoạt động đúng.

## Bối cảnh
`backend/app/routers/coach.py` đếm số lượt của người dùng trong ngày và trả 429 khi vượt `settings.coach_daily_limit` (mặc định 20).

## Việc cần làm
- [ ] Viết test dùng `monkeypatch` đặt `settings.coach_daily_limit` thấp (ví dụ 2)
- [ ] Gọi `/coach/feedback` đủ số lượt rồi kiểm tra lượt tiếp theo trả 429
- [ ] Kiểm tra người dùng khác vẫn dùng được (giới hạn tính riêng từng người)

## Tiêu chí hoàn thành
- Test đạt khi chạy cùng bộ test hiện có.
""",
    },
    {
        "title": "GitHub Actions: tự chạy pytest và build giao diện",
        "who": "B",
        "labels": ["thành viên B", "devops"],
        "body": """## Mục tiêu
Mỗi lần push hoặc mở pull request, hệ thống tự chạy test backend và build frontend.

## Việc cần làm
- [ ] Tạo `.github/workflows/ci.yml`
- [ ] Job backend: Python 3.12, `pip install -r backend/requirements.txt`, chạy `python -m pytest -q` trong thư mục `backend`
- [ ] Job frontend: Node 22, `npm ci` và `npm run build` trong thư mục `frontend`
- [ ] Thêm huy hiệu trạng thái vào `README.md`

## Tiêu chí hoàn thành
- Pull request hiện dấu xanh khi test và build đều qua.
""",
    },
    {
        "title": "Chạy test trên PostgreSQL thật",
        "who": "B",
        "labels": ["thành viên B", "backend", "test", "devops"],
        "body": """## Mục tiêu
Hiện `backend/tests/conftest.py` ép test chạy trên SQLite. Cần có cách chạy cùng bộ test trên PostgreSQL để chắc chắn hành vi giống môi trường thật.

## Lưu ý quan trọng
Test dùng `drop_all` và `create_all`, nên **phải dùng một CSDL riêng** (ví dụ `hkii_test`), tuyệt đối không trỏ vào CSDL `hkii` đang chạy.

## Việc cần làm
- [ ] Cho phép chọn CSDL test qua biến môi trường (ví dụ `TEST_DATABASE_URL`), mặc định vẫn là SQLite
- [ ] Thêm service PostgreSQL vào workflow CI hoặc một profile trong `docker-compose.yml`
- [ ] Ghi cách chạy vào `docs/HUONG-DAN-CHAY.md`

## Tiêu chí hoàn thành
- 15 test hiện có đạt trên cả SQLite và PostgreSQL.
""",
    },
    {
        "title": "Rà soát cấu hình bảo mật trước khi nộp",
        "who": "B",
        "labels": ["thành viên B", "devops"],
        "body": """## Mục tiêu
Bảo đảm không có khóa hay mật khẩu yếu bị đưa lên repo công khai.

## Việc cần làm
- [ ] Xác nhận `.env` không có trong lịch sử git: `git log --all --stat -- .env`
- [ ] `SECRET_KEY` mặc định trong `docker-compose.yml` là giá trị demo: ghi rõ trong tài liệu cần đổi, hoặc thêm cảnh báo khi khởi động nếu còn dùng giá trị mặc định
- [ ] Mật khẩu mẫu `Hkii@12345` chỉ để demo: nhắc đổi `SEED_PASSWORD` trong README
- [ ] Quét repo tìm chuỗi nghi là khóa: `git grep -nE "AIza|gho_|BEGIN (RSA|PRIVATE)"`
- [ ] Cân nhắc chuyển repo sang private nếu không cần công khai

## Tiêu chí hoàn thành
- Danh sách rà soát được tick đủ và ghi kết quả vào mô tả pull request.
""",
    },
    {
        "title": "(Tùy chọn) Bật Gemini thật cho AI Coach và thử một lượt",
        "who": "B",
        "labels": ["thành viên B", "backend", "tùy chọn"],
        "body": """## Mục tiêu
Kiểm tra đường gọi Gemini hoạt động thật (hiện mới chạy bằng bộ nhận xét theo luật).

## Việc cần làm
- [ ] Lấy khóa API Gemini của cá nhân, điền vào `.env` (`GEMINI_API_KEY=...`). **Không commit `.env`.**
- [ ] Kiểm tra tên model trong `GEMINI_MODEL` còn khả dụng, đổi nếu cần
- [ ] `docker compose up -d --build`, vào AI Coach gửi một bài và xem nhãn nhà cung cấp là Gemini
- [ ] Thử tắt mạng hoặc dùng khóa sai để xác nhận hệ thống tự rơi về bộ nhận xét theo luật

## Tiêu chí hoàn thành
- Chụp được màn hình nhận xét từ Gemini (không lộ khóa) để dùng khi thuyết trình.
""",
    },
    # ---------------- Cả nhóm ----------------
    {
        "title": "Đọc chéo: mỗi người giảng lại phần của mình cho người kia",
        "who": "BOTH",
        "labels": ["cả nhóm", "tài liệu"],
        "body": """## Mục tiêu
Cả hai cùng giải thích được toàn bộ hệ thống khi bảo vệ.

## Việc cần làm
- [ ] Thành viên A giảng 20–30 phút: module 1, 2, 3, CSDL, phân quyền
- [ ] Thành viên B giảng 20–30 phút: module 4, 5, Docker, nginx, CI
- [ ] Đổi vai, người nghe đặt câu hỏi "vì sao viết như vậy?"
- [ ] Ghi lại các câu hỏi chưa trả lời được và tìm hiểu thêm

## Tiêu chí hoàn thành
- Mỗi người trả lời được mọi câu trong `docs/HUONG-DAN-CHAY.md` (mục 4) không cần nhìn tài liệu.
""",
    },
    {
        "title": "Chạy thử từ đầu trên máy sạch",
        "who": "BOTH",
        "labels": ["cả nhóm", "devops"],
        "body": """## Mục tiêu
Chắc chắn người khác (giảng viên) clone repo về là chạy được.

## Việc cần làm
- [ ] Clone repo vào thư mục mới hoặc máy khác: `git clone https://github.com/laviquyen229/ProjectHKII.git`
- [ ] Làm đúng theo `docs/HUONG-DAN-CHAY.md`: `cp .env.example .env`, `docker compose up --build`
- [ ] Đăng nhập thử đủ 4 vai trò bằng tài khoản mẫu
- [ ] Ghi lại mọi chỗ vướng và sửa tài liệu cho khớp

## Tiêu chí hoàn thành
- Chạy được chỉ bằng các bước trong tài liệu, không cần thao tác thêm.
""",
    },
    {
        "title": "Tập demo theo kịch bản 5 phút",
        "who": "BOTH",
        "labels": ["cả nhóm", "tài liệu"],
        "body": """## Mục tiêu
Buổi demo trôi chảy, đúng thời gian, có phương án dự phòng.

## Việc cần làm
- [ ] Tập theo `docs/HUONG-DAN-CHAY.md` (mục 3), bấm giờ
- [ ] Phân chia ai nói slide nào (xem `docs/PHAN-CONG.md`, mục 5)
- [ ] Chạy `docker compose up -d` trước giờ trình bày ít nhất 1 phút
- [ ] Chuẩn bị phương án dự phòng: ảnh chụp màn hình trong slide, trang Swagger
- [ ] Nếu cần dữ liệu sạch: `docker compose down -v` rồi `up` lại

## Tiêu chí hoàn thành
- Tập đủ ít nhất 2 lần liền không vấp, dưới thời gian cho phép.
""",
    },
    {
        "title": "Ôn câu hỏi bảo vệ",
        "who": "BOTH",
        "labels": ["cả nhóm", "tài liệu"],
        "body": """## Mục tiêu
Trả lời tự tin các câu hỏi giảng viên thường đặt.

## Việc cần làm
- [ ] Đọc mục 4 của `docs/HUONG-DAN-CHAY.md` rồi tự trả lời bằng lời của mình
- [ ] Bổ sung thêm 5 câu hỏi nhóm nghĩ giảng viên sẽ hỏi (ví dụ: vì sao JWT, vì sao SQLAlchemy, xử lý đồng thời ra sao)
- [ ] Chuẩn bị câu trả lời trung thực cho phần hạn chế (JWT lưu `localStorage`, chưa có refresh token, test trên SQLite)

## Tiêu chí hoàn thành
- Mỗi người tự trả lời trọn bộ câu hỏi mà không nhìn tài liệu.
""",
    },
    {
        "title": "Kiểm tra quy định khai báo công cụ AI của trường",
        "who": "BOTH",
        "labels": ["cả nhóm", "tài liệu"],
        "body": """## Mục tiêu
Tuân thủ quy định học thuật về việc dùng công cụ AI trong đồ án.

## Việc cần làm
- [ ] Đọc quy định hoặc hỏi giảng viên về việc dùng AI hỗ trợ viết code, tài liệu, slide
- [ ] Nếu có yêu cầu khai báo, ghi rõ phần nào dùng AI hỗ trợ trong báo cáo
- [ ] Mỗi thành viên đọc và hiểu phần code của mình để giải thích được khi được hỏi

## Tiêu chí hoàn thành
- Có kết luận rõ ràng về yêu cầu của trường và đã ghi vào báo cáo nếu cần.
""",
    },
]


def gh(*args, input_text=None, check=True):
    result = subprocess.run(
        ["gh", *args],
        input=input_text.encode("utf-8") if input_text is not None else None,
        capture_output=True,
        check=False,
    )
    out = result.stdout.decode("utf-8", errors="replace").strip()
    err = result.stderr.decode("utf-8", errors="replace").strip()
    if check and result.returncode != 0:
        raise SystemExit(f"Lệnh gh {' '.join(args[:3])} lỗi: {err or out}")
    return result.returncode, out, err


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=DEFAULT_REPO, help=f"owner/repo (mặc định {DEFAULT_REPO})")
    parser.add_argument("--dry-run", action="store_true", help="chỉ in ra, không tạo gì")
    args = parser.parse_args()

    assignees = {"A": os.environ.get("ASSIGNEE_A", "").strip(), "B": os.environ.get("ASSIGNEE_B", "").strip()}

    if args.dry_run:
        print(f"[chạy thử] repo: {args.repo}, {len(ISSUES)} Issue, {len(LABELS)} nhãn\n")
        for i, it in enumerate(ISSUES, 1):
            who = it["who"]
            print(f"{i:>2}. [{who}] {it['title']}  ({', '.join(it['labels'])})")
        return

    # Kiểm tra danh tính và quyền trước khi tạo
    _, login, _ = gh("api", "user", "--jq", ".login")
    owner = args.repo.split("/")[0]
    _, perm, _ = gh("repo", "view", args.repo, "--json", "viewerPermission", "--jq", ".viewerPermission")
    print(f"Đang đăng nhập GitHub: {login}; quyền trên {args.repo}: {perm}")
    if perm not in ("ADMIN", "MAINTAIN", "WRITE"):
        raise SystemExit(
            f"\nTài khoản '{login}' chỉ có quyền '{perm}' trên {args.repo}, nên không gắn được nhãn/người phụ trách.\n"
            f"Chuyển sang tài khoản '{owner}' rồi chạy lại:\n"
            f"    gh auth login            (đăng nhập '{owner}' nếu chưa có)\n"
            f"    gh auth switch --user {owner}\n"
        )

    # Tạo nhãn (ghi đè nếu đã có)
    for name, (color, desc) in LABELS.items():
        gh("label", "create", name, "--repo", args.repo, "--color", color, "--description", desc, "--force")
    print(f"Đã chuẩn bị {len(LABELS)} nhãn.")

    # Bỏ qua Issue đã tồn tại (theo tiêu đề)
    _, raw, _ = gh("issue", "list", "--repo", args.repo, "--state", "all", "--limit", "300", "--json", "title")
    existing = {x["title"] for x in json.loads(raw or "[]")}

    created = skipped = 0
    for it in ISSUES:
        if it["title"] in existing:
            print(f"  bỏ qua (đã có): {it['title']}")
            skipped += 1
            continue
        cmd = ["issue", "create", "--repo", args.repo, "--title", it["title"], "--body-file", "-"]
        for label in it["labels"]:
            cmd += ["--label", label]
        who = it["who"]
        targets = ["A", "B"] if who == "BOTH" else [who]
        for t in targets:
            if assignees[t]:
                cmd += ["--assignee", assignees[t]]
        _, url, _ = gh(*cmd, input_text=it["body"])
        print(f"  đã tạo: {url}  <-  {it['title']}")
        created += 1

    print(f"\nXong: tạo {created}, bỏ qua {skipped}.")


if __name__ == "__main__":
    main()
