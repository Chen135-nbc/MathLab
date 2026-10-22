from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database.core import get_db
from backend.database.models import KnowledgePoint
from backend.schemas.knowledge import ChapterOut, NoteUpdate, PointDetail, PointSummary, StatusUpdate, VolumeOut
from backend.services.curriculum import curriculum_tree
from backend.services.knowledge import find_chapter, find_point, search_points, set_note, set_status


router = APIRouter(prefix="/api", tags=["knowledge"])


def get_point(session: Session, point_id: str) -> KnowledgePoint:
    point = find_point(session, point_id)
    if point is None:
        raise HTTPException(status_code=404, detail="知识点不存在")
    return point


def detail(point: KnowledgePoint) -> PointDetail:
    section = point.section
    updated_at = point.note.updated_at if point.note else None
    if updated_at is not None and updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    return PointDetail(id=point.id, title=point.title, kind=point.kind, formula=point.formula,
                       section_id=section.id, section_title=section.title,
                       chapter_id=section.chapter.id, chapter_title=section.chapter.title,
                       volume_title=section.chapter.volume.title,
                       status=point.progress.status if point.progress else "not_started",
                       note=point.note.content if point.note else "",
                       note_updated_at=updated_at)


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
    return detail(get_point(session, point_id))


@router.put("/knowledge/{point_id}/status", response_model=PointDetail)
def update_status(point_id: str, payload: StatusUpdate, session: Session = Depends(get_db)):
    point = get_point(session, point_id)
    return detail(set_status(session, point, payload.status))


@router.get("/knowledge/{point_id}/note")
def read_note(point_id: str, session: Session = Depends(get_db)):
    point = get_point(session, point_id)
    updated_at = point.note.updated_at if point.note else None
    if updated_at is not None and updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    return {"content": point.note.content if point.note else "", "updated_at": updated_at}


@router.put("/knowledge/{point_id}/note", response_model=PointDetail)
def save_note(point_id: str, payload: NoteUpdate, session: Session = Depends(get_db)):
    point = get_point(session, point_id)
    return detail(set_note(session, point, payload.content))
