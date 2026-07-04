import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/constants';
import { computeRiskFallback, verdictFor, insightFor } from '../utils/scoring';

export default function Analyzer() {
  const [apiOnline, setApiOnline] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking backend connection…');
  const [recentCases, setRecentCases] = useState([]);

  // Form State
  const [startupName, setStartupName] = useState('');
  const [startupPitch, setStartupPitch] = useState('');
  const [runway, setRunway] = useState(6);
  const [burn, setBurn] = useState(3.0);
  const [pmf, setPmf] = useState(35);
  const [cofounder, setCofounder] = useState(55);
  const [flags, setFlags] = useState(new Set());

  // Report State
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState(null); // null means empty state

  useEffect(() => {
    async function checkApi() {
      try {
        const res = await fetch(`${API_BASE}/`, { method: 'GET' });
        if (!res.ok) throw new Error('bad status');
        setApiOnline(true);
        setStatusMessage('Backend connected — live model + database active');
        loadRecentCases();
      } catch (e) {
        setApiOnline(false);
        setStatusMessage('Backend unreachable — running on local fallback scoring (no data will be saved)');
      }
    }
    checkApi();
  }, []);

  async function loadRecentCases() {
    try {
      const res = await fetch(`${API_BASE}/cases?limit=8`);
      const cases = await res.json();
      setRecentCases(cases);
    } catch (e) {
      // silent
    }
  }

  const toggleFlag = (flag) => {
    setFlags((prev) => {
      const newFlags = new Set(prev);
      if (newFlags.has(flag)) newFlags.delete(flag);
      else newFlags.add(flag);
      return newFlags;
    });
  };

  const getPmfLabel = (v) => (v < 30 ? 'Weak' : v < 60 ? 'Emerging' : v < 80 ? 'Solid' : 'Strong');
  const getCofounderLabel = (v) => (v < 30 ? 'Fractured' : v < 60 ? 'Moderate' : v < 80 ? 'Aligned' : 'Locked-in');

  const runDiagnosis = async () => {
    setIsRunning(true);

    const payload = {
      startup_name: startupName || 'Unnamed Startup',
      runway_months: runway,
      burn_multiple: burn,
      pmf_score: pmf,
      cofounder_alignment: cofounder,
      recent_pivot: flags.has('pivot'),
      rising_churn: flags.has('churn'),
      overhired: flags.has('hiring'),
      new_competitor: flags.has('competitor'),
      postmortem_text: startupPitch,
    };

    if (apiOnline) {
      try {
        const res = await fetch(`${API_BASE}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('predict failed');
        const data = await res.json();
        const verdictColor = data.verdict === 'FAILURE' ? 'var(--status-critical)' : data.verdict === 'AT RISK' ? 'var(--status-risk)' : 'var(--status-safe)';
        
        setReport({
          caseCode: data.case_code,
          score: data.risk_score,
          verdictText: data.verdict,
          verdictColor,
          vectors: data.vectors,
          insight: data.insight,
          insightSource: data.insight_source,
          dateStr: new Date(data.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          fromBackend: true,
        });
        loadRecentCases();
        setIsRunning(false);
        return;
      } catch (e) {
        // Fallthrough to local fallback
      }
    }

    // Local Fallback
    const { score, vectors } = computeRiskFallback(runway, burn, pmf, cofounder, flags);
    const verdict = verdictFor(score);
    const insight = insightFor(score, vectors, flags);
    const now = new Date();
    const caseId = 'LOCAL-' + String(Math.floor(Math.random() * 9000) + 1000);

    setReport({
      caseCode: caseId,
      score,
      verdictText: verdict.text,
      verdictColor: verdict.color,
      vectors,
      insight,
      insightSource: 'template',
      dateStr: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      fromBackend: false,
    });
    setIsRunning(false);
  };

  return (
    <section className="section" id="analyzer">
      <div className="container">
        <div className="eyebrow">Live Demo</div>
        <h2 className="section-title">Run your own autopsy.</h2>
        <p className="section-desc">
          Move the sliders to match your startup's current state and submit. This calls a live FastAPI backend running a trained gradient-boosted model, and every case is saved to a real database below.
        </p>
        <p className={`api-status ${apiOnline ? 'online' : 'offline'}`}>
          <span className="dot"></span> {statusMessage}
        </p>

        <div className="analyzer-wrap">
          <div className="intake-form">
            <div className="field">
              <label>Startup name</label>
              <input
                type="text"
                placeholder="e.g. Acme Rockets"
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Startup Pitch / Idea Description</label>
              <textarea
                placeholder="Describe what your startup does, who it's for, and how it works..."
                value={startupPitch}
                onChange={(e) => setStartupPitch(e.target.value)}
              ></textarea>
            </div>
            <div className="field">
              <label>
                Runway remaining <span className="val">{runway} months</span>
              </label>
              <input
                type="range"
                min="0"
                max="24"
                value={runway}
                onChange={(e) => setRunway(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>
                Monthly burn multiple <span className="val">{burn.toFixed(1)}x revenue</span>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={burn}
                onChange={(e) => setBurn(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>
                Product-market fit signal <span className="val">{getPmfLabel(pmf)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={pmf}
                onChange={(e) => setPmf(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>
                Co-founder alignment <span className="val">{getCofounderLabel(cofounder)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={cofounder}
                onChange={(e) => setCofounder(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Additional risk flags</label>
              <div className="checks">
                {[
                  { id: 'pivot', label: 'Recent pivot' },
                  { id: 'churn', label: 'Rising churn' },
                  { id: 'hiring', label: 'Overhired' },
                  { id: 'competitor', label: 'New well-funded competitor' },
                ].map((f) => (
                  <div
                    key={f.id}
                    className={`check-pill ${flags.has(f.id) ? 'active' : ''}`}
                    onClick={() => toggleFlag(f.id)}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
            <button className="run-btn" onClick={runDiagnosis} disabled={isRunning}>
              {isRunning ? 'Running diagnosis…' : 'Run Diagnosis'}
            </button>
          </div>

          <div className="report">
            {!report ? (
              <div className="report-empty">
                <div className="glyph">⚰</div>
                <p>No case filed yet. Adjust the intake form and run a diagnosis to generate a live autopsy report.</p>
              </div>
            ) : (
              <>
                <div className="report-head">
                  <div className="rt">Autopsy Report</div>
                  <div className="rd">
                    CASE NO. {report.caseCode}
                    <br />
                    {report.dateStr}
                  </div>
                </div>
                <div className="verdict-row">
                  <div className="verdict-stamp" style={{ color: report.verdictColor }}>
                    PREDICTED OUTCOME: {report.verdictText}
                  </div>
                  <div className="verdict-meta">
                    <b>Probability of Failure: {report.score}%</b>
                    <br />
                    {report.fromBackend
                      ? 'Scored by live gradient-boosted model'
                      : 'Scored by local fallback formula (offline mode)'}
                  </div>
                </div>
                <div className="report-section">
                  <h4>Gradient-Boosted Feature Importance</h4>
                  <p style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px'}}>
                    * The mathematical weights our model assigned to your inputs when calculating your probability of failure.
                  </p>
                  {report.vectors.map((v) => (
                    <div className="vector-row" key={v.label}>
                      <div className="vector-label">{v.label}</div>
                      <div className="vector-bar">
                        <div className="vector-fill" style={{ width: `${v.value}%` }}></div>
                      </div>
                      <div className="vector-pct">{v.value}%</div>
                    </div>
                  ))}
                </div>
                <div className="report-section">
                  <h4>
                    {report.insightSource === 'gemini' ? 'Gemini: Historical Precedent Match' : 'Pattern Library: Historical Match'}
                  </h4>
                  <div className="insight-block">{report.insight}</div>
                </div>
                <div className="sig">
                  <span>
                    {report.fromBackend
                      ? 'Saved to database · Graveyard AI Engine v1'
                      : 'Not saved — backend offline'}
                  </span>
                  <span>Not investment advice</span>
                </div>
              </>
            )}
          </div>
        </div>

        {recentCases.length > 0 && (
          <div className="recent-cases" style={{ marginTop: 56 }}>
            <h4
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--slate)',
                borderBottom: '1px solid var(--line)',
                paddingBottom: 12,
                marginBottom: 16,
              }}
            >
              Recent cases in the database
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {recentCases.map((c) => (
                <div key={c.case_code} style={{ border: '1px solid var(--line)', padding: 14, fontSize: 12 }}>
                  <div style={{ color: 'var(--amber)', fontSize: 10, letterSpacing: '0.06em' }}>
                    {c.case_code}
                  </div>
                  <div style={{ color: 'var(--paper)', fontWeight: 600, margin: '6px 0' }}>
                    {c.startup_name || 'Unnamed'}
                  </div>
                  <div
                    style={{
                      color:
                        c.verdict === 'FAILURE'
                          ? 'var(--status-critical)'
                          : c.verdict === 'AT RISK'
                          ? 'var(--status-risk)'
                          : 'var(--status-safe)',
                      fontSize: 11,
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.verdict} · {c.risk_score}% FAIL PROBABILITY
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
