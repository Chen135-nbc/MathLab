import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.database.models import Chapter, KnowledgePoint, Section, Volume


SEED_FILE = Path(__file__).resolve().parents[2] / "curriculum" / "high_school" / "renjiao_a_2019.json"


def seed_curriculum(session: Session) -> None:
    """Upsert only published curriculum fields; never touch notes or progress."""
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
                for point_data in section_data["knowledge_points"]:
                    point = session.get(KnowledgePoint, point_data["id"]) or KnowledgePoint(id=point_data["id"])
                    point.section_id = section.id
                    point.title = point_data["title"]
                    point.kind = point_data["kind"]
                    point.sort_order = point_data["sort_order"]
                    point.formula = point_data.get("formula")
                    session.add(point)
    session.commit()


def curriculum_tree(session: Session):
    return session.scalars(select(Volume).options(selectinload(Volume.chapters).selectinload(Chapter.sections).selectinload(Section.knowledge_points)).order_by(Volume.sort_order)).all()
