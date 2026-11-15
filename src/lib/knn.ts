import { knnPool } from './data';
import { GRAVITY, psiToAtm } from './scenarios';
import type { Gravity, KnnTest } from './types';

// ---------------------------------------------------------------------------
// "Will It Burn?" model
//   1) k-NN over real NASA tests that record what the flame did (FLEX, ACME CFI-G, SAFFIRE-I/II).
//      Distance on normalized features:
//        O₂:        |Δ mole fraction| / 0.10
//        pressure:  |Δ ln(atm)| / ln 2        (a factor of 2 in pressure = 1 unit)
//        airflow:   |Δ cm/s| / 15             (0.5 when the test table has no flow value)
//        fuel:      0 same fuel · 1.0 same class (liquid/gas/solid) · 1.5 different class
//        diluent:   0.5 if CO₂/He choice differs from the test's atmosphere
//   2) Burn score of each test: 1 kept burning · 0.8 droplet disruption · 0.6 ignited then self-extinguished
//      · 0.5 partial · 0.25 flash · 0 no ignition / no spread  (see scripts/build-data.mjs)
//   3) Prediction = 80% weighted k-NN (k = 7, weight 1/(d+0.15)) + 20% simple physics prior
//      (prior weight rises to 50% when the inputs are outside the tested O₂ or pressure range)
//      (more O₂ → more flammable; buoyancy or forced flow feeds a flame; CO₂/He dilution suppresses).
//   Likely ≥ 0.62 · Borderline 0.38–0.62 · Unlikely < 0.38
// ---------------------------------------------------------------------------

export type Diluent = 'none' | 'CO2' | 'He';
export interface SimInput { fuel: string; o2: number; psi: number; flow: number; gravity: Gravity; diluent: Diluent }
export interface Neighbor { t: KnnTest; d: number; w: number }
export interface SimResult {
  verdict: 'Likely' | 'Borderline' | 'Unlikely';
  p: number; pData: number; prior: number; priorW: number;
  confidence: number; confidenceLabel: 'High' | 'Medium' | 'Low';
  /** Number of nearest NASA outcome tests behind the prediction (k). */
  nTests: number;
  /** Inclusive burn-score uncertainty band from neighbor spread + confidence. */
  band: [number, number];
  /** True when O₂, pressure, or gravity sit outside what PSI outcome tables cover. */
  beyondTested: boolean;
  neighbors: Neighbor[];
  nearby: Neighbor[];
  flags: string[];
}

const K = 7;
const fuelClassOf = (fuel: string) => knnPool.find(t => t.fuel === fuel)?.fuelClass ?? 'any';
const dilOf = (t: KnnTest): Diluent => (t.diluent?.startsWith('CO2') ? 'CO2' : t.diluent?.startsWith('He') ? 'He' : 'none');

export function distance(t: KnnTest, x: SimInput, cls: string): number {
  const atm = psiToAtm(x.psi);
  const dO2 = (t.o2 - x.o2) / 0.1;
  const dP = t.pAtm ? Math.log(t.pAtm / atm) / Math.LN2 : 0.5;
  const dF = t.flow !== null ? (t.flow - x.flow) / 15 : 0.5;
  const dFuel = x.fuel === 'any' ? 0 : t.fuel === x.fuel ? 0 : t.fuelClass === cls ? 1.0 : 1.5;
  const dDil = dilOf(t) === x.diluent ? 0 : 0.5;
  return Math.sqrt(dO2 * dO2 + dP * dP + dF * dF + dFuel * dFuel + dDil * dDil);
}

export function physicsPrior(x: SimInput): number {
  let z = (x.o2 - 0.17) / 0.03; // logistic in O₂: ~50% at 17% O₂
  const g = GRAVITY[x.gravity].g;
  if (g === 0 && x.flow < 2) z -= 0.8; // quiescent microgravity: no buoyant oxygen supply
  z += Math.min(x.flow, 30) / 30 * 0.6 + g * 0.8; // forced flow or buoyancy feeds the flame
  if (x.flow > 60) z -= 0.6; // very strong flow can blow a flame off
  if (x.diluent !== 'none') z -= 0.8;
  return 1 / (1 + Math.exp(-z));
}

export function predict(x: SimInput): SimResult {
  const cls = x.fuel === 'any' ? 'any' : fuelClassOf(x.fuel);
  const scored = knnPool.map(t => ({ t, d: distance(t, x, cls), w: 0 })).sort((a, b) => a.d - b.d);
  const nb = scored.slice(0, K).map(n => ({ ...n, w: 1 / (n.d + 0.15) }));
  const W = nb.reduce((s, n) => s + n.w, 0);
  const pData = nb.reduce((s, n) => s + n.w * n.t.burn, 0) / W;
  const prior = physicsPrior(x);
  const atm0 = psiToAtm(x.psi);
  const outside = x.o2 > 0.85 || x.o2 < 0.12 || atm0 < 0.48 || atm0 > 3.3;
  const priorW = outside ? 0.5 : 0.2;
  const p = (1 - priorW) * pData + priorW * prior;
  const verdict = p >= 0.62 ? 'Likely' : p >= 0.38 ? 'Borderline' : 'Unlikely';

  // confidence: neighbors agree + neighbors are close + inside tested conditions
  const variance = nb.reduce((s, n) => s + n.w * (n.t.burn - pData) ** 2, 0) / W;
  const agreement = 1 - Math.min(1, Math.sqrt(variance) / 0.5);
  const meanD = nb.reduce((s, n) => s + n.d, 0) / nb.length;
  const proximity = Math.exp(-meanD / 1.5);
  let conf = 0.25 + 0.4 * agreement + 0.35 * proximity;
  const flags: string[] = [];
  const atm = psiToAtm(x.psi);
  if (GRAVITY[x.gravity].extrapolated) {
    conf *= x.gravity === 'earth' ? 0.85 : 0.7;
    flags.push(x.gravity === 'earth'
      ? 'Earth gravity: the matched tests were run in microgravity, so this is an extrapolation (buoyancy usually makes flames stronger).'
      : `EXTRAPOLATED: no ${x.gravity === 'moon' ? 'Moon' : 'Mars'}-gravity combustion data exists in PSI. Result is based on microgravity tests plus a physics prior.`);
  }
  if (x.o2 > 0.85) { conf *= 0.75; flags.push(`O₂ ${Math.round(x.o2 * 100)}% is above the highest O₂ in any PSI test (85%, ACME CFI-G).`); }
  if (x.o2 < 0.12) { conf *= 0.75; flags.push('O₂ below 12% is under the lowest O₂ in the outcome tests.'); }
  if (atm < 0.48 || atm > 3.3) { conf *= 0.8; flags.push(`Pressure ${x.psi.toFixed(1)} psi is outside the tested pressure range (≈7–48 psi).`); }
  if (nb[0] && nb[0].d > 1.5) flags.push('Nearest NASA test is far from these conditions; treat as a rough estimate.');
  if (outside || GRAVITY[x.gravity].extrapolated) {
    flags.unshift('WARNING: these settings go beyond what NASA tested in the PSI outcome tables. Treat the score as an estimate, not a certification.');
  }
  conf = Math.max(0.05, Math.min(0.97, conf));
  const burns = nb.map(n => n.t.burn);
  const loN = Math.min(...burns);
  const hiN = Math.max(...burns);
  const half = Math.max(0.04, (1 - conf) * 0.35);
  const bandLo = Math.max(0, Math.min(p, loN) - half * 0.25);
  const bandHi = Math.min(1, Math.max(p, hiN) + half * 0.25);
  const beyondTested = outside || GRAVITY[x.gravity].extrapolated;
  return {
    verdict, p, pData, prior, priorW,
    confidence: conf,
    confidenceLabel: conf >= 0.66 ? 'High' : conf >= 0.4 ? 'Medium' : 'Low',
    nTests: nb.length,
    band: [bandLo, bandHi],
    beyondTested,
    neighbors: nb.slice(0, 3),
    nearby: nb,
    flags,
  };
}
