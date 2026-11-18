from pathlib import Path
import os

from sqlalchemy import create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("MATHLAB_DATA_DIR", ROOT / "data")).expanduser()
DATABASE_PATH = Path(os.getenv("MATHLAB_DATABASE_PATH", DATA_DIR / "mathlab.sqlite3")).expanduser()
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(URL.create("sqlite", database=str(DATABASE_PATH)), connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def enable_foreign_keys(connection, _record):
    connection.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal() as session:
        yield session
