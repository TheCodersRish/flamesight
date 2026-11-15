import { investigations, knnPool } from './data';
import { GRAVITY, psiToAtm, SCENARIOS, type Scenario } from './scenarios';
import type { Investigation } from './types';

export type GapAxis = 'o2' | 'pressure' | 'gravity';

export interface CoverageGap {
  axis: GapAxis;
  label: string;
  missionValue: string;
  status: 'covered' | 'thin' | 'missing';
  detail: string;
  nearestTests: number;
  /** Experiment that would best fill this gap (existing study to extend, or a proposed follow-on). */
  fillExperiment: {
    accession?: string;
    name: string;
    why: string;
  };
}

export interface MissionGaps {
  scenario: Scenario;
  gaps: CoverageGap[];
  missingCount: number;
  priority: 'high' | 'medium' | 'low';
}

const O2_NEAR = 0.03; // ±3 percentage points as mole fraction
const P_FACTOR = 1.25; // within 25% in pressure ratio

function invName(inv: Investigation): string {
  return inv.hasAcronym ? `${inv.acronym} (${inv.accession})` : `${inv.title.slice(0, 48)} (${inv.accession})`;
}

function bestSolidStudy(): Investigation {
  return investigations.find(i => i.accession === 'PSI-25')
    || investigations.find(i => i.roleGroup === 'Prevention')
    || investigations[0];
}

function bestIgnitionStudy(): Investigation {
  return investigations.find(i => i.accession === 'PSI-159')
    || investigations.find(i => i.accession === 'PSI-20')
    || investigations[0];
}

function bestProxyGravity(): Investigation {
  return investigations.find(i => i.accession === 'PSI-22')
    || investigations.find(i => /buoyancy|field/i.test(i.title + i.role))
    || investigations[0];
}

function countNearO2(o2: number): number {
  return knnPool.filter(t => Math.abs(t.o2 - o2) <= O2_NEAR).length;
}

function countNearP(psi: number): number {
  const atm = psiToAtm(psi);
  return knnPool.filter(t => {
    if (t.pAtm == null || t.pAtm <= 0) return false;
    const ratio = Math.max(t.pAtm / atm, atm / t.pAtm);
    return ratio <= P_FACTOR;
  }).length;
}

function o2Gap(sc: Scenario): CoverageGap {
  const pct = Math.round(sc.o2 * 100);
  const n = countNearO2(sc.o2);
  const solid = bestSolidStudy();
  const ign = bestIgnitionStudy();
  if (sc.o2 > 0.85) {
    return {
      axis: 'o2',
      label: 'Oxygen',
      missionValue: `${pct}% O₂`,
      status: 'missing',
      detail: `No PSI outcome test reaches ${pct}% O₂ (max 85%, ACME CFI-G). Spacesuit-level oxygen is an open fire-safety gap.`,
      nearestTests: n,
      fillExperiment: {
        accession: ign.accession,
        name: `Extend ${invName(ign)} to ${pct}% O₂ solids & ignition`,
        why: 'CFI-G already maps high-O₂ ignition up to 85%. A follow-on at 90–100% O₂ with cabin materials would close the suit gap.',
      },
    };
  }
  if (n === 0) {
    return {
      axis: 'o2',
      label: 'Oxygen',
      missionValue: `${pct}% O₂`,
      status: 'missing',
      detail: `No recorded flame-outcome tests sit within ±${Math.round(O2_NEAR * 100)} points of ${pct}% O₂.`,
      nearestTests: 0,
      fillExperiment: {
        accession: solid.accession,
        name: `Material flammability matrix at ${pct}% O₂`,
        why: `${invName(solid)} is the closest solid-fuel program. Re-run its materials at this exact cabin oxygen.`,
      },
    };
  }
  if (n < 8 || (sc.o2 > 0.25 && !knnPool.some(t => t.fuelClass === 'solid' && Math.abs(t.o2 - sc.o2) <= O2_NEAR))) {
    return {
      axis: 'o2',
      label: 'Oxygen',
      missionValue: `${pct}% O₂`,
      status: 'thin',
      detail: `Only ${n} outcome test${n === 1 ? '' : 's'} near ${pct}% O₂${sc.o2 > 0.25 ? ', and solid materials are under-covered at this enrichment' : ''}.`,
      nearestTests: n,
      fillExperiment: {
        accession: solid.accession,
        name: `Dense ${pct}% O₂ solid-sample series (BASS / SAFFIRE class)`,
        why: 'Oxygen-enriched exploration cabins need solid flammability data at the real mole fraction, not only droplet or gas flames.',
      },
    };
  }
  return {
    axis: 'o2',
    label: 'Oxygen',
    missionValue: `${pct}% O₂`,
    status: 'covered',
    detail: `${n} outcome tests sit near ${pct}% O₂.`,
    nearestTests: n,
    fillExperiment: {
      accession: ign.accession,
      name: invName(ign),
      why: 'Existing coverage is usable; still useful to confirm with mission-specific materials.',
    },
  };
}

function pressureGap(sc: Scenario): CoverageGap {
  const atm = psiToAtm(sc.psi);
  const n = countNearP(sc.psi);
  const psi117 = investigations.find(i => i.accession === 'PSI-117') || investigations[0];
  const saffire = investigations.find(i => i.accession === 'PSI-99') || investigations[0];
  if (atm < 0.48 || atm > 3.3) {
    return {
      axis: 'pressure',
      label: 'Pressure',
      missionValue: `${sc.psi.toFixed(1)} psi (${atm.toFixed(2)} atm)`,
      status: 'missing',
      detail: `Habitat pressure is outside the ~7–48 psi span of most PSI flame-outcome tables.`,
      nearestTests: n,
      fillExperiment: {
        accession: psi117.accession,
        name: `Pressure sweep at ${sc.psi.toFixed(1)} psi (droplet + solid)`,
        why: `${invName(psi117)} already varies pressure for droplets; add solid samples at this habitat pressure.`,
      },
    };
  }
  if (n < 5) {
    return {
      axis: 'pressure',
      label: 'Pressure',
      missionValue: `${sc.psi.toFixed(1)} psi (${atm.toFixed(2)} atm)`,
      status: 'thin',
      detail: `Only ${n} outcome test${n === 1 ? '' : 's'} within ~25% of this pressure.`,
      nearestTests: n,
      fillExperiment: {
        accession: saffire.accession,
        name: `Forced-flow solid burns at ${sc.psi.toFixed(1)} psi`,
        why: `${invName(saffire)} is the best large-sample fire-safety platform; repeating at habitat pressure fills the matrix.`,
      },
    };
  }
  return {
    axis: 'pressure',
    label: 'Pressure',
    missionValue: `${sc.psi.toFixed(1)} psi (${atm.toFixed(2)} atm)`,
    status: 'covered',
    detail: `${n} outcome tests are near this pressure.`,
    nearestTests: n,
    fillExperiment: {
      accession: saffire.accession,
      name: invName(saffire),
      why: 'Pressure is represented in the outcome pool; mission-specific materials still help.',
    },
  };
}

function gravityGap(sc: Scenario): CoverageGap {
  const g = GRAVITY[sc.gravity];
  const proxy = bestProxyGravity();
  if (sc.gravity === 'micro') {
    return {
      axis: 'gravity',
      label: 'Gravity',
      missionValue: g.label,
      status: 'covered',
      detail: 'ISS / freefall is the gravity environment PSI combustion tests actually use.',
      nearestTests: knnPool.length,
      fillExperiment: {
        accession: proxy.accession,
        name: invName(proxy),
        why: 'Microgravity is covered; partial-g remains the open frontier.',
      },
    };
  }
  return {
    axis: 'gravity',
    label: 'Gravity',
    missionValue: g.label,
    status: 'missing',
    detail: `PSI has no combustion tests at ${sc.gravity === 'moon' ? '1/6 g' : sc.gravity === 'mars' ? '0.38 g' : '1 g'}. Every Moon/Mars/Earth result is extrapolated from microgravity plus a physics prior.`,
    nearestTests: 0,
    fillExperiment: {
      accession: proxy.accession,
      name: `Partial-gravity combustion series at ${g.g.toFixed(2)} g (extend ${invName(proxy)})`,
      why: 'ACME E-FIELD is the closest buoyancy proxy in PSI. A true partial-g campaign (parabolic flight, centrifuge, or lunar/Mars ISRU demo) is the highest-impact next test.',
    },
  };
}

export function gapsForScenario(sc: Scenario): MissionGaps {
  const gaps = [o2Gap(sc), pressureGap(sc), gravityGap(sc)];
  const missingCount = gaps.filter(g => g.status === 'missing').length;
  const thinCount = gaps.filter(g => g.status === 'thin').length;
  const priority = missingCount >= 2 ? 'high' : missingCount === 1 || thinCount >= 2 ? 'high' : thinCount >= 1 ? 'medium' : 'low';
  return { scenario: sc, gaps, missingCount, priority };
}

export function allMissionGaps(scenarios: Scenario[] = SCENARIOS): MissionGaps[] {
  return scenarios.map(gapsForScenario).sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority] || b.missingCount - a.missingCount;
  });
}

/** Suggested next NASA tests ranked by how many missions they unlock. */
export function nextTestsToRun(scenarios: Scenario[] = SCENARIOS): { name: string; why: string; accession?: string; missions: string[] }[] {
  const map = new Map<string, { name: string; why: string; accession?: string; missions: Set<string> }>();
  for (const mg of allMissionGaps(scenarios)) {
    for (const g of mg.gaps) {
      if (g.status === 'covered') continue;
      const key = g.fillExperiment.name;
      const cur = map.get(key) || {
        name: g.fillExperiment.name,
        why: g.fillExperiment.why,
        accession: g.fillExperiment.accession,
        missions: new Set<string>(),
      };
      cur.missions.add(mg.scenario.short);
      map.set(key, cur);
    }
  }
  return [...map.values()]
    .map(x => ({ name: x.name, why: x.why, accession: x.accession, missions: [...x.missions] }))
    .sort((a, b) => b.missions.length - a.missions.length);
}
