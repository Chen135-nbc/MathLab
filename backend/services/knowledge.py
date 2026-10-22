from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database.models import Chapter, KnowledgePoint, LearningProgress, Note, Section


def find_chapter(session: Session, chapter_id: str) -> Chapter | None:
    return session.get(Chapter, chapter_id)


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
    return list(session.scalars(select(KnowledgePoint).where(KnowledgePoint.title.contains(query, autoescape=True)).order_by(KnowledgePoint.id).limit(50)))


def set_status(session: Session, point: KnowledgePoint, status: str) -> KnowledgePoint:
    progress = point.progress or LearningProgress(point_id=point.id)
    progress.status = status
    session.add(progress)
    session.commit()
    session.refresh(point)
    return find_point(session, point.id)


def set_note(session: Session, point: KnowledgePoint, content: str) -> KnowledgePoint:
    note = point.note or Note(point_id=point.id)
    note.content = content
    session.add(note)
    session.commit()
    session.refresh(point)
    return find_point(session, point.id)
