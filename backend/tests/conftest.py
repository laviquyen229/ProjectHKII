import os

# BẮT BUỘC đặt trước khi import app: test luôn chạy trên SQLite riêng,
# không bao giờ chạm vào PostgreSQL thật (create_all/drop_all sẽ xóa dữ liệu).
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["GEMINI_API_KEY"] = ""
os.environ["SEED_ON_START"] = "false"
os.environ["SECRET_KEY"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_if_empty  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def login(client: TestClient, username: str, password: str = "Hkii@12345") -> dict:
    r = client.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin(client):
    return login(client, "admin")


@pytest.fixture()
def teacher(client):
    return login(client, "gv.lan")


@pytest.fixture()
def student(client):
    return login(client, "hv01")


@pytest.fixture()
def parent(client):
    return login(client, "ph.an")


def user_id(client: TestClient, admin_headers: dict, username: str) -> int:
    users = client.get("/users", headers=admin_headers).json()
    return next(u["id"] for u in users if u["username"] == username)
