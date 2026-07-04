import os
import random
import string
from datetime import datetime, timezone
from typing import List

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import init_db, get_db, Case
from schemas import IntakeRequest, DiagnosisResponse, VectorScore, CaseSummary, StatsResponse
from gemini_service import generate_insight

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "risk_model.joblib")
MODEL_VERSION = "gbdt-v1-synthetic"

FEATURES = [
    "runway_months", "burn_multiple", "pmf_score", "cofounder_alignment",
    "recent_pivot", "rising_churn", "overhired", "new_competitor",
    "months_since_funding", "founder_experience_years",
]

app = FastAPI(title="Graveyard AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your deployed frontend origin before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None


@app.on_event("startup")
def startup():
    global model
    init_db()
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
    else:
        model = None  # /predict will raise a clear error rather than silently guessing


def make_case_code():
    year = datetime.now().year
    suffix = "".join(random.choices(string.digits, k=4))
    return f"GA-{year}-{suffix}"


def compute_vectors(payload: IntakeRequest) -> List[VectorScore]:
    cash_burn = min(100, payload.burn_multiple / 10 * 100 + (15 if payload.overhired else 0))
    pmf_risk = min(100, 100 - payload.pmf_score)
    cofounder_risk = min(100, (100 - payload.cofounder_alignment) + (10 if payload.recent_pivot else 0))
    market_pressure = min(100, (55 if payload.new_competitor else 20) + (25 if payload.rising_churn else 0))
    return [
        VectorScore(label="Cash burn", value=round(cash_burn, 1)),
        VectorScore(label="Product-market fit", value=round(pmf_risk, 1)),
        VectorScore(label="Co-founder conflict", value=round(cofounder_risk, 1)),
        VectorScore(label="Market pressure", value=round(market_pressure, 1)),
    ]


def verdict_for(score: float) -> str:
    if score < 35:
        return "SUCCESS"
    elif score < 65:
        return "AT RISK"
    return "FAILURE"


@app.get("/")
def root():
    return {
        "service": "Graveyard AI API",
        "status": "alive",
        "model_loaded": model is not None,
        "model_version": MODEL_VERSION,
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.query(func.count(Case.id)).scalar()
    except Exception:
        db_ok = False
    return {"status": "ok", "model_loaded": model is not None, "database_ok": db_ok}


@app.post("/predict", response_model=DiagnosisResponse)
def predict(payload: IntakeRequest, db: Session = Depends(get_db)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded on server.")

    row = pd.DataFrame([{
        "runway_months": payload.runway_months,
        "burn_multiple": payload.burn_multiple,
        "pmf_score": payload.pmf_score,
        "cofounder_alignment": payload.cofounder_alignment,
        "recent_pivot": int(payload.recent_pivot),
        "rising_churn": int(payload.rising_churn),
        "overhired": int(payload.overhired),
        "new_competitor": int(payload.new_competitor),
        "months_since_funding": payload.months_since_funding,
        "founder_experience_years": payload.founder_experience_years,
    }])[FEATURES]

    fail_probability = float(model.predict_proba(row)[0][1])
    risk_score = round(fail_probability * 100, 1)
    verdict = verdict_for(risk_score)
    vectors = compute_vectors(payload)
    top_vector = max(vectors, key=lambda v: v.value)

    flags = []
    if payload.recent_pivot: flags.append("pivot")
    if payload.rising_churn: flags.append("churn")
    if payload.overhired: flags.append("hiring")
    if payload.new_competitor: flags.append("competitor")

    insight_text, insight_source = generate_insight(
        top_vector.label, risk_score, flags, payload.postmortem_text
    )

    case_code = make_case_code()
    db_case = Case(
        case_code=case_code,
        startup_name=payload.startup_name,
        runway_months=payload.runway_months,
        burn_multiple=payload.burn_multiple,
        pmf_score=payload.pmf_score,
        cofounder_alignment=payload.cofounder_alignment,
        months_since_funding=payload.months_since_funding,
        founder_experience_years=payload.founder_experience_years,
        recent_pivot=int(payload.recent_pivot),
        rising_churn=int(payload.rising_churn),
        overhired=int(payload.overhired),
        new_competitor=int(payload.new_competitor),
        risk_score=risk_score,
        verdict=verdict,
        vectors=[v.dict() for v in vectors],
        insight=insight_text,
        model_version=MODEL_VERSION,
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)

    return DiagnosisResponse(
        case_code=case_code,
        risk_score=risk_score,
        verdict=verdict,
        vectors=vectors,
        insight=insight_text,
        model_version=MODEL_VERSION,
        insight_source=insight_source,
        created_at=db_case.created_at,
    )


@app.get("/cases", response_model=List[CaseSummary])
def list_cases(limit: int = 20, db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).limit(limit).all()
    return cases


@app.get("/cases/{case_code}")
def get_case(case_code: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_code == case_code).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return {
        "case_code": case.case_code,
        "startup_name": case.startup_name,
        "risk_score": case.risk_score,
        "verdict": case.verdict,
        "vectors": case.vectors,
        "insight": case.insight,
        "model_version": case.model_version,
        "created_at": case.created_at,
        "inputs": {
            "runway_months": case.runway_months,
            "burn_multiple": case.burn_multiple,
            "pmf_score": case.pmf_score,
            "cofounder_alignment": case.cofounder_alignment,
            "months_since_funding": case.months_since_funding,
            "founder_experience_years": case.founder_experience_years,
            "recent_pivot": bool(case.recent_pivot),
            "rising_churn": bool(case.rising_churn),
            "overhired": bool(case.overhired),
            "new_competitor": bool(case.new_competitor),
        },
    }


@app.get("/stats", response_model=StatsResponse)
def stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Case.id)).scalar() or 0
    avg_score = db.query(func.avg(Case.risk_score)).scalar() or 0.0
    breakdown = dict(
        db.query(Case.verdict, func.count(Case.id)).group_by(Case.verdict).all()
    )
    return StatsResponse(
        total_cases=total,
        avg_risk_score=round(avg_score, 1),
        verdict_breakdown=breakdown,
    )
