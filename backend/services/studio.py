from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models import KnowledgePoint, now_utc
from backend.database.studio import StudioModel, StudioModelPoint
from backend.schemas.studio import ModelWrite


def list_models(session: Session, point_id: str | None):
    query = select(StudioModel)
    if point_id is not None:
        query = query.join(StudioModelPoint).where(StudioModelPoint.point_id == point_id)
    return session.scalars(query.order_by(StudioModel.updated_at.desc(), StudioModel.id)).all()


def save_model(session: Session, payload: ModelWrite, model: StudioModel | None = None):
    points = session.scalars(select(KnowledgePoint).where(KnowledgePoint.id.in_(payload.point_ids))
                             .order_by(KnowledgePoint.id)).all()
    if len(points) != len(payload.point_ids):
        raise ValueError("一个或多个关联知识点不存在")
    model = model or StudioModel(id=str(uuid4()))
    model.name = payload.name
    model.expression = payload.expression
    model.description = payload.description
    model.parameters = [parameter.model_dump() for parameter in payload.parameters]
    model.view = payload.view.model_dump()
    model.points = points
    model.updated_at = now_utc()
    session.add(model)
    session.commit()
    return model
