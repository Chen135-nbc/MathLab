from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .core import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Volume(Base):
    __tablename__ = "volumes"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    sort_order: Mapped[int] = mapped_column(Integer)
    chapters: Mapped[list["Chapter"]] = relationship(back_populates="volume", order_by="Chapter.sort_order")


class Chapter(Base):
    __tablename__ = "chapters"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    volume_id: Mapped[str] = mapped_column(ForeignKey("volumes.id"))
    title: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(Integer)
    verified: Mapped[bool] = mapped_column(default=False)
    volume: Mapped[Volume] = relationship(back_populates="chapters")
    sections: Mapped[list["Section"]] = relationship(back_populates="chapter", order_by="Section.sort_order")


class Section(Base):
    __tablename__ = "sections"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    chapter_id: Mapped[str] = mapped_column(ForeignKey("chapters.id"))
    title: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(Integer)
    chapter: Mapped[Chapter] = relationship(back_populates="sections")
    knowledge_points: Mapped[list["KnowledgePoint"]] = relationship(back_populates="section", order_by="KnowledgePoint.sort_order")


class KnowledgePoint(Base):
    __tablename__ = "knowledge_points"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id"))
    title: Mapped[str] = mapped_column(String(120), index=True)
    kind: Mapped[str] = mapped_column(String(40), default="概念")
    sort_order: Mapped[int] = mapped_column(Integer)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    section: Mapped[Section] = relationship(back_populates="knowledge_points")
    progress: Mapped["LearningProgress | None"] = relationship(back_populates="point", uselist=False)
    note: Mapped["Note | None"] = relationship(back_populates="point", uselist=False)


class LearningProgress(Base):
    __tablename__ = "learning_progress"
    point_id: Mapped[str] = mapped_column(ForeignKey("knowledge_points.id"), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    point: Mapped[KnowledgePoint] = relationship(back_populates="progress")


class Note(Base):
    __tablename__ = "notes"
    point_id: Mapped[str] = mapped_column(ForeignKey("knowledge_points.id"), primary_key=True)
    content: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    point: Mapped[KnowledgePoint] = relationship(back_populates="note")


class SchemaVersion(Base):
    __tablename__ = "schema_versions"
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
