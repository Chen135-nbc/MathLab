import json
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from backend.schemas.knowledge import PointWrite

Identifier = Annotated[str, StringConstraints(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class Position(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    x: float = Field(ge=-1e6, le=1e6)
    y: float = Field(ge=-1e6, le=1e6)


class Viewport(Position):
    zoom: float = Field(ge=0.01, le=3)


class MapNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Identifier
    parent_id: Identifier | None
    title: Title
    notes: str = Field(default="", max_length=4000)
    color: Literal["navy", "teal", "amber", "rose"] = "navy"
    collapsed: bool = False
    position: Position | None = None
    point_id: Annotated[str, StringConstraints(min_length=1, max_length=60)] | None = None


class MapWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    format: Literal["mathlab-mindmap"] = "mathlab-mindmap"
    version: Literal[1] = 1
    title: Title
    description: str = Field(default="", max_length=4000)
    section_id: Annotated[str, StringConstraints(min_length=1, max_length=50)] | None = None
    layout: Literal["right"] = "right"
    viewport: Viewport = Field(default_factory=lambda: Viewport(x=0, y=0, zoom=1))
    nodes: list[MapNode] = Field(min_length=1, max_length=300)
    revision: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_tree(self):
        nodes = {node.id: node for node in self.nodes}
        if len(nodes) != len(self.nodes):
            raise ValueError("导图节点 ID 不能重复")
        roots = [node for node in self.nodes if node.parent_id is None]
        if len(roots) != 1:
            raise ValueError("导图必须恰有一个根节点")
        for node in self.nodes:
            visited = set()
            current = node
            while current.parent_id is not None:
                if current.id in visited:
                    raise ValueError("导图不能存在循环引用")
                visited.add(current.id)
                if len(visited) > 24:
                    raise ValueError("导图层级最多 24 层")
                parent = nodes.get(current.parent_id)
                if parent is None:
                    raise ValueError("导图引用了不存在的父节点")
                current = parent
        if len(json.dumps(self.model_dump(), ensure_ascii=False).encode("utf-8")) > 1_048_576:
            raise ValueError("导图数据不能超过 1 MB")
        return self


class MapDelete(BaseModel):
    confirm: Literal[True]
    revision: int = Field(ge=1)


class NodeKnowledge(PointWrite):
    include_notes: bool = False
    revision: int = Field(ge=1)
