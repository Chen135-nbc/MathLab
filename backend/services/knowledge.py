from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, with_loader_criteria

from backend.database.models import Chapter, KnowledgePoint, KnowledgeMeta, LearningProgress, Note, NoteProfile, Section, now_utc
from backend.schemas.knowledge import NoteUpdate


def find_chapter(session: Session, chapter_id: str) -> Chapter | None:
    return session.scalar(select(Chapter).where(Chapter.id == chapter_id).options(
        with_loader_criteria(KnowledgePoint, ~KnowledgePoint.management.has(KnowledgeMeta.deleted.is_(True))
                             & ~KnowledgePoint.management.has(KnowledgeMeta.archived.is_(True)))))


def find_point(session: Session, point_id: str) -> KnowledgePoint | None:
    return session.scalar(
        select(KnowledgePoint)
        .options(
            joinedload(KnowledgePoint.section).joinedload(Section.chapter).joinedload(Chapter.volume),
            joinedload(KnowledgePoint.note),
            joinedload(KnowledgePoint.progress),
        )
        .where(KnowledgePoint.id == point_id)
    )


def search_points(session: Session, query: str) -> list[KnowledgePoint]:
    return list(session.scalars(select(KnowledgePoint).join(KnowledgeMeta).where(KnowledgeMeta.deleted.is_(False), KnowledgePoint.title.contains(query, autoescape=True)).order_by(KnowledgePoint.id).limit(50)))


def set_status(session: Session, point: KnowledgePoint, status: str) -> KnowledgePoint:
    progress = point.progress or LearningProgress(point_id=point.id)
    progress.status = status
    session.add(progress)
    session.commit()
    session.refresh(point)
    return find_point(session, point.id)


def set_note(session: Session, point: KnowledgePoint, payload: NoteUpdate) -> KnowledgePoint:
    note = point.note or Note(point_id=point.id)
    note.content = payload.content
    note.updated_at = now_utc()
    session.add(note)
    if point.management:
        point.management.updated_at = now_utc()
    if payload.profile is not None:
        profile = session.get(NoteProfile, point.id) or NoteProfile(point_id=point.id)
        profile.category = payload.profile.category
        profile.language_entries = [entry.model_dump() for entry in payload.profile.language_entries]
        session.add(profile)
    session.commit()
    session.refresh(point)
    return find_point(session, point.id)
