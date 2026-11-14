import type { Gravity } from './types';

export interface Scenario {
  id: string;
  name: string;
  short: string;
  icon: string;
  o2: number; // mole fraction
  psi: number;
  flow: number; // cm/s (assumed ventilation; see assumptions)
  gravity: Gravity;
  blurb: string;
  facts: string[]; // where the atmosphere numbers come from
  assumptions: string[]; // anything we assumed, shown in the UI
  roleBoost: string[]; // roleGroups that get a +0.2 relevance bump for this scenario
  weights?: { o2: number; pressure: number; flow: number; role: number; data: number }; // optional default-weight override
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'iss', name: 'ISS / Spacecraft', short: 'Spacecraft', icon: '🛰️',
    o2: 0.21, psi: 14.7, flow: 20, gravity: 'micro',
    blurb: 'Sea-level-like cabin air in microgravity. The only “wind” is the ventilation fans.',
    facts: ['ISS cabin ≈ 21% O₂ at 14.7 psi (challenge brief; matches the 14.7 psia / 21% atmosphere in ACME BRE objectives, PSI-20).'],
    assumptions: ['Ventilation flow assumed 20 cm/s, the airflow used in SAFFIRE-I and SAFFIRE-II (PSI-98, PSI-99).'],
    roleBoost: ['Prevention', 'Detection', 'Suppression'],
  },
  {
    id: 'lunar', name: 'Lunar Base', short: 'Moon', icon: '🌕',
    o2: 0.30, psi: 10.2, flow: 20, gravity: 'moon',
    blurb: 'Lower pressure, oxygen-enriched air, and 1/6 g. More oxygen means fires start and spread more easily.',
    facts: ['Moon base likely 30%+ O₂ at ≤10.2 psi (challenge brief). ACME BRE objectives list 10.2 psia / 26.5% O₂ as a NASA-considered atmosphere (PSI-20).'],
    assumptions: ['Ventilation flow assumed 20 cm/s (same as SAFFIRE tests).', 'No partial-gravity (Moon) combustion data exists in PSI: results are extrapolated from microgravity tests.'],
    roleBoost: ['Exploration atmospheres', 'Prevention'],
  },
  {
    id: 'mars', name: 'Mars Habitat', short: 'Mars', icon: '🔴',
    o2: 0.30, psi: 10.2, flow: 20, gravity: 'mars',
    blurb: 'Assumed to use the same atmosphere as the lunar base preset, with 0.38 g.',
    facts: ['No published Mars-habitat atmosphere in this dataset; we assume the lunar-base preset (30% O₂, 10.2 psi).'],
    assumptions: ['Atmosphere assumed equal to the Lunar Base preset.', 'Ventilation flow assumed 20 cm/s.', 'No partial-gravity (Mars) combustion data exists in PSI: results are extrapolated.'],
    roleBoost: ['Exploration atmospheres', 'Prevention'],
  },
  {
    id: 'rover', name: 'Pressurized Rover', short: 'Rover', icon: '🚙',
    o2: 0.34, psi: 8.2, flow: 20, gravity: 'moon',
    blurb: 'A small cabin at the lowest-pressure, highest-oxygen exploration atmosphere NASA has considered.',
    facts: ['8.2 psia / 34% O₂ is listed as a NASA-considered atmosphere for human missions in ACME BRE objectives (PSI-20). We use it for a rover.'],
    assumptions: ['Rover atmosphere assumed to be the 8.2 psia / 34% O₂ case.', 'Assumed driving on the Moon (1/6 g), extrapolated.', 'Ventilation flow assumed 20 cm/s.'],
    roleBoost: ['Exploration atmospheres', 'Detection'],
  },
  {
    id: 'suit', name: 'Spacesuit', short: 'Suit', icon: '⛑️',
    o2: 1.0, psi: 4.3, flow: 5, gravity: 'moon',
    blurb: 'Pure oxygen at very low pressure. The most extreme oxygen level of any scenario.',
    facts: ['Spacesuit ≈ 100% O₂ at 4.3 psi (challenge brief). The highest O₂ in PSI tests is 85% (ACME CFI-G, PSI-159).'],
    weights: { o2: 40, pressure: 25, flow: 5, role: 15, data: 15 },
    assumptions: ['Default weights favor O₂ and pressure (flow weight 5) because suit airflow is only an assumption.', 'Suit ventilation flow assumed 5 cm/s (low flow).', 'Assumed a lunar surface walk (1/6 g), extrapolated.', '100% O₂ is beyond every PSI test (max 85%): extrapolated.'],
    roleBoost: ['Exploration atmospheres'],
  },
];

export const GRAVITY: Record<Gravity, { label: string; g: number; flame: number; extrapolated: boolean }> = {
  micro: { label: 'Microgravity (ISS)', g: 0, flame: 0, extrapolated: false },
  moon: { label: 'Moon (0.17 g)', g: 0.166, flame: 0.4, extrapolated: true },
  mars: { label: 'Mars (0.38 g)', g: 0.378, flame: 0.62, extrapolated: true },
  earth: { label: 'Earth (1 g)', g: 1, flame: 1, extrapolated: true },
};

export const EDGE_CASES: Scenario[] = [
  {
    id: 'still', name: 'Still cabin air', short: 'Still air', icon: '🌬️',
    o2: 0.21, psi: 14.7, flow: 0, gravity: 'micro',
    blurb: 'ISS oxygen and pressure with the fans off. In microgravity a flame with no airflow is fed only by diffusion.',
    facts: ['21% O₂ at 14.7 psi, the ISS cabin. Flow set to 0 cm/s as an edge case, not a measured habitat spec.'],
    assumptions: ['Zero ventilation is an edge case. Real cabins keep some airflow.'],
    roleBoost: ['Suppression', 'Detection'],
  },
  {
    id: 'vent', name: 'High ventilation', short: 'High flow', icon: '💨',
    o2: 0.21, psi: 14.7, flow: 40, gravity: 'micro',
    blurb: 'The same cabin air pushed faster than the SAFFIRE test flow. Forced flow can stretch a flame or blow it out.',
    facts: ['SAFFIRE used about 20–30 cm/s. 40 cm/s is above that, an edge case.'],
    assumptions: ['40 cm/s is not a published habitat requirement. It stresses the flow match.'],
    roleBoost: ['Prevention', 'Detection'],
  },
  {
    id: 'lean', name: 'Oxygen-lean cabin', short: 'Lean O₂', icon: '🫁',
    o2: 0.15, psi: 14.7, flow: 10, gravity: 'micro',
    blurb: 'Sea-level pressure with oxygen pulled down toward where many FLEX droplets went out.',
    facts: ['FLEX tested from about 12% O₂. 15% is inside that range and below normal air.'],
    assumptions: ['A 15% cabin is an edge case for suppression, not a habitat preset.'],
    roleBoost: ['Suppression'],
  },
  {
    id: 'rich-low', name: 'Rich and thin', short: '34% / 8.2', icon: '🛸',
    o2: 0.34, psi: 8.2, flow: 15, gravity: 'moon',
    blurb: 'The highest-oxygen, lowest-pressure exploration atmosphere listed in the ACME BRE objectives, on the Moon.',
    facts: ['8.2 psia / 34% O₂ is a NASA-considered atmosphere in ACME BRE objectives (PSI-20).'],
    assumptions: ['Moon gravity is extrapolated. No partial-gravity combustion data is in PSI.'],
    roleBoost: ['Exploration atmospheres', 'Prevention'],
  },
  {
    id: 'hypobaric', name: 'High cabin pressure', short: 'High P', icon: '🧪',
    o2: 0.21, psi: 30, flow: 20, gravity: 'earth',
    blurb: 'Normal oxygen at roughly two atmospheres. Pressure this high is outside most PSI flame tables.',
    facts: ['PSI droplet tests cluster near 0.5–3 atm. 30 psi is about 2 atm, near the top of that span.'],
    assumptions: ['Earth gravity here is an extrapolation from microgravity tests.'],
    roleBoost: ['Prevention'],
  },
];

export const psiToAtm = (psi: number) => psi / 14.696;
export const scenarioById = (id: string) => [...SCENARIOS, ...EDGE_CASES].find(s => s.id === id) || SCENARIOS[0];

export function makeAtmosphere(p: { o2: number; psi: number; flow: number; gravity: Gravity }): Scenario {
  const g = GRAVITY[p.gravity];
  return {
    id: 'custom',
    name: 'Custom environment',
    short: 'Custom',
    icon: '✦',
    o2: p.o2,
    psi: p.psi,
    flow: p.flow,
    gravity: p.gravity,
    blurb: 'An atmosphere you set. The ranking uses the same oxygen, pressure, flow, role, and data formula as the presets.',
    facts: [`${Math.round(p.o2 * 100)}% O₂ at ${p.psi.toFixed(1)} psi, ${p.flow} cm/s, ${g.label}.`],
    assumptions: [g.extrapolated ? 'Moon, Mars, and Earth results are extrapolated. PSI has no partial-gravity combustion tests.' : 'Scored against microgravity tests in PSI.'],
    roleBoost: p.o2 >= 0.28 ? ['Exploration atmospheres', 'Prevention'] : ['Prevention', 'Suppression'],
  };
}
