from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.knowledge import router
from backend.database.core import Base, SessionLocal, engine
from backend.database.models import SchemaVersion
from backend.services.curriculum import seed_curriculum


def initialize_database():
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        if session.get(SchemaVersion, 1) is None:
            session.add(SchemaVersion(version=1))
            session.commit()
        seed_curriculum(session)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="MathLab API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5174", "http://localhost:5174"], allow_methods=["GET", "PUT"], allow_headers=["Content-Type"])
app.include_router(router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
