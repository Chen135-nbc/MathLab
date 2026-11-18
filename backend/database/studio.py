from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .core import Base
from .models import KnowledgePoint, now_utc


class StudioModelPoint(Base):
    __tablename__ = "studio_model_points"
    model_id: Mapped[str] = mapped_column(ForeignKey("studio_models.id"), primary_key=True)
    point_id: Mapped[str] = mapped_column(ForeignKey("knowledge_points.id"), primary_key=True, index=True)


class StudioModel(Base):
    __tablename__ = "studio_models"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    expression: Mapped[str] = mapped_column(String(500))
    parameters: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    view: Mapped[dict[str, float]] = mapped_column(JSON)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    points: Mapped[list[KnowledgePoint]] = relationship(secondary="studio_model_points", order_by=KnowledgePoint.id)
