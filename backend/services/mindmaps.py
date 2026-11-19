from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import delete, select, update

from backend.database.models import KnowledgePoint, now_utc
from backend.database.mindmaps import MindMap, MindMapLink
from backend.schemas.mindmaps import MapWrite
from backend.schemas.studio import utc
from backend.services.knowledge_management import require_section


def require_map(session, map_id):
    item = session.get(MindMap, map_id)
    if item is None:
        raise HTTPException(404, "思维导图不存在")
    return item


def document(session, item):
    links = {link.node_id: link.point_id for link in session.scalars(select(MindMapLink).where(MindMapLink.map_id == item.id))}
    return {"format": "mathlab-mindmap", "version": 1, "id": item.id, "title": item.title,
            "description": item.description, "section_id": item.section_id, "layout": item.layout,
            "viewport": item.viewport, "nodes": [{**node, "point_id": links.get(node["id"])} for node in item.nodes],
            "revision": item.revision, "created_at": utc(item.created_at), "updated_at": utc(item.updated_at)}


def remap_nodes(payload):
    ids = {node.id: str(uuid4()) for node in payload.nodes}
    data = payload.model_dump()
    data["nodes"] = [{**node.model_dump(), "id": ids[node.id], "parent_id": ids.get(node.parent_id)} for node in payload.nodes]
    data["revision"] = None
    return MapWrite(**data)


def save_map(session, payload, item=None, *, preserve_removed_links=False):
    if payload.section_id:
        require_section(session, payload.section_id)
    linked = {node.point_id for node in payload.nodes if node.point_id}
    existing = session.scalars(select(KnowledgePoint).where(KnowledgePoint.id.in_(linked))).all()
    # Existing links to logically removed points are preserved, but new links to them are rejected.
    retained = {(link.node_id, link.point_id) for link in session.scalars(select(MindMapLink).where(MindMapLink.map_id == item.id))} if item else set()
    lookup = {point.id: point for point in existing}
    for node in payload.nodes:
        if node.point_id and (node.point_id not in lookup or
                             (lookup[node.point_id].deleted and not preserve_removed_links and (node.id, node.point_id) not in retained)):
            raise HTTPException(422, "关联知识点不存在或已删除，请解除该关联后重试")
    values = {"title": payload.title, "description": payload.description, "section_id": payload.section_id,
              "layout": payload.layout, "viewport": payload.viewport.model_dump(),
              "nodes": [node.model_dump(exclude={"point_id"}) for node in payload.nodes], "updated_at": now_utc()}
    if item:
        result = session.execute(update(MindMap).where(MindMap.id == item.id, MindMap.revision == payload.revision)
                                 .values(**values, revision=MindMap.revision + 1).execution_options(synchronize_session=False))
        if result.rowcount != 1:
            raise HTTPException(409, "导图已在其他页面修改，请保留当前草稿并重新打开最新版本")
        session.expire(item)
    else:
        item = MindMap(id=str(uuid4()), revision=1, **values)
        session.add(item)
        session.flush()
    session.execute(delete(MindMapLink).where(MindMapLink.map_id == item.id))
    for node in payload.nodes:
        if node.point_id:
            session.add(MindMapLink(map_id=item.id, node_id=node.id, point_id=node.point_id))
    session.flush()
    return item
