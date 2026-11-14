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

export const psiToAtm = (psi: number) => psi / 14.696;
export const scenarioById = (id: string) => SCENARIOS.find(s => s.id === id) || SCENARIOS[0];
