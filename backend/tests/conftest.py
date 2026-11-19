import pytest
from fastapi.testclient import TestClient
from sqlalchemy import URL, create_engine, event
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def database(tmp_path, monkeypatch):
    from backend import main
    from backend.database import core

    engine = create_engine(URL.create("sqlite", database=str(tmp_path / "test.sqlite3")))
    event.listen(engine, "connect", core.enable_foreign_keys)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr(core, "SessionLocal", sessions)
    # Legacy P0/P1 fixtures are explicit test data, no longer production curriculum seeds.
    import json
    from backend.database.models import KnowledgePoint
    from backend.services.curriculum import SEED_FILE, seed_curriculum
    legacy_names = {"volumes", "chapters", "sections", "knowledge_points", "notes", "learning_progress", "schema_versions"}
    core.Base.metadata.create_all(engine, tables=[table for table in core.Base.metadata.tables.values() if table.name in legacy_names])
    with sessions() as session:
        seed_curriculum(session)
        for volume in json.loads(SEED_FILE.read_text())["volumes"]:
            for chapter in volume["chapters"]:
                for section in chapter["sections"]:
                    for point in section["knowledge_points"]:
                        session.execute(KnowledgePoint.__table__.insert().values(**point, section_id=section["id"]))
        session.commit()
    yield main, sessions
    engine.dispose()


@pytest.fixture
def client(database):
    main, _ = database
    with TestClient(main.app) as client:
        yield client
