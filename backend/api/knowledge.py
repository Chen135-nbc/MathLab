from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database.core import get_db
from backend.database.models import KnowledgePoint, NoteProfile, now_utc
from backend.schemas.knowledge import ChapterOut, NoteProfileData, NoteUpdate, PointDetail, PointSummary, StatusUpdate, VolumeOut, PointChange, PointWrite
from backend.schemas.studio import utc
from backend.services.curriculum import curriculum_tree
from backend.services.knowledge import find_chapter, find_point, search_points, set_note, set_status
from backend.services.knowledge_management import create_point, update_point
from backend.database.mindmaps import MindMap, MindMapLink
from sqlalchemy import select


router = APIRouter(prefix="/api", tags=["knowledge"])


def get_point(session: Session, point_id: str) -> KnowledgePoint:
    point = find_point(session, point_id)
    if point is None or point.deleted:
        raise HTTPException(status_code=404, detail="知识点不存在")
    return point


def detail(point: KnowledgePoint, session: Session) -> PointDetail:
    section = point.section
    updated_at = point.note.updated_at if point.note else None
    if updated_at is not None and updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    profile = session.get(NoteProfile, point.id)
    return PointDetail(id=point.id, title=point.title, kind=point.kind, sort_order=point.sort_order, formula=point.formula,
                       section_id=section.id, section_title=section.title,
                       chapter_id=section.chapter.id, chapter_title=section.chapter.title,
                       volume_title=section.chapter.volume.title,
                       status=point.progress.status if point.progress else "not_started",
                       note=point.note.content if point.note else "",
                       note_updated_at=updated_at,
                       note_profile=NoteProfileData(category=profile.category, language_entries=profile.language_entries)
                       if profile else NoteProfileData(), description=point.description, archived=point.archived,
                       created_at=utc(point.management.created_at) if point.management else None,
                       updated_at=utc(point.management.updated_at) if point.management else None)


@router.post("/knowledge", response_model=PointDetail, status_code=201)
def create(payload: PointWrite, session: Session = Depends(get_db)):
    point = create_point(session, payload)
    session.commit()
    session.refresh(point)
    return detail(get_point(session, point.id), session)


@router.put("/knowledge/{point_id}", response_model=PointDetail)
def manage(point_id: str, payload: PointChange, session: Session = Depends(get_db)):
    return detail(update_point(session, get_point(session, point_id), payload), session)


@router.delete("/knowledge/{point_id}")
def remove(point_id: str, confirm: bool = Query(False), session: Session = Depends(get_db)):
    if not confirm:
        raise HTTPException(400, "删除前必须明确确认")
    point = get_point(session, point_id)
    point.management.deleted = True
    point.management.archived = True
    point.management.updated_at = now_utc()
    session.commit()
    return {"deleted": point.id, "retained": "笔记、模型和导图保留；知识点采用逻辑删除"}


@router.get("/curriculum", response_model=list[VolumeOut])
def read_curriculum(session: Session = Depends(get_db)):
    return curriculum_tree(session)


@router.get("/chapters/{chapter_id}", response_model=ChapterOut)
def read_chapter(chapter_id: str, session: Session = Depends(get_db)):
    chapter = find_chapter(session, chapter_id)
    if chapter is None:
        raise HTTPException(status_code=404, detail="章节不存在")
    return chapter


@router.get("/knowledge/search", response_model=list[PointSummary])
def search_knowledge(q: str = Query(min_length=1, max_length=100), session: Session = Depends(get_db)):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=422, detail="请输入搜索内容")
    return search_points(session, query)


@router.get("/knowledge/{point_id}", response_model=PointDetail)
def read_point(point_id: str, session: Session = Depends(get_db)):
    return detail(get_point(session, point_id), session)


@router.get("/knowledge/{point_id}/mindmaps")
def linked_maps(point_id: str, session: Session = Depends(get_db)):
    get_point(session, point_id)
    rows = session.execute(select(MindMapLink, MindMap).join(MindMap, MindMap.id == MindMapLink.map_id)
                           .where(MindMapLink.point_id == point_id)).all()
    return [{"map_id": item.id, "map_title": item.title, "node_id": link.node_id,
             "node_title": next((node["title"] for node in item.nodes if node["id"] == link.node_id), "节点")}
            for link, item in rows]


@router.put("/knowledge/{point_id}/status", response_model=PointDetail)
def update_status(point_id: str, payload: StatusUpdate, session: Session = Depends(get_db)):
    point = get_point(session, point_id)
    return detail(set_status(session, point, payload.status), session)


@router.get("/knowledge/{point_id}/note")
def read_note(point_id: str, session: Session = Depends(get_db)):
    point = detail(get_point(session, point_id), session)
    return {"content": point.note, "updated_at": point.note_updated_at, "profile": point.note_profile}


@router.put("/knowledge/{point_id}/note", response_model=PointDetail)
def save_note(point_id: str, payload: NoteUpdate, session: Session = Depends(get_db)):
    point = get_point(session, point_id)
    return detail(set_note(session, point, payload), session)
