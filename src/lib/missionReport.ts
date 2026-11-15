import { invLabel } from './data';
import { gapsForScenario } from './gaps';
import { predict, type Diluent } from './knn';
import { curatedFor } from './ntrs';
import { recommendations } from './scoring';
import { GRAVITY, scenarioGravityLabel, type Scenario } from './scenarios';

function suppressantChoice(sc: Scenario): { choice: string; why: string; cites: string[] } {
  const co2 = predict({ fuel: 'any', o2: sc.o2, psi: sc.psi, flow: sc.flow, gravity: sc.gravity, diluent: 'CO2' as Diluent });
  const he = predict({ fuel: 'any', o2: sc.o2, psi: sc.psi, flow: sc.flow, gravity: sc.gravity, diluent: 'He' as Diluent });
  const none = predict({ fuel: 'any', o2: sc.o2, psi: sc.psi, flow: sc.flow, gravity: sc.gravity, diluent: 'none' as Diluent });
  const best = co2.p <= he.p ? 'CO₂' : 'Helium';
  const bestP = Math.min(co2.p, he.p);
  return {
    choice: best,
    why: `At this cabin setting, adding ${best} lowers the modeled burn score to ${Math.round(bestP * 100)}/100 (from ${Math.round(none.p * 100)}/100 with no extra gas). FLEX droplet tests are the primary evidence for inert-gas suppression.`,
    cites: ['PSI-69', 'PSI-68'],
  };
}

function o2PressureLimits(sc: Scenario): { o2: string; pressure: string; notes: string[] } {
  const notes: string[] = [];
  let o2 = 'Prefer ≤21% O₂ when materials are only screened at Earth air.';
  let pressure = 'Prefer near 14.7 psi when relying on ISS-matched datasets.';
  if (sc.o2 >= 0.28) {
    o2 = `Exploration preset is ${Math.round(sc.o2 * 100)}% O₂ — treat this as elevated fire risk vs ISS. Do not raise O₂ further without new solid-material tests at that mole fraction.`;
    notes.push('BASS-II solid tables top out below many exploration atmospheres; ACME BRE / CFI-G cover higher O₂ for gas flames.');
  } else {
    o2 = 'Keep cabin near 21% O₂ unless a documented exploration requirement demands enrichment.';
  }
  if (sc.psi < 11) {
    pressure = `Preset pressure is ${sc.psi.toFixed(1)} psi. Stay at or above this floor unless suit/rover ops require lower pressure; pair any further drop with high-O₂ re-screening.`;
    notes.push('Low pressure + high O₂ is the exploration trade space listed in ACME BRE objectives.');
  } else {
    pressure = `Operate near ${sc.psi.toFixed(1)} psi (this habitat preset). Large excursions outside ~7–48 psi leave the PSI outcome envelope.`;
  }
  if (GRAVITY[sc.gravity].extrapolated) {
    notes.push(`Gravity (${scenarioGravityLabel(sc)}) is extrapolated — PSI has no partial-gravity combustion tests.`);
  }
  return { o2, pressure, notes };
}

/** Build a printable mission fire-safety report body for downloadReport(). */
export function buildMissionReport(sc: Scenario): string {
  const recs = recommendations(sc);
  const gaps = gapsForScenario(sc);
  const burn = predict({ fuel: 'any', o2: sc.o2, psi: sc.psi, flow: sc.flow, gravity: sc.gravity, diluent: 'none' });
  const suppress = suppressantChoice(sc);
  const limits = o2PressureLimits(sc);
  const cites = new Set<string>();
  recs.forEach(r => r.cites.forEach(c => cites.add(c)));
  suppress.cites.forEach(c => cites.add(c));
  gaps.gaps.forEach(g => { if (g.fillExperiment.accession) cites.add(g.fillExperiment.accession); });

  const paperLines: string[] = [];
  for (const acc of [...cites].slice(0, 8)) {
    const papers = curatedFor(acc);
    paperLines.push(`  ${invLabel(acc)}`);
    for (const p of papers.slice(0, 2)) {
      paperLines.push(`    - ${p.title}`);
      paperLines.push(`      ${p.url}`);
    }
  }

  const lines = [
    `FlameSight — Mission Fire-Safety Report`,
    `Habitat: ${sc.name}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'Cabin atmosphere',
    `  Oxygen: ${Math.round(sc.o2 * 100)}%`,
    `  Pressure: ${sc.psi.toFixed(1)} psi`,
    `  Airflow: ${sc.flow} cm/s (assumed ventilation)`,
    `  Gravity: ${scenarioGravityLabel(sc)}`,
    '',
    'Top risks',
    `  Modeled burn score (any fuel, no suppressant): ${Math.round(burn.p * 100)}/100 — ${burn.verdict}`,
    `  Confidence: ${burn.confidenceLabel} · based on ${burn.nTests} nearest NASA tests`,
    `  Uncertainty band: ${Math.round(burn.band[0] * 100)}–${Math.round(burn.band[1] * 100)} / 100`,
    ...burn.flags.map(f => `  Warning: ${f}`),
    ...recs.slice(0, 4).map((r, i) => `  ${i + 1}. ${r.title} — ${r.text}`),
    '',
    'Recommended O₂ and pressure limits',
    `  Oxygen: ${limits.o2}`,
    `  Pressure: ${limits.pressure}`,
    ...limits.notes.map(n => `  Note: ${n}`),
    '',
    'Suppressant choice',
    `  Preferred inert gas (from FLEX-informed model): ${suppress.choice}`,
    `  ${suppress.why}`,
    `  Citations: ${suppress.cites.join(', ')}`,
    '',
    'What NASA should test next (gaps)',
    ...gaps.gaps.map(g => `  ${g.label} [${g.status}]: ${g.detail} → Fill with: ${g.fillExperiment.name}`),
    '',
    'Citations (PSI investigations)',
    ...[...cites].map(c => `  - ${invLabel(c)}`),
    '',
    'Linked NASA papers (NTRS)',
    ...paperLines,
    '',
    'Data: NASA Physical Sciences Informatics + NASA Technical Reports Server.',
    'Educational tool, not a safety certification.',
  ];
  return lines.join('\n');
}
