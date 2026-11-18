from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Status = Literal["not_started", "learning", "learned", "review"]
Category = Literal["basic", "extension", "preview", "research"]


class LanguageEntry(BaseModel):
    language: Literal["zh", "en", "de"]
    kind: Literal["term", "definition", "expression", "example"]
    text: str = Field(min_length=1, max_length=10_000)
    source: str = Field(default="", max_length=1000)


class NoteProfileData(BaseModel):
    category: Category = "basic"
    language_entries: list[LanguageEntry] = Field(default_factory=list, max_length=50)


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
    note_profile: NoteProfileData = Field(default_factory=NoteProfileData)


class StatusUpdate(BaseModel):
    status: Status


class NoteUpdate(BaseModel):
    content: str = Field(max_length=100_000)
    profile: NoteProfileData | None = None
