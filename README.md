# Graveyard AI — Post-Mortem Intelligence for Startups

A full-stack hackathon build: real trained ML model, real FastAPI backend,
real SQLite database, real frontend wired to real API calls.

## What's actually real here (and what isn't)

Being direct about this now so it doesn't surprise you on stage:

**Real:**
- A gradient-boosted classifier (`scikit-learn`), trained and evaluated with
  a held-out test set — 69% accuracy, 0.76 ROC-AUC. Genuine, reproducible numbers.
- A live FastAPI backend with 6 working endpoints, tested end to end.
- A SQLite database that persists every diagnosis with full input/output history.
- A frontend that calls the real API, shows live connection status, and falls
  back gracefully (clearly labeled as offline mode) if the backend is down.

**Not real yet — and here's exactly what to say if a judge asks:**
- **Training data is synthetic.** There's no public internet access to Kaggle
  from the build environment, so `train_model.py` generates a large synthetic
  dataset built from documented startup-failure research (CB Insights' top
  failure categories: cash-out, no market need, team conflict, competition).
  The correlations are realistic and the model learns genuine structure, but
  it is not trained on real company outcomes. **Swap-in path:** replace
  `generate_dataset()` in `train_model.py` with `pd.read_csv()` of any real
  startup-outcomes dataset using the same column names, rerun the script —
  nothing else changes.
- **Gemini isn't live by default.** The code in `gemini_service.py` is a
  complete, working integration — it just needs a `GEMINI_API_KEY` env var
  and normal internet access (both unavailable in the build sandbox). Without
  a key it automatically falls back to a template-based insight generator,
  and the API response honestly reports which one was used
  (`insight_source: "gemini"` or `"template"`) — it never pretends.
- **Not deployed to a public URL.** This runs locally / in Docker. Deploying
  to Cloud Run or Firebase Hosting is a real step you still need to do before
  judging — see below.
- **XGBoost vs. scikit-learn GBDT:** the original pitch mentioned XGBoost. I
  used `scikit-learn`'s `GradientBoostingClassifier` instead — same algorithm
  family, functionally equivalent for this dataset size, but with a much
  lighter dependency footprint (XGBoost pulled in a ~400MB GPU toolchain that
  isn't needed for CPU inference and risks a slow/failed install on
  hackathon wifi at 5am). If judges ask why: this was a deliberate
  engineering tradeoff for reliability under time pressure, not a shortcut.

None of this is a flaw to hide — "we know exactly where the real system ends
and the placeholder begins" is a stronger answer to a technical judge than
pretending everything is production-grade.

## Project structure

```
graveyard-ai/
├── backend/
│   ├── main.py              # FastAPI app — all endpoints
│   ├── database.py          # SQLAlchemy models + SQLite setup
│   ├── schemas.py           # Pydantic request/response models
│   ├── gemini_service.py    # Gemini integration + template fallback
│   ├── train_model.py       # Generates dataset + trains the model
│   ├── risk_model.joblib    # Pre-trained model (already built)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── index.html           # Full site, wired to the backend API
├── docker-compose.yml
└── README.md
```

## Run it locally (fastest path, no Docker)

```bash
cd backend
pip install -r requirements.txt
python train_model.py          # optional — risk_model.joblib is already included
uvicorn main:app --reload --port 8000
```

Then open `frontend/index.html` directly in a browser (double-click it, or
`python3 -m http.server 5500` from the `frontend/` folder and visit
`http://localhost:5500`). The page will detect the backend automatically —
watch the small status dot under "Run your own autopsy."

To point the frontend at a different backend URL (e.g. after deploying),
open `frontend/index.html` and set this near the top of the `<script>` tag,
or inject it before the script loads:
```html
<script>window.GRAVEYARD_API_BASE = "https://your-deployed-backend-url";</script>
```

## Run it with Docker

```bash
docker compose up --build
```
Backend will be live at `http://localhost:8000`. Data persists in a named
Docker volume (`graveyard_data`) across restarts.

To enable live Gemini calls, set the key before starting:
```bash
export GEMINI_API_KEY="your-key-here"
docker compose up --build
```

## Deploying for the actual judging (do this before demo time)

**Backend → Google Cloud Run** (fits the "Google ecosystem" judging criteria
directly):
```bash
gcloud run deploy graveyard-ai-backend \
  --source ./backend \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your-key-here
```
Note: Cloud Run's default filesystem is ephemeral, so the SQLite file resets
on every new instance/deploy. Fine for a demo; for anything longer-lived,
swap `DATABASE_URL` in `database.py` for a Cloud SQL Postgres instance —
the SQLAlchemy models don't need to change, just the connection string.

**Frontend → Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase init hosting   # point public dir to ./frontend
firebase deploy
```
Before deploying, set `window.GRAVEYARD_API_BASE` in `index.html` to your
Cloud Run URL.

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Service status + model load check |
| GET | `/health` | Backend + DB health check |
| POST | `/predict` | Run a diagnosis, saves to DB, returns full report |
| GET | `/cases?limit=20` | List recent cases |
| GET | `/cases/{case_code}` | Full detail for one case |
| GET | `/stats` | Aggregate stats across all cases |

Interactive API docs (auto-generated by FastAPI) are available at
`/docs` once the backend is running — genuinely useful to show judges live.

## Honest remaining limitations for a live production system

- SQLite is fine for a demo and even moderate real traffic, but a genuine
  multi-user production deploy should move to Postgres (Cloud SQL) —
  concurrent writes to SQLite under real load will eventually serialize/lock.
- No authentication on any endpoint — anyone with the URL can submit or read
  cases. Fine for a hackathon demo, not fine beyond that.
- The model's synthetic training data means its absolute risk percentages
  are illustrative, not calibrated probabilities from real outcomes — be
  precise about this distinction if asked, rather than calling it "96%
  accurate" or similar.
