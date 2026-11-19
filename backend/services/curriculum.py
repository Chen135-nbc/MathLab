import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, with_loader_criteria

from backend.database.models import Chapter, KnowledgeMeta, KnowledgePoint, Section, Volume


SEED_FILE = Path(__file__).resolve().parents[2] / "curriculum" / "high_school" / "renjiao_a_2019.json"


def seed_curriculum(session: Session) -> None:
    """Sync textbook structure only. Knowledge points belong to the user."""
    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    for volume_data in data["volumes"]:
        volume = session.get(Volume, volume_data["id"]) or Volume(id=volume_data["id"])
        volume.title = volume_data["title"]
        volume.sort_order = volume_data["sort_order"]
        session.add(volume)
        for chapter_data in volume_data["chapters"]:
            chapter = session.get(Chapter, chapter_data["id"]) or Chapter(id=chapter_data["id"])
            chapter.volume_id = volume.id
            chapter.title = chapter_data["title"]
            chapter.sort_order = chapter_data["sort_order"]
            chapter.verified = chapter_data["verified"]
            session.add(chapter)
            for section_data in chapter_data["sections"]:
                section = session.get(Section, section_data["id"]) or Section(id=section_data["id"])
                section.chapter_id = chapter.id
                section.title = section_data["title"]
                section.sort_order = section_data["sort_order"]
                session.add(section)
    session.commit()


def curriculum_tree(session: Session):
    return session.scalars(
        select(Volume).options(
            selectinload(Volume.chapters).selectinload(Chapter.sections).selectinload(Section.knowledge_points),
            with_loader_criteria(KnowledgePoint, ~KnowledgePoint.management.has(KnowledgeMeta.deleted.is_(True))
                                 & ~KnowledgePoint.management.has(KnowledgeMeta.archived.is_(True))),
        ).order_by(Volume.sort_order)
    ).all()
