from fastapi.testclient import TestClient
from sqlalchemy import func, select


def test_curriculum_notes_status_and_reseed(client, database):
    main, sessions = database
    from backend.database.models import KnowledgePoint, Note

    assert client.get("/api/health").json() == {"status": "ok"}
    volumes = client.get("/api/curriculum").json()
    assert len(volumes) == 5
    assert sum(len(volume["chapters"]) for volume in volumes) == 18
    assert client.get("/api/chapters/bx1-c01").status_code == 200
    assert client.get("/api/knowledge/search", params={"q": "集合"}).json()
    assert client.get("/api/knowledge/search", params={"q": "%"}).json() == []
    assert client.get("/api/knowledge/missing").status_code == 404
    assert client.put("/api/knowledge/ks-bx1-001/status", json={"status": "invalid"}).status_code == 422
    content = r"集合笔记 $a\in A$"
    assert client.put("/api/knowledge/ks-bx1-001/note", json={"content": content}).status_code == 200
    assert client.put("/api/knowledge/ks-bx1-001/status", json={"status": "learning"}).json()["status"] == "learning"
    assert client.get("/api/knowledge/ks-bx1-001/note").json()["content"] == content

    main.initialize_database()
    main.initialize_database()
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(KnowledgePoint)) == 5
        assert session.get(Note, "ks-bx1-001").content == content
    with TestClient(main.app) as restarted:
        saved = restarted.get("/api/knowledge/ks-bx1-001").json()
        assert saved["note"] == content
        assert saved["status"] == "learning"
