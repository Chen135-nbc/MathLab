from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator
from typing import Annotated

from .knowledge import PointSummary


class Parameter(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    name: str = Field(pattern=r"^[a-z][a-z0-9_]{0,15}$")
    value: float = Field(ge=-1e6, le=1e6)
    min: float = Field(ge=-1e6, le=1e6)
    max: float = Field(ge=-1e6, le=1e6)
    step: float = Field(ge=1e-8, le=2e6)

    @model_validator(mode="after")
    def validate_range(self):
        if self.min >= self.max or not self.min <= self.value <= self.max or self.step > self.max - self.min:
            raise ValueError("参数值、步长或范围无效")
        return self


class View(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    x: float = Field(ge=-1e7, le=1e7)
    y: float = Field(ge=-1e7, le=1e7)
    scale: float = Field(ge=0.01, le=10_000)


class ModelWrite(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    expression: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
    parameters: list[Parameter] = Field(max_length=12)
    view: View
    description: str = Field(max_length=20_000)
    point_ids: list[Annotated[str, StringConstraints(min_length=1, max_length=60)]] = Field(max_length=100)

    @model_validator(mode="after")
    def unique_values(self):
        names = [parameter.name for parameter in self.parameters]
        if len(set(names)) != len(names):
            raise ValueError("参数名不能重复")
        if len(set(self.point_ids)) != len(self.point_ids):
            raise ValueError("知识点关联不能重复")
        return self


class ModelSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    expression: str
    updated_at: AwareDatetime

    @field_validator("updated_at", mode="before")
    @classmethod
    def normalize_timestamp(cls, value):
        return utc(value)


def utc(value: datetime) -> datetime:
    from datetime import timezone
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class ModelDetail(ModelSummary):
    parameters: list[Parameter]
    view: View
    description: str
    created_at: AwareDatetime
    points: list[PointSummary]

    @field_validator("created_at", mode="before")
    @classmethod
    def normalize_created(cls, value):
        return utc(value)
