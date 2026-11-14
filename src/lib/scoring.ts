import type { Investigation, Range } from './types';
import { insights, investigations } from './data';
import { psiToAtm, type Scenario } from './scenarios';

// ---------------------------------------------------------------------------
// Scenario relevance score (0–100). Fully transparent:
//   score = 100 × Σ(wᵢ·sᵢ) / Σwᵢ
//   s_O2, s_P, s_flow : how close the scenario value is to the range the investigation actually tested
//                       1 inside the tested range, exp(−distance/scale) outside it, where
//                       scale = max(base scale, 25% of the habitat value) so extreme habitats (100% O₂)
//                       still credit the experiments that came closest,
//                       0.25 when the investigation's table has no value for that variable ("unknown")
//   s_role            : fire-safety tier (Core 1.0 / Strong 0.7 / Background 0.4) + 0.2 if its role
//                       matches the scenario's priorities (capped at 1)
//   s_data            : data richness = 0.7·log10(1+tests)/log10(1+700) + 0.15·has test matrix + 0.15·has analyzed data
// ---------------------------------------------------------------------------

export interface Weights { o2: number; pressure: number; flow: number; role: number; data: number }
export const DEFAULT_WEIGHTS: Weights = { o2: 30, pressure: 20, flow: 15, role: 20, data: 15 };
export const SCALES = { o2: 0.05, pAtm: 0.25, flow: 10 };
export const UNKNOWN = 0.25;

export interface ScoreParts { o2: number; pressure: number; flow: number; role: number; data: number; known: { o2: boolean; pressure: boolean; flow: boolean } }
export interface Scored { inv: Investigation; score: number; parts: ScoreParts }

export function rangeMatch(value: number, r: Range, baseScale: number): { s: number; known: boolean } {
  if (!r) return { s: UNKNOWN, known: false };
  const scale = Math.max(baseScale, 0.25 * Math.abs(value));
  const lo = Math.min(r[0], r[1]), hi = Math.max(r[0], r[1]);
  if (value >= lo && value <= hi) return { s: 1, known: true };
  const d = value < lo ? lo - value : value - hi;
  return { s: Math.exp(-d / scale), known: true };
}

export function roleScore(inv: Investigation, sc: Scenario): number {
  const base = inv.tier === 1 ? 1 : inv.tier === 2 ? 0.7 : 0.4;
  return Math.min(1, base + (sc.roleBoost.includes(inv.roleGroup) ? 0.2 : 0));
}

export function dataScore(inv: Investigation): number {
  const n = inv.count && !inv.count.notTests ? inv.count.count : 0;
  return Math.min(1, 0.7 * Math.log10(1 + n) / Math.log10(1 + 700) + (inv.hasTestMatrix ? 0.15 : 0) + (inv.hasAnalyzedData ? 0.15 : 0));
}

export function scoreInvestigation(inv: Investigation, sc: Scenario, w: Weights): Scored {
  const o2 = rangeMatch(sc.o2, inv.envelope.o2, SCALES.o2);
  const p = rangeMatch(psiToAtm(sc.psi), inv.envelope.pAtm, SCALES.pAtm);
  const f = rangeMatch(sc.flow, inv.envelope.flow, SCALES.flow);
  // When the habitat's fan-push and oxygen both sit in the tested window, credit flow harder
  // so ventilation-matched studies (SAFFIRE-style) rise above O₂/pressure-only matches.
  let flowPart = f.s;
  if (o2.known && f.known && o2.s >= 0.85 && f.s >= 0.85) {
    flowPart = Math.min(1, f.s + 0.12);
  } else if (f.known && sc.flow >= 8 && f.s >= 0.7) {
    flowPart = Math.min(1, f.s + 0.06);
  }
  const parts: ScoreParts = { o2: o2.s, pressure: p.s, flow: flowPart, role: roleScore(inv, sc), data: dataScore(inv), known: { o2: o2.known, pressure: p.known, flow: f.known } };
  const tot = w.o2 + w.pressure + w.flow + w.role + w.data || 1;
  const score = (100 * (w.o2 * parts.o2 + w.pressure * parts.pressure + w.flow * parts.flow + w.role * parts.role + w.data * parts.data)) / tot;
  return { inv, score, parts };
}

export const weightsFor = (sc: Scenario): Weights => sc.weights ?? DEFAULT_WEIGHTS;

export function rankForScenario(sc: Scenario, w: Weights = weightsFor(sc)): Scored[] {
  return investigations.map(i => scoreInvestigation(i, sc, w)).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Recommendations: each line is computed from the data and cites its experiments.
// ---------------------------------------------------------------------------
export interface Recommendation { title: string; text: string; cites: string[] }

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export function recommendations(sc: Scenario): Recommendation[] {
  const recs: Recommendation[] = [];
  const atm = psiToAtm(sc.psi);
  const flexDil = insights.flex.byDiluent;
  const none = flexDil.find(d => d.group.startsWith('No'));
  const co2 = flexDil.find(d => d.group.startsWith('CO2'));
  const he = flexDil.find(d => d.group.startsWith('Helium'));
  const cfig = insights.cfig.byO2;
  const nRow = (bin: string) => cfig.find(r => r.bin === bin);
  const bassMax = insights.bass.o2Range[1];
  const saff = insights.saffire2;
  const sibal = saff.filter(s => /SIBAL/i.test(s.material));
  const silicone = saff.filter(s => /Silicone/i.test(s.material));

  if (sc.o2 > 0.23) {
    recs.push({
      title: 'Re-screen cabin materials at the real oxygen level',
      text: `BASS-II tested solid materials only up to ${bassMax}% O₂, below this scenario's ${Math.round(sc.o2 * 100)}%. Use ACME BRE (tested 21–40% O₂) and CFI-G (up to 85% O₂) as the evidence for oxygen-enriched cabins, and plan new solid-material tests at ${Math.round(sc.o2 * 100)}% O₂.`,
      cites: ['PSI-25', 'PSI-20', 'PSI-159'],
    });
    const lo = nRow('20–25%'), hi = nRow('35–45%');
    if (lo && hi) recs.push({
      title: 'Expect fires to start more easily',
      text: `In ACME CFI-G normal flames, ${hi.Normal_ign}% of tests at 35–45% O₂ reached hot ignition, compared with ${lo.Normal_ign}% at 20–25% O₂ (${hi.Normal_n} and ${lo.Normal_n} tests). Treat ignition sources (electronics, heaters) more strictly than on the ISS.`,
      cites: ['PSI-159'],
    });
  } else {
    recs.push({
      title: 'Keep using microgravity material data, not only Earth tests',
      text: `SAFFIRE-II compared microgravity burns with the 1-g screening test: ${silicone.length} silicone samples showed ~0 burn length in microgravity, while SIBAL fabric burned the full 29 cm at 20 cm/s airflow. Earth tests and orbit results do not always agree, so check both.`,
      cites: ['PSI-99', 'PSI-25', 'PSI-26'],
    });
  }
  if (none && co2 && he) recs.push({
    title: 'Choose suppressant gases backed by FLEX',
    text: `In FLEX, flames self-extinguished in ${pct(co2.Extinction, co2.total)}% of tests with CO₂ added (${co2.Extinction}/${co2.total}) and ${pct(he.Extinction, he.total)}% with helium (${he.Extinction}/${he.total}), versus ${pct(none.Extinction, none.total)}% with no CO₂/He (${none.Extinction}/${none.total}). Inert-gas flooding is a data-backed option for liquid-fuel fires.`,
    cites: ['PSI-69', 'PSI-68'],
  });
  recs.push({
    title: 'Manage airflow: ventilation feeds fires',
    text: `With airflow at 20 cm/s, the large SIBAL fabric sample in SAFFIRE-I burned for 420 s with the flow, and a SIBAL sample in SAFFIRE-II burned its full 29 cm${sibal.length > 0 ? ` (spread rate ${sibal[0].ugSpread})` : ''}. Plan for fans to shut down when a fire is detected so the flame is not fed fresh oxygen.`,
    cites: ['PSI-98', 'PSI-99', 'PSI-100', 'PSI-25'],
  });
  recs.push({
    title: 'Tune smoke detectors for low-gravity smoke',
    text: 'SAME and SAME-R measured smoke from Kapton, silicone, Teflon, lampwick and Pyrell in low gravity because smoke particles can grow differently than on Earth. Calibrate detectors with these particle measurements.',
    cites: ['PSI-102', 'PSI-101', 'PSI-47'],
  });
  if (sc.gravity !== 'micro') recs.push({
    title: 'Fill the partial-gravity gap',
    text: `PSI has no combustion tests in Moon or Mars gravity, so these results are extrapolated. ACME E-FIELD used electric fields to push flames somewhat like buoyancy does and is the closest proxy in the data. Partial-gravity tests should be a priority${atm < 0.75 ? ', especially at this lower pressure' : ''}.`,
    cites: ['PSI-22'],
  });
  return recs.slice(0, 5);
}
