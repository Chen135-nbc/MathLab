"""Additive P2 migration; old tables and IDs are left in place."""
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from sqlalchemy import inspect, select

from .models import KnowledgeMeta, KnowledgePoint, SchemaVersion


def backup_before_p2(engine):
    database = engine.url.database
    if not database or database == ":memory:":
        return
    path = Path(database)
    if not path.exists() or path.stat().st_size == 0:
        return
    with engine.connect() as connection:
        if "schema_versions" in inspect(engine).get_table_names():
            if connection.scalar(select(SchemaVersion.version).where(SchemaVersion.version == 3)):
                return
    directory = path.parent / "backups"
    directory.mkdir(exist_ok=True)
    target = directory / ("pre-p2-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".sqlite3")
    with sqlite3.connect(path) as source, sqlite3.connect(target) as destination:
        source.backup(destination)
        if destination.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("数据库备份校验失败，已停止升级")


def migrate_p2(session):
    for point_id in session.scalars(select(KnowledgePoint.id)):
        if session.get(KnowledgeMeta, point_id) is None:
            session.add(KnowledgeMeta(point_id=point_id))
    if session.get(SchemaVersion, 3) is None:
        session.add(SchemaVersion(version=3))
    session.commit()
