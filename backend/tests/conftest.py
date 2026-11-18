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
    yield main, sessions
    engine.dispose()


@pytest.fixture
def client(database):
    main, _ = database
    with TestClient(main.app) as client:
        yield client
