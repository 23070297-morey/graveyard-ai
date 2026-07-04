export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="case-number">AI-POWERED RISK PREDICTION</div>
        <h1>
          Predict your startup's <em>success</em>
          <br />
          before you launch.
        </h1>
        <p className="hero-sub">
          Graveyard AI is a predictive intelligence engine for startups. Feed it a founder's pitch, cash-burn data, and team signals — it cross-references historical failure patterns and returns a live risk analysis before the issues become fatal.
        </p>
        <div className="hero-actions">
          <a href="#analyzer" className="btn btn-primary">
            Diagnose a Startup →
          </a>
          <a href="#architecture" className="btn btn-ghost">
            View Architecture
          </a>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="num">90<span>%</span></div>
            <div className="lbl">Startups that fail</div>
          </div>
          <div className="stat">
            <div className="num">4</div>
            <div className="lbl">Core failure vectors modeled</div>
          </div>
          <div className="stat">
            <div className="num">&lt;2<span>s</span></div>
            <div className="lbl">Time to risk score</div>
          </div>
          <div className="stat">
            <div className="num">0</div>
            <div className="lbl">Founders repeating your mistakes</div>
          </div>
        </div>
      </div>
    </section>
  );
}
