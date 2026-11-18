from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database.core import get_db
from backend.database.studio import StudioModel
from backend.schemas.studio import ModelDetail, ModelSummary, ModelWrite
from backend.services.studio import list_models, save_model

router = APIRouter(prefix="/api/models", tags=["studio"])


@router.get("", response_model=list[ModelSummary])
def models(point_id: str | None = Query(default=None, max_length=60), session: Session = Depends(get_db)):
    return list_models(session, point_id)


def require_model(model_id: str, session: Session):
    model = session.get(StudioModel, model_id)
    if model is None:
        raise HTTPException(404, "模型不存在")
    return model


@router.get("/{model_id}", response_model=ModelDetail)
def read(model_id: str, session: Session = Depends(get_db)):
    return require_model(model_id, session)


def persist(session: Session, payload: ModelWrite, model: StudioModel | None = None):
    try:
        return save_model(session, payload, model)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@router.post("", response_model=ModelDetail, status_code=201)
def create(payload: ModelWrite, session: Session = Depends(get_db)):
    return persist(session, payload)


@router.put("/{model_id}", response_model=ModelDetail)
def update(model_id: str, payload: ModelWrite, session: Session = Depends(get_db)):
    return persist(session, payload, require_model(model_id, session))
