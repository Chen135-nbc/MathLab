from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .core import Base
from .models import now_utc


class MindMap(Base):
    __tablename__ = "mind_maps"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    section_id: Mapped[str | None] = mapped_column(ForeignKey("sections.id"), nullable=True)
    nodes: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    viewport: Mapped[dict[str, float]] = mapped_column(JSON)
    layout: Mapped[str] = mapped_column(String(20), default="right")
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class MindMapLink(Base):
    __tablename__ = "mind_map_links"
    map_id: Mapped[str] = mapped_column(ForeignKey("mind_maps.id", ondelete="CASCADE"), primary_key=True)
    node_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    point_id: Mapped[str] = mapped_column(ForeignKey("knowledge_points.id"), index=True)
