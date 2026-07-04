"""
Trains the Graveyard AI failure-risk model.

Honest note: there is no public internet access to Kaggle from this
environment, so this script generates a large synthetic dataset built
from documented, well-known startup failure research (CB Insights'
recurring failure categories: cash-out, no market need, poor team,
got outcompeted, poor product, pivot-gone-wrong). The generator encodes
realistic correlations between features and outcome so the model learns
genuine structure rather than memorizing noise.

Swap-in path for a real dataset: replace `generate_dataset()` with a
pd.read_csv() of an actual startup-outcomes dataset (e.g. Crunchbase
exports or a Kaggle startup-success CSV) that has the same column
names, and re-run this script. Nothing else needs to change.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
import joblib
import os

RNG = np.random.default_rng(42)
N = 6000

def generate_dataset(n=N):
    runway_months = RNG.uniform(0, 24, n)
    burn_multiple = RNG.uniform(0, 10, n)
    pmf_score = RNG.uniform(0, 100, n)
    cofounder_alignment = RNG.uniform(0, 100, n)
    recent_pivot = RNG.integers(0, 2, n)
    rising_churn = RNG.integers(0, 2, n)
    overhired = RNG.integers(0, 2, n)
    new_competitor = RNG.integers(0, 2, n)
    months_since_funding = RNG.uniform(0, 30, n)
    founder_experience_years = RNG.uniform(0, 20, n)

    # Latent risk score with realistic weighting + noise (mirrors CB Insights
    # top failure reasons: cash-out ~38%, no market need ~35%, team ~23%)
    risk = (
        (24 - runway_months) / 24 * 0.30
        + (burn_multiple / 10) * 0.22
        + (100 - pmf_score) / 100 * 0.24
        + (100 - cofounder_alignment) / 100 * 0.12
        + recent_pivot * 0.05
        + rising_churn * 0.06
        + overhired * 0.04
        + new_competitor * 0.05
        - (founder_experience_years / 20) * 0.08
        + RNG.normal(0, 0.08, n)
    )
    risk = np.clip(risk, 0, 1.4)

    # Outcome: failed within 18 months (binary), probabilistic on latent risk
    prob_fail = 1 / (1 + np.exp(-8 * (risk - 0.55)))
    failed = RNG.binomial(1, prob_fail)

    df = pd.DataFrame({
        "runway_months": runway_months,
        "burn_multiple": burn_multiple,
        "pmf_score": pmf_score,
        "cofounder_alignment": cofounder_alignment,
        "recent_pivot": recent_pivot,
        "rising_churn": rising_churn,
        "overhired": overhired,
        "new_competitor": new_competitor,
        "months_since_funding": months_since_funding,
        "founder_experience_years": founder_experience_years,
        "failed": failed,
    })
    return df

FEATURES = [
    "runway_months", "burn_multiple", "pmf_score", "cofounder_alignment",
    "recent_pivot", "rising_churn", "overhired", "new_competitor",
    "months_since_funding", "founder_experience_years",
]

def train():
    df = generate_dataset()
    X = df[FEATURES]
    y = df["failed"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier(
        n_estimators=180,
        max_depth=3,
        learning_rate=0.08,
        subsample=0.9,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, preds)
    auc = roc_auc_score(y_test, probs)

    print(f"Test accuracy: {acc:.4f}")
    print(f"Test ROC-AUC:  {auc:.4f}")
    print(classification_report(y_test, preds, target_names=["Survived", "Failed"]))

    importances = dict(zip(FEATURES, model.feature_importances_.round(4)))
    print("\nFeature importances:")
    for k, v in sorted(importances.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    out_dir = os.path.dirname(os.path.abspath(__file__))
    joblib.dump(model, os.path.join(out_dir, "risk_model.joblib"))
    print(f"\nModel saved to {out_dir}/risk_model.joblib")

if __name__ == "__main__":
    train()
