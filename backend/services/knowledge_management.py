from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database.models import KnowledgeMeta, KnowledgePoint, Note, Section, now_utc
from backend.schemas.knowledge import PointWrite


def require_section(session: Session, section_id: str):
    section = session.get(Section, section_id)
    if section is None:
        raise HTTPException(404, "课程小节不存在")
    return section


def create_point(session: Session, payload: PointWrite, content=""):
    require_section(session, payload.section_id)
    order = session.scalar(select(func.max(KnowledgePoint.sort_order)).where(KnowledgePoint.section_id == payload.section_id)) or 0
    point = KnowledgePoint(id="kp-" + str(uuid4()), section_id=payload.section_id,
                           title=payload.title, kind="个人知识点", sort_order=order + 1)
    session.add(point)
    session.flush()
    session.add(KnowledgeMeta(point_id=point.id, description=payload.description))
    session.add(Note(point_id=point.id, content=content))
    session.flush()
    return point


def update_point(session: Session, point, payload):
    require_section(session, payload.section_id)
    if point.section_id != payload.section_id:
        order = session.scalar(select(func.max(KnowledgePoint.sort_order)).where(KnowledgePoint.section_id == payload.section_id)) or 0
        point.sort_order = order + 1
    point.section_id = payload.section_id
    point.title = payload.title
    meta = point.management or KnowledgeMeta(point_id=point.id)
    meta.description = payload.description
    meta.archived = payload.archived
    meta.updated_at = now_utc()
    session.add(meta)
    session.commit()
    session.refresh(point)
    return point


def reorder_points(session: Session, section_id: str, ids: list[str]):
    require_section(session, section_id)
    points = session.scalars(select(KnowledgePoint).join(KnowledgeMeta)
                             .where(KnowledgePoint.section_id == section_id, KnowledgeMeta.deleted.is_(False))).all()
    if len(ids) != len(set(ids)) or set(ids) != {point.id for point in points}:
        raise HTTPException(409, "小节知识点已变化，请刷新后重新排序")
    lookup = {point.id: point for point in points}
    for index, point_id in enumerate(ids):
        lookup[point_id].sort_order = index + 1
        lookup[point_id].management.updated_at = now_utc()
    session.commit()
