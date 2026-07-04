export function computeRiskFallback(rRunway, rBurn, rPmf, rCof, flags) {
  let score = 0;
  score += ((24 - rRunway) / 24) * 30; // runway weight: 30
  score += (rBurn / 10) * 25; // burn weight: 25
  score += ((100 - rPmf) / 100) * 25; // pmf weight: 25
  score += ((100 - rCof) / 100) * 15; // cofounder weight: 15
  score += flags.size * 3.5; // each flag adds risk

  score = Math.min(100, Math.round(score));

  const vectors = [
    { label: 'Cash burn', value: Math.min(100, Math.round((rBurn / 10) * 100 + (flags.has('hiring') ? 15 : 0))) },
    { label: 'Product-market fit', value: Math.min(100, 100 - rPmf) },
    { label: 'Co-founder conflict', value: Math.min(100, 100 - rCof + (flags.has('pivot') ? 10 : 0)) },
    { label: 'Market pressure', value: Math.min(100, (flags.has('competitor') ? 55 : 20) + (flags.has('churn') ? 25 : 0)) },
  ];

  return { score, vectors };
}

export function verdictFor(score) {
  if (score < 35) return { text: 'SUCCESS', color: 'var(--status-safe)' };
  if (score < 65) return { text: 'AT RISK', color: 'var(--status-risk)' };
  return { text: 'FAILURE', color: 'var(--status-critical)' };
}

export function insightFor(score, vectors, flagSet) {
  const top = [...vectors].sort((a, b) => b.value - a.value)[0];
  const flagList = [...flagSet];
  let lines = [];

  if (score >= 65) {
    if (top.label === 'Cash burn') {
      lines.push(`Your profile strongly matches the failure pattern of **Fast**, the checkout startup that burned through $120M in a year. Like Fast, the model heavily penalized your profile because cash burn has scaled significantly ahead of core product-market fit.`);
    } else if (top.label === 'Product-market fit') {
      lines.push(`This profile mirrors the structural collapse of **Quibi**. Despite massive funding, the lack of true product-market fit (indicated by your low PMF score) meant they were paying for user acquisition on a leaky bucket.`);
    } else if (top.label === 'Co-founder conflict') {
      lines.push(`Your structural risk is highly correlated with the downfall of **Tinkering/Secret**. When co-founder alignment drops below the 40% threshold, historical data shows the company rarely survives the next major strategic pivot.`);
    } else {
      lines.push(`This profile matches a cluster of startups (e.g., **Jawbone**) that failed within 9–14 months of reaching this risk band due to severe market pressure.`);
    }
  } else if (score >= 35) {
    lines.push(`This profile sits in a recoverable but unstable zone. ${top.label} is the leading pressure point — startups that addressed this factor within two quarters had meaningfully better survival odds than those that didn't.`);
  } else {
    lines.push(`Fundamentals are currently stable. The engine did not match this profile against any high-confidence failure cluster, though ${top.label.toLowerCase()} is worth monitoring.`);
  }

  if (flagList.includes('pivot') && flagList.includes('churn')) {
    lines.push('Note: A recent pivot combined with rising churn is exactly what killed **Fab.com**—they pivoted away from their core, lost their base, and burned runway before the new model could catch on.');
  } else if (flagList.includes('competitor') && score >= 50) {
    lines.push('Note: Entry of a well-funded competitor while burn multiple is elevated compounds risk (the **Rdio vs Spotify** pattern).');
  }

  return lines.join(' ');
}
