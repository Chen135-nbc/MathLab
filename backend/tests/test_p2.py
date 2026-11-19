import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

SECTION = "bx1-c01-s01"
OTHER = "bx1-c01-s02"


def make_map(**patch):
    return {
        "format": "mathlab-mindmap", "version": 1, "title": "集合的整理", "description": "自己的思路",
        "section_id": None, "layout": "right", "viewport": {"x": 10, "y": -20, "zoom": 0.9},
        "nodes": [
            {"id": "root", "parent_id": None, "title": "集合 $A$", "notes": "", "color": "navy",
             "collapsed": False, "position": None, "point_id": None},
            {"id": "child", "parent_id": "root", "title": "表示方法", "notes": "原备注 $x^2$", "color": "teal",
             "collapsed": False, "position": {"x": 350, "y": 40}, "point_id": None},
        ], "revision": None, **patch,
    }


def payload_from(saved, **patch):
    return {key: value for key, value in {**saved, **patch}.items() if key not in {"id", "created_at", "updated_at"}}


def create_point(client, title="我的知识点", section=SECTION):
    response = client.post("/api/knowledge", json={"title": title, "description": "说明", "section_id": section})
    assert response.status_code == 201, response.text
    return response.json()


def test_knowledge_crud_reorder_move_and_seed_preserves_user_content(client, database):
    main, sessions = database
    point = create_point(client)
    next_point = create_point(client, "另一个知识点")
    path = "/api/knowledge/" + point["id"]
    content = "原笔记 $A \\cap B$"
    assert client.put(path + "/note", json={"content": content}).status_code == 200
    section = client.get(f"/api/sections/{SECTION}").json()
    ids = [p["id"] for p in section["knowledge_points"]][::-1]
    response = client.put(f"/api/sections/{SECTION}/order", json={"point_ids": ids})
    assert response.status_code == 200
    assert [p["id"] for p in response.json()["knowledge_points"]] == ids
    assert client.put(f"/api/sections/{SECTION}/order", json={"point_ids": ids + [ids[0]]}).status_code == 409

    response = client.put(path, json={"title": "改名后", "description": "新说明", "section_id": OTHER, "archived": True})
    assert response.status_code == 200, response.text
    assert response.json()["id"] == point["id"]
    assert response.json()["section_id"] == OTHER
    assert response.json()["note"] == content
    assert response.json()["section_title"].startswith("1.2")
    main.initialize_database()
    main.initialize_database()
    reopened = client.get(path).json()
    assert reopened["title"] == "改名后"
    assert reopened["archived"]
    assert reopened["description"] == "新说明"
    assert reopened["note"] == content

    # Archived cards remain searchable and in their section manager, but not the main tree.
    tree_ids = [p["id"] for v in client.get("/api/curriculum").json() for c in v["chapters"] for s in c["sections"] for p in s["knowledge_points"]]
    assert point["id"] not in tree_ids
    assert client.get("/api/knowledge/search", params={"q": "改名"}).json()[0]["id"] == point["id"]
    assert any(p["id"] == point["id"] for p in client.get(f"/api/sections/{OTHER}").json()["knowledge_points"])

    assert client.delete(path).status_code == 400
    assert client.delete(path + "?confirm=true").status_code == 200
    assert client.get(path).status_code == 404
    assert not client.get("/api/knowledge/search", params={"q": "改名"}).json()
    from backend.database.models import Note, KnowledgePoint
    with sessions() as session:
        assert session.get(Note, point["id"]).content == content
        assert session.get(KnowledgePoint, point["id"]).deleted
        assert session.get(KnowledgePoint, next_point["id"])
    main.initialize_database()
    assert client.get(path).status_code == 404


def test_legacy_ids_metadata_and_backup_are_preserved(database):
    main, sessions = database
    from backend.database.models import KnowledgePoint, Note
    # The fixture contains the old tables and five old points, with no P2 schema.
    with sessions() as session:
        session.add(Note(point_id="ks-bx1-001", content="原有个人笔记"))
        session.commit()
    main.initialize_database()
    folder = Path(main.engine.url.database).parent / "backups"
    backups = list(folder.glob("pre-p2-*.sqlite3"))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as backup:
        assert backup.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert backup.execute("SELECT content FROM notes WHERE point_id='ks-bx1-001'").fetchone()[0] == "原有个人笔记"
        assert not backup.execute("SELECT name FROM sqlite_master WHERE name='mind_maps'").fetchone()
    with sessions() as session:
        point = session.get(KnowledgePoint, "ks-bx1-001")
        assert point.management.created_at
        assert point.note.content == "原有个人笔记"
        point.title = "用户改过的标题"
        point.section_id = OTHER
        session.commit()
    main.initialize_database()
    with sessions() as session:
        point = session.get(KnowledgePoint, "ks-bx1-001")
        assert point.title == "用户改过的标题"
        assert point.section_id == OTHER
    assert len(list(folder.glob("pre-p2-*.sqlite3"))) == 1


def test_section_free_note_and_map_links_survive_reopen(client, database):
    main, _ = database
    section_path = f"/api/sections/{SECTION}"
    profile = {"category": "research", "language_entries": [{"language": "en", "kind": "term", "text": "set", "source": "book"}]}
    assert client.put(section_path + "/note", json={"content": "小节临时笔记", "profile": profile}).status_code == 200

    point = create_point(client)
    model = make_map()
    model["nodes"][0]["point_id"] = point["id"]
    model["nodes"][1]["point_id"] = point["id"]
    response = client.post("/api/mindmaps", json=model)
    assert response.status_code == 201, response.text
    saved = response.json()
    path = "/api/mindmaps/" + saved["id"]
    assert len(client.get(f'/api/knowledge/{point["id"]}/mindmaps').json()) == 2
    updated_nodes = [{**node, "title": "改名后" if node["id"] == "child" else node["title"]} for node in saved["nodes"]]
    response = client.put(path, json=payload_from(saved, nodes=updated_nodes, title="改名的导图"))
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["revision"] == 2
    assert client.put(path, json=payload_from(saved)).status_code == 409

    moved = client.put(f'/api/knowledge/{point["id"]}', json={"title": point["title"], "description": "", "section_id": OTHER, "archived": False})
    assert moved.status_code == 200
    main.engine.dispose()
    with TestClient(main.app) as reopened:
        result = reopened.get(path).json()
        assert result["nodes"] == updated["nodes"]
        assert result["viewport"] == model["viewport"]
        links = reopened.get(f'/api/knowledge/{point["id"]}/mindmaps').json()
        assert {link["node_title"] for link in links} == {"集合 $A$", "改名后"}
        assert reopened.get(section_path).json()["content"] == "小节临时笔记"
        assert reopened.get(section_path).json()["profile"] == profile

        # Unlink preserves both entities.
        nodes = [{**node, "point_id": None} for node in result["nodes"]]
        assert reopened.put(path, json=payload_from(result, nodes=nodes)).status_code == 200
        assert reopened.get(f'/api/knowledge/{point["id"]}/mindmaps').json() == []
        assert reopened.get(f'/api/knowledge/{point["id"]}').status_code == 200


def test_promote_duplicate_import_and_delete_are_independent(client, database):
    main, sessions = database
    saved = client.post("/api/mindmaps", json=make_map()).json()
    path = "/api/mindmaps/" + saved["id"]
    result = client.post(path + "/nodes/child/knowledge", json={"title": "整理为知识卡", "description": "从节点来", "section_id": SECTION,
                                                                "revision": saved["revision"], "include_notes": True})
    assert result.status_code == 201, result.text
    result = result.json()
    point_id = result["point_id"]
    assert len(result["map"]["nodes"]) == 2
    assert result["map"]["nodes"][1]["notes"] == "原备注 $x^2$"
    assert client.get(f"/api/knowledge/{point_id}/note").json()["content"] == "原备注 $x^2$"
    assert client.post(path + "/nodes/child/knowledge", json={"title": "不重复", "section_id": SECTION, "revision": 2}).status_code == 409

    duplicate = client.post(path + "/duplicate")
    assert duplicate.status_code == 201, duplicate.text
    copy = duplicate.json()
    assert copy["id"] != saved["id"]
    assert not set(node["id"] for node in copy["nodes"]) & {"root", "child"}
    assert copy["nodes"][1]["parent_id"] == copy["nodes"][0]["id"]
    assert copy["nodes"][1]["point_id"] == point_id
    exported = payload_from(result["map"], revision=None)
    imported = client.post("/api/mindmaps/import", json=exported)
    assert imported.status_code == 201, imported.text
    assert imported.json()["id"] != copy["id"]
    assert not set(n["id"] for n in imported.json()["nodes"]) & set(n["id"] for n in copy["nodes"])
    assert client.request("DELETE", path, json={"confirm": False, "revision": 2}).status_code == 422
    assert client.request("DELETE", path, json={"confirm": True, "revision": 1}).status_code == 409
    assert client.request("DELETE", path, json={"confirm": True, "revision": 2}).status_code == 200
    assert client.get(path).status_code == 404
    from backend.database.mindmaps import MindMapLink
    with sessions() as session:
        assert not session.scalars(select(MindMapLink).where(MindMapLink.map_id == saved["id"])).all()
    assert client.get(f"/api/knowledge/{point_id}").status_code == 200
    assert client.get("/api/mindmaps/" + copy["id"]).status_code == 200


def test_invalid_trees_and_missing_links_are_rejected(client):
    for nodes in [
        [{"id": "same", "parent_id": None, "title": "A"}, {"id": "same", "parent_id": "same", "title": "B"}],
        [{"id": "a", "parent_id": None, "title": "A"}, {"id": "b", "parent_id": "c", "title": "B"}, {"id": "c", "parent_id": "b", "title": "C"}],
        [{"id": "a", "parent_id": None, "title": "A"}, {"id": "b", "parent_id": None, "title": "B"}],
        [{"id": "a", "parent_id": None, "title": "A"}, {"id": "b", "parent_id": "missing", "title": "B"}],
        [{"id": str(i), "parent_id": str(i - 1) if i else None, "title": "A"} for i in range(27)],
    ]:
        assert client.post("/api/mindmaps", json=make_map(nodes=nodes)).status_code == 422
    bad = make_map()
    bad["nodes"][1]["point_id"] = "missing-card"
    assert client.post("/api/mindmaps", json=bad).status_code == 422
    assert client.post("/api/mindmaps", json=make_map(title=" ")).status_code == 422
    assert client.post("/api/knowledge", json={"title": " ", "section_id": SECTION}).status_code == 422
    assert client.post("/api/knowledge", json={"title": "卡", "section_id": "missing"}).status_code == 404


def test_new_install_has_framework_but_no_forced_knowledge(database, tmp_path, monkeypatch):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from backend.database.models import KnowledgePoint
    main, _ = database
    engine = create_engine("sqlite:///" + str(tmp_path / "clean.sqlite3"))
    with monkeypatch.context() as patch:
        patch.setattr(main, "engine", engine)
        patch.setattr(main, "SessionLocal", sessionmaker(bind=engine))
        main.initialize_database()
        with main.SessionLocal() as session:
            assert not session.scalars(select(KnowledgePoint)).all()
    engine.dispose()


def test_point_delete_keeps_notes_studio_and_maps_and_allows_map_editing(client, database):
    _, sessions = database
    point = create_point(client, "待删除的测试卡")
    path = "/api/knowledge/" + point["id"]
    client.put(path + "/note", json={"content": "必须保留的笔记"})
    studio = client.post("/api/models", json={"name": "仍应保留的模型", "expression": "x^2", "parameters": [],
                                            "view": {"x": 0, "y": 0, "scale": 50}, "description": "", "point_ids": [point["id"]]}).json()
    model = make_map()
    model["nodes"][1]["point_id"] = point["id"]
    saved = client.post("/api/mindmaps", json=model).json()
    assert client.delete(path + "?confirm=true").status_code == 200
    assert client.get("/api/models/" + studio["id"]).json()["points"][0]["deleted"]
    map_path = "/api/mindmaps/" + saved["id"]
    updated = client.put(map_path, json=payload_from(saved, title="删除卡之后仍能保存导图"))
    assert updated.status_code == 200, updated.text
    copied = client.post(map_path + "/duplicate")
    assert copied.status_code == 201, copied.text
    assert copied.json()["nodes"][1]["point_id"] == point["id"]
    from backend.database.models import Note
    with sessions() as session:
        assert session.get(Note, point["id"]).content == "必须保留的笔记"
