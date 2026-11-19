"""Verify P2 on a temporary copy of the configured database; never migrate the source."""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile


def fingerprint(path: Path, tables: set[str]):
    with sqlite3.connect(path) as connection:
        present = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        return {
            table: hashlib.sha256(json.dumps(connection.execute(f'SELECT * FROM "{table}" ORDER BY 1').fetchall(),
                                             ensure_ascii=False, default=str).encode()).hexdigest()
            for table in tables & present
        }


def main():
    from backend.database.core import DATABASE_PATH, ROOT

    if not DATABASE_PATH.exists():
        raise SystemExit("没有已有数据库，无需执行旧库升级验证。")
    preserved = {"knowledge_points", "notes", "note_profiles", "learning_progress", "studio_models", "studio_model_points"}
    source_fingerprint = fingerprint(DATABASE_PATH, preserved)
    with tempfile.TemporaryDirectory(prefix="mathlab-p2-upgrade-") as temporary:
        copied = Path(temporary) / "upgrade.sqlite3"
        with sqlite3.connect(DATABASE_PATH) as source, sqlite3.connect(copied) as destination:
            source.backup(destination)
        before = fingerprint(copied, preserved)
        env = {**os.environ, "MATHLAB_DATABASE_PATH": str(copied)}
        for _ in range(2):
            subprocess.run([sys.executable, "-m", "scripts.init_db"], cwd=ROOT, env=env, check=True, capture_output=True)
        assert fingerprint(copied, preserved) == before, "升级修改了应保留的旧表"
        with sqlite3.connect(copied) as connection:
            assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
            assert connection.execute("SELECT version FROM schema_versions WHERE version=3").fetchone()
            point_count = connection.execute("SELECT count(*) FROM knowledge_points").fetchone()[0]
            assert connection.execute("SELECT count(*) FROM knowledge_meta").fetchone()[0] == point_count
        assert list((copied.parent / "backups").glob("pre-p2-*.sqlite3")), "升级前没有生成备份"
    assert fingerprint(DATABASE_PATH, preserved) == source_fingerprint, "原数据库发生变化"
    print("P2 临时副本升级验证通过：旧表内容一致、ID 保留、元数据补齐、重复迁移幂等、备份可用；原数据库未修改。")


if __name__ == "__main__":
    main()
