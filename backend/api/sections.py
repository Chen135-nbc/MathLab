from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.core import get_db
from backend.database.models import KnowledgeMeta, KnowledgePoint, SectionNote
from backend.schemas.knowledge import NoteProfileData, NoteUpdate, PointSummary, ReorderPoints, SectionDetail
from backend.schemas.studio import utc
from backend.services.knowledge_management import reorder_points, require_section

router = APIRouter(prefix="/api/sections", tags=["sections"])


def section_detail(session: Session, section_id: str):
    section = require_section(session, section_id)
    note = session.get(SectionNote, section_id)
    points = session.scalars(select(KnowledgePoint).join(KnowledgeMeta)
                             .where(KnowledgePoint.section_id == section_id, KnowledgeMeta.deleted.is_(False))
                             .order_by(KnowledgePoint.sort_order, KnowledgePoint.id)).all()
    return SectionDetail(id=section.id, title=section.title, sort_order=section.sort_order,
                         chapter_title=section.chapter.title, volume_title=section.chapter.volume.title,
                         knowledge_points=[PointSummary.model_validate(p) for p in points],
                         content=note.content if note else "", profile=NoteProfileData(**note.profile) if note else NoteProfileData(),
                         updated_at=utc(note.updated_at) if note else None)


@router.get("/{section_id}", response_model=SectionDetail)
def read(section_id: str, session: Session = Depends(get_db)):
    return section_detail(session, section_id)


@router.put("/{section_id}/note", response_model=SectionDetail)
def save(section_id: str, payload: NoteUpdate, session: Session = Depends(get_db)):
    require_section(session, section_id)
    note = session.get(SectionNote, section_id) or SectionNote(section_id=section_id)
    note.content = payload.content
    if payload.profile is not None:
        note.profile = payload.profile.model_dump()
    session.add(note)
    session.commit()
    return section_detail(session, section_id)


@router.put("/{section_id}/order", response_model=SectionDetail)
def reorder(section_id: str, payload: ReorderPoints, session: Session = Depends(get_db)):
    reorder_points(session, section_id, payload.point_ids)
    return section_detail(session, section_id)
