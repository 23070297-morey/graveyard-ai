export default function Architecture() {
  return (
    <section className="section" id="architecture">
      <div className="container">
        <div className="eyebrow">System Architecture</div>
        <h2 className="section-title">Three layers. One intelligence pipeline.</h2>
        <p className="section-desc">
          Built on Google Cloud infrastructure end to end — from ingestion to prediction to the founder-facing report.
        </p>
        <div className="arch-grid">
          <div className="arch-card">
            <div className="arch-num">01 / Predictive Engine</div>
            <h3>Failure-risk model</h3>
            <p>
              A gradient-boosted classifier trained on a proprietary dataset of 400+ failed startups, aggregated from CB Insights post-mortems, Autopsy.io, TechCrunch teardowns, and SEC filings. It scores runtime metrics against proven historical failure patterns.
            </p>
            <div className="stack">
              <span className="chip">Gradient Boosting</span>
              <span className="chip">Historical Data</span>
              <span className="chip">Python</span>
            </div>
          </div>
          <div className="arch-card">
            <div className="arch-num">02 / Intelligence Layer</div>
            <h3>Gemini extraction</h3>
            <p>
              Unstructured input — post-mortem write-ups, scanned decks — gets OCR'd and passed to Gemini, which extracts named failure vectors and drafts a plain-language insight block.
            </p>
            <div className="stack">
              <span className="chip">Gemini API</span>
              <span className="chip">OCR</span>
              <span className="chip">Structured JSON</span>
            </div>
          </div>
          <div className="arch-card">
            <div className="arch-num">03 / Infrastructure</div>
            <h3>Realtime + scale</h3>
            <p>
              Firebase handles auth, realtime sync, and hosting, so every diagnosis is saved to a founder's case history and the platform scales from a single hackathon demo to production traffic.
            </p>
            <div className="stack">
              <span className="chip">Firebase</span>
              <span className="chip">Firestore</span>
              <span className="chip">Cloud Run</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
