import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

# DB_PATH can be overridden (e.g. to a mounted volume path in Docker) so data
# survives container restarts. Defaults to a local file for plain `uvicorn` runs.
DB_PATH = os.environ.get("DB_PATH", "./graveyard.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_code = Column(String, unique=True, index=True)
    startup_name = Column(String, nullable=True)

    # inputs
    runway_months = Column(Float)
    burn_multiple = Column(Float)
    pmf_score = Column(Float)
    cofounder_alignment = Column(Float)
    months_since_funding = Column(Float)
    founder_experience_years = Column(Float)
    recent_pivot = Column(Integer)
    rising_churn = Column(Integer)
    overhired = Column(Integer)
    new_competitor = Column(Integer)

    # outputs
    risk_score = Column(Float)
    verdict = Column(String)
    vectors = Column(JSON)
    insight = Column(String)
    model_version = Column(String)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
