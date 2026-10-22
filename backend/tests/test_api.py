import os
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient


def test_curriculum_notes_status_and_reseed():
    with TemporaryDirectory() as temporary:
        os.environ["MATHLAB_DATABASE_PATH"] = str(Path(temporary) / "test.sqlite3")
        from backend.main import app, initialize_database
        from backend.database.core import SessionLocal
        from backend.database.models import KnowledgePoint, Note
        from sqlalchemy import func, select

        with TestClient(app) as client:
            assert client.get("/api/health").json() == {"status": "ok"}
            volumes = client.get("/api/curriculum").json()
            assert len(volumes) == 5
            assert sum(len(volume["chapters"]) for volume in volumes) == 18
            assert client.get("/api/chapters/bx1-c01").status_code == 200
            assert client.get("/api/knowledge/search", params={"q": "集合"}).json()
            assert client.get("/api/knowledge/search", params={"q": "%"}).json() == []
            assert client.get("/api/knowledge/missing").status_code == 404
            assert client.put("/api/knowledge/ks-bx1-001/status", json={"status": "invalid"}).status_code == 422
            assert client.put("/api/knowledge/ks-bx1-001/note", json={"content": "集合笔记 $a\\in A$"}).status_code == 200
            assert client.put("/api/knowledge/ks-bx1-001/status", json={"status": "learning"}).json()["status"] == "learning"
            assert client.get("/api/knowledge/ks-bx1-001/note").json()["content"] == "集合笔记 $a\\in A$"

        initialize_database()
        initialize_database()
        with SessionLocal() as session:
            assert session.scalar(select(func.count()).select_from(KnowledgePoint)) == 5
            assert session.get(Note, "ks-bx1-001").content == "集合笔记 $a\\in A$"
        with TestClient(app) as client:
            saved = client.get("/api/knowledge/ks-bx1-001").json()
            assert saved["note"] == "集合笔记 $a\\in A$"
            assert saved["status"] == "learning"
