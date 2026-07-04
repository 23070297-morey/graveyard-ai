export const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000/api';

export const GRAVEYARD_CASES = [
  { id: 'GA-0142', name: 'Case: The Premature Scale', cod: 'Cause of death: Overhiring before PMF', desc: 'Grew headcount 4x in six months chasing a growth metric that never converted to retained revenue. Burn outpaced any realistic fundraising timeline.', tags: ['Cash burn', 'Series A'] },
  { id: 'GA-0089', name: 'Case: The Silent Pivot', cod: 'Cause of death: Fractured founding team', desc: 'A strategic pivot was pushed through without full co-founder buy-in. The product shipped, but internal misalignment stalled every decision after.', tags: ['Co-founder conflict', 'Seed'] },
  { id: 'GA-0207', name: 'Case: The Copycat Race', cod: 'Cause of death: Undifferentiated market entry', desc: 'Entered a category days after a well-funded competitor announced the same thesis. Lost the acquisition-cost race within two quarters.', tags: ['Market pressure', 'Pre-seed'] },
  { id: 'GA-0033', name: 'Case: The Feature Treadmill', cod: 'Cause of death: No product-market fit', desc: 'Shipped every requested feature but never found a segment willing to pay. Roadmap complexity grew while the core value prop stayed unproven.', tags: ['PMF', 'Bootstrapped'] },
  { id: 'GA-0176', name: 'Case: The Runway Miscalculation', cod: 'Cause of death: Cash burn', desc: 'Fundraising delays met an accelerating burn multiple. The team saw the wall coming three months out but had no lever left to pull.', tags: ['Cash burn', 'Series A'] },
  { id: 'GA-0058', name: 'Case: The Churn Spiral', cod: 'Cause of death: Retention collapse', desc: 'Acquisition kept growing even as monthly churn crossed 12%. Growth spend masked a leaking core product for two full quarters.', tags: ['Retention', 'Seed'] },
];
