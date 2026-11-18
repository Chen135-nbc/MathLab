from datetime import datetime

from fastapi.testclient import TestClient


def test_additive_upgrade_preserves_legacy_note_and_saves_multilingual_profile(database):
    from backend.database.core import Base
    from backend.database.models import LearningProgress, Note, SchemaVersion
    from backend.services.curriculum import seed_curriculum

    main, sessions = database
    legacy_tables = {"volumes", "chapters", "sections", "knowledge_points", "notes", "learning_progress", "schema_versions"}
    Base.metadata.create_all(main.engine, tables=[table for table in Base.metadata.tables.values() if table.name in legacy_tables])
    point = "ks-bx1-001"
    with sessions() as session:
        seed_curriculum(session)
        session.add_all([Note(point_id=point, content="原有笔记"), LearningProgress(point_id=point, status="learned"), SchemaVersion(version=1)])
        session.commit()

    profile = {"category": "research", "language_entries": [
        {"language": "en", "kind": "term", "text": "set", "source": "English textbook, p. 10"},
        {"language": "de", "kind": "definition", "text": "Eine Menge …", "source": ""},
    ]}
    path = f"/api/knowledge/{point}"
    with TestClient(main.app) as client:
        result = client.get(path).json()
        assert result["note"] == "原有笔记"
        assert result["status"] == "learned"
        assert not result["note_profile"]["language_entries"]
        result = client.put(path + "/note", json={"content": result["note"], "profile": profile})
        assert result.status_code == 200
        assert datetime.fromisoformat(result.json()["note_updated_at"]).tzinfo is not None
        assert client.put(path + "/note", json={"content": "补充笔记"}).status_code == 200

    main.engine.dispose()
    with TestClient(main.app) as reopened:
        note = reopened.get(path + "/note").json()
        assert note["profile"] == profile
        assert note["content"] == "补充笔记"


def test_studio_model_save_rename_link_update_and_reopen(database):
    main, _ = database
    points = ["ks-bx1-001", "ks-bx1-003"]
    model = {
        "name": "正弦的振幅", "expression": "a*sin(x)+1", "description": "比较不同振幅",
        "parameters": [{"name": "a", "min": -5, "max": 5, "step": 0.1, "value": 2}],
        "view": {"x": 1, "y": -2, "scale": 75}, "point_ids": [],
    }
    with TestClient(main.app) as client:
        assert client.post("/api/models", json={**model, "point_ids": ["missing"]}).status_code == 422
        bad_params = [dict(model["parameters"][0], value=6)]
        assert client.post("/api/models", json={**model, "parameters": bad_params}).status_code == 422
        response = client.post("/api/models", json=model)
        assert response.status_code == 201, response.text
        created = response.json()
        path = "/api/models/" + created["id"]
        assert created["points"] == []
        assert client.get("/api/models/unknown").status_code == 404
        updated = client.put(path, json={**model, "name": "调整振幅", "point_ids": points}).json()
        assert updated["id"] == created["id"]
        assert updated["created_at"] == created["created_at"]
        assert datetime.fromisoformat(updated["updated_at"]) >= datetime.fromisoformat(created["updated_at"])
        assert [entry["id"] for entry in updated["points"]] == points
        for point in points:
            assert client.get("/api/models", params={"point_id": point}).json()[0]["id"] == created["id"]
        assert client.put(path, json={**model, "name": "调整振幅", "point_ids": points[1:]}).status_code == 200

    main.engine.dispose()
    with TestClient(main.app) as reopened:
        saved = reopened.get(path).json()
        assert saved["name"] == "调整振幅"
        for field in ("expression", "parameters", "view", "description"):
            assert saved[field] == model[field]
        assert [entry["id"] for entry in saved["points"]] == points[1:]
        assert reopened.get("/api/models", params={"point_id": points[0]}).json() == []
        assert reopened.get("/api/models").json()[0]["id"] == created["id"]
