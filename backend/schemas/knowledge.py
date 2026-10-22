from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Status = Literal["not_started", "learning", "learned", "review"]


class PointSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    kind: str
    sort_order: int


class SectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    sort_order: int
    knowledge_points: list[PointSummary]


class ChapterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    sort_order: int
    verified: bool
    sections: list[SectionOut]


class VolumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    sort_order: int
    chapters: list[ChapterOut]


class PointDetail(BaseModel):
    id: str
    title: str
    kind: str
    formula: str | None
    section_id: str
    section_title: str
    chapter_id: str
    chapter_title: str
    volume_title: str
    status: Status
    note: str
    note_updated_at: datetime | None


class StatusUpdate(BaseModel):
    status: Status


class NoteUpdate(BaseModel):
    content: str = Field(max_length=100_000)
