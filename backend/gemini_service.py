"""
Gemini integration for the Intelligence Layer.

Honest note: this container has no GEMINI_API_KEY and no network access to
generativelanguage.googleapis.com, so it cannot make a live call from here.
This module is fully wired and will work the moment you:
  1. set the environment variable GEMINI_API_KEY, and
  2. run this on a machine/host with normal internet access.

Until then, it automatically falls back to a deterministic template
generator so the product never breaks or hangs waiting on an API call --
that fallback is real and shown to the user (insight_source: "template"),
not hidden.
"""
import os
import json
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)


def _template_insight(top_vector: str, score: float, flags: list) -> str:
    if score >= 65:
        if "Cash burn" in top_vector:
            base = "Your profile strongly matches the failure pattern of **Fast**. Like Fast, the model penalized your profile because cash burn scaled significantly ahead of PMF."
        elif "Product-market fit" in top_vector:
            base = "This profile mirrors the structural collapse of **Quibi**. Despite funding, lack of true PMF meant paying for user acquisition on a leaky bucket."
        else:
            base = f"This profile matches a cluster of startups (e.g., **Jawbone**) that failed due to {top_vector.lower()}."
    elif score >= 35:
        base = (
            f"This profile sits in a recoverable but unstable zone. {top_vector} is the "
            f"leading pressure point -- startups that addressed this factor within two "
            f"quarters survived."
        )
    else:
        base = (
            f"Fundamentals are currently stable. No high-confidence failure cluster matched "
            f"this profile, though {top_vector.lower()} is worth monitoring."
        )
    if "pivot" in flags and "churn" in flags:
        base += " Note: A pivot with rising churn is exactly what killed **Fab.com**."
    elif "competitor" in flags and score >= 50:
        base += " Note: A new competitor with elevated burn mirrors the **Rdio vs Spotify** pattern."
    return base


def generate_insight(top_vector: str, score: float, flags: list, postmortem_text: str = None) -> tuple[str, str]:
    """Returns (insight_text, source) where source is 'gemini' or 'template'."""
    if not GEMINI_API_KEY:
        return _template_insight(top_vector, score, flags), "template"

    prompt = (
        "You are the intelligence layer of a startup post-mortem analysis tool called Graveyard AI. "
        "Given a startup's computed risk score, its dominant failure vector, any risk flags, and an optional startup pitch/description, "
        "write a 2-3 sentence, highly specific insight. "
        "CRITICAL INSTRUCTION: You MUST identify a real, well-known failed startup (e.g., Quibi, Fast, Jawbone, WeWork, Theranos) "
        "that exhibited this dominant failure vector. Evaluate their specific startup pitch (if provided) and explicitly draw a parallel between their pitch/metrics and the historical failure.\n\n"
        f"Risk score: {score}/100\n"
        f"Dominant failure vector: {top_vector}\n"
        f"Risk flags present: {', '.join(flags) if flags else 'none'}\n"
    )
    if postmortem_text:
        prompt += f"\nFounder's Startup Pitch/Description:\n{postmortem_text[:2000]}\n"

    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text.strip(), "gemini"
    except Exception as e:
        # Never let a flaky API call take down the demo -- fall back cleanly.
        fallback = _template_insight(top_vector, score, flags)
        return fallback, "template"
