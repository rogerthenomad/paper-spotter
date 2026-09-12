from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Label = Literal["human", "mixed", "ai", "unavailable", "error"]


class EngineResult(BaseModel):
    name: str
    family: str
    available: bool = True
    label: Label = "unavailable"
    ai_score: float | None = Field(
        default=None, description="0 = human-like, 1 = AI-like. None if the engine could not run."
    )
    detail: dict[str, Any] = Field(default_factory=dict)
    skipped_reason: str | None = None
    citation: str | None = None
    repo: str | None = None


class WindowScore(BaseModel):
    index: int
    start_word: int
    end_word: int
    text_preview: str
    ai_score: float | None = None
    label: Label = "mixed"
    engine_scores: dict[str, float] = Field(default_factory=dict)


class ScanReport(BaseModel):
    source: str
    word_count: int
    sentence_count: int
    engines_run: list[str]
    engines_skipped: list[str]
    results: list[EngineResult]
    windows: list[WindowScore] = Field(default_factory=list)
    ensemble_ai_score: float | None = None
    ensemble_label: Label = "unavailable"
    agreement: float | None = None
    warnings: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)

    def result_map(self) -> dict[str, EngineResult]:
        return {r.name: r for r in self.results}
