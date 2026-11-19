from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.knowledge import router
from backend.api.studio import router as studio_router
from backend.api.sections import router as sections_router
from backend.api.mindmaps import router as mindmaps_router
from backend.database.migrations import backup_before_p2, migrate_p2
from backend.database.core import Base, SessionLocal, engine
from backend.database.models import SchemaVersion
from backend.services.curriculum import seed_curriculum


def initialize_database():
    backup_before_p2(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        for version in (1, 2):
            if session.get(SchemaVersion, version) is None:
                session.add(SchemaVersion(version=version))
        seed_curriculum(session)
        migrate_p2(session)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="MathLab API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5174", "http://localhost:5174"], allow_methods=["GET", "PUT", "POST", "DELETE"], allow_headers=["Content-Type"])
app.include_router(router)
app.include_router(studio_router)
app.include_router(sections_router)
app.include_router(mindmaps_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
