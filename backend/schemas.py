from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class IntakeRequest(BaseModel):
    startup_name: Optional[str] = Field(default="Unnamed Startup")
    runway_months: float = Field(ge=0, le=60)
    burn_multiple: float = Field(ge=0, le=20)
    pmf_score: float = Field(ge=0, le=100)
    cofounder_alignment: float = Field(ge=0, le=100)
    months_since_funding: float = Field(default=6, ge=0, le=120)
    founder_experience_years: float = Field(default=3, ge=0, le=40)
    recent_pivot: bool = False
    rising_churn: bool = False
    overhired: bool = False
    new_competitor: bool = False
    postmortem_text: Optional[str] = None  # optional free text for Gemini


class VectorScore(BaseModel):
    label: str
    value: float


class DiagnosisResponse(BaseModel):
    case_code: str
    risk_score: float
    verdict: str
    vectors: List[VectorScore]
    insight: str
    model_version: str
    insight_source: str  # "gemini" or "template"
    created_at: datetime

    class Config:
        from_attributes = True


class CaseSummary(BaseModel):
    case_code: str
    startup_name: Optional[str]
    risk_score: float
    verdict: str
    created_at: datetime

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total_cases: int
    avg_risk_score: float
    verdict_breakdown: Dict[str, int]
