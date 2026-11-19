from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.database.core import get_db
from backend.database.mindmaps import MindMap, MindMapLink
from backend.schemas.mindmaps import MapDelete, MapWrite, NodeKnowledge
from backend.schemas.studio import utc
from backend.services.mindmaps import document, remap_nodes, require_map, save_map
from backend.services.knowledge_management import create_point

router = APIRouter(prefix="/api/mindmaps", tags=["mindmaps"])


@router.get("")
def listing(session: Session = Depends(get_db)):
    return [{"id": m.id, "title": m.title, "updated_at": utc(m.updated_at), "section_id": m.section_id,
             "revision": m.revision} for m in session.scalars(select(MindMap).order_by(MindMap.updated_at.desc()))]


@router.post("", status_code=201)
def create(payload: MapWrite, session: Session = Depends(get_db)):
    item = save_map(session, payload)
    session.commit()
    return document(session, item)


@router.post("/import", status_code=201)
def import_map(payload: MapWrite, session: Session = Depends(get_db)):
    item = save_map(session, remap_nodes(payload))
    session.commit()
    return document(session, item)


@router.get("/{map_id}")
def read(map_id: str, session: Session = Depends(get_db)):
    return document(session, require_map(session, map_id))


@router.put("/{map_id}")
def save(map_id: str, payload: MapWrite, session: Session = Depends(get_db)):
    item = save_map(session, payload, require_map(session, map_id))
    session.commit()
    return document(session, item)


@router.post("/{map_id}/duplicate", status_code=201)
def duplicate(map_id: str, session: Session = Depends(get_db)):
    data = document(session, require_map(session, map_id))
    data = {key: value for key, value in data.items() if key not in {"id", "created_at", "updated_at"}}
    payload = MapWrite(**{**data, "title": (data["title"][:115] + " 副本")})
    item = save_map(session, remap_nodes(payload), preserve_removed_links=True)
    session.commit()
    return document(session, item)


@router.delete("/{map_id}")
def remove(map_id: str, payload: MapDelete, session: Session = Depends(get_db)):
    result = session.execute(delete(MindMap).where(MindMap.id == map_id, MindMap.revision == payload.revision))
    if result.rowcount != 1:
        raise HTTPException(409, "导图不存在或已修改，请刷新后再删除")
    session.commit()
    return {"deleted": map_id}


@router.post("/{map_id}/nodes/{node_id}/knowledge", status_code=201)
def promote(map_id: str, node_id: str, payload: NodeKnowledge, session: Session = Depends(get_db)):
    item = require_map(session, map_id)
    data = document(session, item)
    node = next((n for n in data["nodes"] if n["id"] == node_id), None)
    if node is None:
        raise HTTPException(404, "导图节点不存在")
    if node["point_id"]:
        raise HTTPException(409, "节点已关联知识点；可先解除关联")
    if payload.revision != item.revision:
        raise HTTPException(409, "请先重新打开最新导图")
    point = create_point(session, payload, node["notes"] if payload.include_notes else "")
    node["point_id"] = point.id
    for key in ("id", "created_at", "updated_at"):
        data.pop(key, None)
    item = save_map(session, MapWrite(**data), item)
    session.commit()
    return {"point_id": point.id, "map": document(session, item)}
