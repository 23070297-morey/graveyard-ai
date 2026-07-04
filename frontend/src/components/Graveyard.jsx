import { GRAVEYARD_CASES } from '../utils/constants';

export default function Graveyard() {
  return (
    <section className="section" id="graveyard">
      <div className="container">
        <div className="eyebrow">The Archive</div>
        <h2 className="section-title">Composite case files from the graveyard.</h2>
        <p className="section-desc">
          Anonymized, aggregated failure archetypes — not individual companies — used to train the pattern library. Each represents a recurring cause of death across hundreds of real post-mortems.
        </p>
        <div className="grave-grid">
          {GRAVEYARD_CASES.map((c) => (
            <div className="grave-card" key={c.id}>
              <div className="gid">{c.id}</div>
              <h3>{c.name}</h3>
              <div className="cod">{c.cod}</div>
              <p>{c.desc}</p>
              <div className="meta">
                {c.tags.map((t, i) => (
                  <span key={t}>
                    {t}
                    {i < c.tags.length - 1 ? <span> · </span> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
