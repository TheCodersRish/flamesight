/**
 * Shared freefall-physics bridge: feeding mode, investigation tags,
 * Fluid Physics deep links, briefs, and walkthroughs used across tabs.
 */
import type { MechId } from './microMechanisms';
import { mechById } from './microMechanisms';
import type { Investigation } from './types';
import type { SimInput } from './knn';
import type { Gravity } from './types';
import { GRAVITY } from './scenarios';

export type FeedMode = 'rising-plume' | 'slow-mixing' | 'cabin-fans';

export interface FeedChip {
  mode: FeedMode;
  label: string;
  detail: string;
  mechId: MechId;
}

/** Live feeding-mode chip from Will It Burn gravity / oxygen / flow sliders. */
export function feedingMode(x: Pick<SimInput, 'gravity' | 'o2' | 'flow'>): FeedChip {
  const g = GRAVITY[x.gravity as Gravity]?.g ?? 0;
  if (g >= 0.35) {
    return {
      mode: 'rising-plume',
      label: 'Buoyant plume',
      detail: 'Earth-like gravity: buoyancy (rising hot air) lifts and feeds the flame.',
      mechId: 'no-buoyancy',
    };
  }
  if (x.flow >= 8) {
    return {
      mode: 'cabin-fans',
      label: 'Forced ventilation',
      detail: `Forced flow at ${x.flow} cm/s replaces the missing buoyant plume.`,
      mechId: 'forced',
    };
  }
  return {
    mode: 'slow-mixing',
    label: 'Diffusion',
    detail: 'Near-still freefall air: oxygen arrives mainly by molecular diffusion.',
    mechId: 'diffusion',
  };
}

export interface PhysicsTag {
  id: MechId;
  short: string;
  story: string;
}

const TAG: Record<MechId, PhysicsTag> = {
  'no-buoyancy': { id: 'no-buoyancy', short: 'No buoyancy', story: 'Without a buoyant plume (rising hot air), the flame turns round.' },
  diffusion: { id: 'diffusion', short: 'Diffusion limit', story: 'Oxygen reaches the flame mainly by molecular diffusion.' },
  forced: { id: 'forced', short: 'Forced ventilation', story: 'Cabin ventilation stretches and feeds the freefall flame.' },
  stefan: { id: 'stefan', short: 'Stefan flow', story: 'Fuel vapor blows outward and sets the spherical flame standoff.' },
  lewis: { id: 'lewis', short: 'Lewis number', story: 'Heat and fuel species travel at different speeds (Le ≠ 1).' },
  radiation: { id: 'radiation', short: 'Radiative loss', story: 'A growing sphere loses heat by radiation until the flame goes out.' },
  marangoni: { id: 'marangoni', short: 'Marangoni', story: 'Surface-tension gradients stir liquid fuel when gravity cannot.' },
};

/** Map a NASA study to the freefall ideas it best illustrates. */
export function physicsTagsFor(inv: Investigation): PhysicsTag[] {
  const blob = `${inv.acronym} ${inv.title} ${inv.summary} ${inv.why} ${inv.keywords.join(' ')} ${inv.roleGroup}`.toLowerCase();
  const ids: MechId[] = [];
  const add = (id: MechId) => { if (!ids.includes(id)) ids.push(id); };

  if (/flex|droplet|cool flame|cfi|psi-117|radiative extinction|extinction/.test(blob)) {
    add('radiation');
    add('lewis');
    add('stefan');
  }
  if (/saffire|bass|flame spread|solid|fabric|sibal|silicone|pmma/.test(blob)) {
    add('forced');
    add('diffusion');
  }
  if (/same|smoke|soot|detection|aerosol/.test(blob)) {
    add('forced');
    add('no-buoyancy');
  }
  if (/e-field|buoyancy|bre|coflow|slice|spice|flame design|cld|s-flame/.test(blob)) {
    add('no-buoyancy');
    add('forced');
  }
  if (/liquid|pool|marangoni|droplet/.test(blob)) add('marangoni');
  if (/diffusion flame|still|no airflow/.test(blob)) add('diffusion');

  if (!ids.length) {
    add('no-buoyancy');
    add('diffusion');
  }
  return ids.slice(0, 3).map(id => TAG[id]);
}

export function fluidPhysicsHref(mech: MechId, mode: 'mechanisms' | 'thermo' = 'mechanisms'): string {
  return `/fluid-physics?mode=${mode}&mech=${mech}`;
}

/** Presets for “Open in Fluid Physics” from an experiment page. */
export function fluidPresetsFor(inv: Investigation): { label: string; to: string; why: string }[] {
  const tags = physicsTagsFor(inv);
  const acronym = inv.hasAcronym ? inv.acronym : inv.accession;
  const presets = tags.map(t => ({
    label: t.short,
    to: fluidPhysicsHref(t.id),
    why: `${acronym} → ${mechById(t.id).name}: ${t.story}`,
  }));
  if (/flex|cool flame|cfi|psi-117/i.test(acronym + inv.title)) {
    presets.unshift({
      label: 'Radiative extinction',
      to: fluidPhysicsHref('radiation'),
      why: 'Droplet flames often end when radiative heat loss overtakes chemistry.',
    });
  }
  if (/saffire|bass/i.test(acronym)) {
    presets.unshift({
      label: 'Ventilation Pe',
      to: fluidPhysicsHref('forced'),
      why: 'SAFFIRE / BASS solid burns are driven by forced ventilation in freefall.',
    });
  }
  // de-dupe by `to`
  const seen = new Set<string>();
  return presets.filter(p => (seen.has(p.to) ? false : (seen.add(p.to), true))).slice(0, 3);
}

export interface PhysicsBrief {
  headline: string;
  bullets: string[];
  links: { label: string; to: string }[];
}

/** Insights strip: adiabatic vs isothermal anchors, and radiative-extinction endings. */
export function physicsBrief(x: SimInput): PhysicsBrief {
  const feed = feedingMode(x);
  const o2 = Math.round(x.o2 * 100);
  const glowLikely = x.gravity === 'micro' && x.flow < 15 && !/sibal|silicone|pmma|cotton|nomex|fabric/i.test(x.fuel);
  return {
    headline: glowLikely
      ? 'Radiative heat loss is the likely end for quiet droplet flames in this cabin.'
      : feed.mode === 'cabin-fans'
        ? 'Forced ventilation sets the oxygen highway—adiabatic cooling races the forced feed.'
        : 'With buoyancy gone, diffusion and the thermodynamic path shape the freefall flame.',
    bullets: [
      feed.mode === 'rising-plume'
        ? 'Earth-like gravity: buoyancy still cools and feeds the flame (teardrop shape).'
        : 'Freefall: no buoyant plume—oxygen arrives by diffusion or ventilation.',
      x.diluent === 'none'
        ? `At ${o2}% oxygen, adiabatic expansion cooling (Q = 0) can shrink a spherical flame as products push out.`
        : `Added ${x.diluent === 'CO2' ? 'CO₂' : 'helium'} shifts the Lewis number (heat vs species speed) and often helps the flame go out.`,
      glowLikely
        ? 'For droplets, radiative loss grows with flame size until chemistry cannot keep up (FLEX / Cool Flames).'
        : 'Solid samples under forced flow follow SAFFIRE / BASS more than droplet radiative-extinction endings.',
    ],
    links: [
      { label: 'Radiative heat loss', to: fluidPhysicsHref('radiation') },
      { label: feed.label, to: fluidPhysicsHref(feed.mechId) },
      { label: 'Adiabatic path', to: '/fluid-physics?mode=thermo&theme=adiabatic' },
      { label: 'Isothermal path', to: '/fluid-physics?mode=thermo&theme=isothermal' },
    ],
  };
}

export interface WalkStep {
  label: string;
  blurb: string;
  flame: { gravity: number; o2: number; flow: number; dilution: number };
  mech: MechId;
}

/** Guided “why it went out” path for FLEX / ACME droplet-style studies. */
export function extinctionWalkthrough(kind: 'flex' | 'acme'): WalkStep[] {
  if (kind === 'acme') {
    return [
      { label: 'Ignition', blurb: 'High oxygen lets a hot flame start even without a buoyant plume.', flame: { gravity: 0, o2: 0.85, flow: 0.08, dilution: 0.05 }, mech: 'diffusion' },
      { label: 'Oxygen & heat', blurb: 'Diffusion and any weak ventilation feed the reaction zone.', flame: { gravity: 0, o2: 0.7, flow: 0.12, dilution: 0.15 }, mech: 'forced' },
      { label: 'Lewis shift', blurb: 'Heat and fuel speeds diverge (Le ≠ 1)—temperature can drop toward a cooler branch.', flame: { gravity: 0, o2: 0.45, flow: 0.06, dilution: 0.4 }, mech: 'lewis' },
      { label: 'Radiative loss wins', blurb: 'Radiative cooling overtakes heat release; the bright flame fades or extinguishes.', flame: { gravity: 0, o2: 0.2, flow: 0.04, dilution: 0.85 }, mech: 'radiation' },
    ];
  }
  return [
    { label: 'Ignition', blurb: 'A droplet ignites into a spherical freefall flame fed by molecular diffusion.', flame: { gravity: 0, o2: 0.75, flow: 0.05, dilution: 0.08 }, mech: 'diffusion' },
    { label: 'Stefan flow', blurb: 'Fuel vapor blows products outward; the shell sits at a balance with incoming oxygen.', flame: { gravity: 0, o2: 0.6, flow: 0.1, dilution: 0.2 }, mech: 'stefan' },
    { label: 'Flame grows', blurb: 'As the sphere grows, radiative heat loss climbs faster than chemistry can pay.', flame: { gravity: 0, o2: 0.4, flow: 0.06, dilution: 0.45 }, mech: 'radiation' },
    { label: 'Extinction', blurb: 'Radiative loss wins—self-extinction or a nearly invisible cool flame (classic FLEX ending).', flame: { gravity: 0, o2: 0.18, flow: 0.03, dilution: 0.9 }, mech: 'radiation' },
  ];
}

export function walkthroughKind(acc: string, acronym: string): 'flex' | 'acme' | null {
  const s = `${acc} ${acronym}`.toUpperCase();
  if (/FLEX|PSI-68|PSI-69|PSI-117|CFI|PSI-39|PSI-142/.test(s)) return 'flex';
  if (/ACME|PSI-20|PSI-159|PSI-10|PSI-21|PSI-22|PSI-23/.test(s)) return 'acme';
  return null;
}

/** Cite freefall ideas for an analyst answer and deep-link Fluid Physics. */
export function analystPhysicsCitations(question: string, hitAccs: string[]): PhysicsTag[] {
  const q = question.toLowerCase();
  const ids: MechId[] = [];
  const add = (id: MechId) => { if (!ids.includes(id)) ids.push(id); };
  if (/fan|ventilat|airflow|flow|saffire|spread/.test(q)) add('forced');
  if (/extinguish|go out|glow|radiat|cool flame|flex|droplet/.test(q)) add('radiation');
  if (/helium|lewis|diluent|co2|suppress/.test(q)) add('lewis');
  if (/mix|diffusion|still|no wind/.test(q)) add('diffusion');
  if (/stefan|blow|vapor|evapor/.test(q)) add('stefan');
  if (/buoyanc|rising|teardrop|shape|round|gravity|moon|mars/.test(q)) add('no-buoyancy');
  if (/liquid|pool|surface/.test(q)) add('marangoni');
  if (hitAccs.some(a => /69|68|117|39|142|159/.test(a))) add('radiation');
  if (hitAccs.some(a => /98|99|100|25|26/.test(a))) add('forced');
  if (!ids.length) add('no-buoyancy');
  return ids.slice(0, 3).map(id => TAG[id]);
}

export function physicsFollowUps(tags: PhysicsTag[]): string[] {
  return tags.map(t => {
    if (t.id === 'forced') return 'Explain forced convection (ventilation) for this fuel in freefall';
    if (t.id === 'radiation') return 'Explain radiative heat loss for this droplet flame';
    if (t.id === 'lewis') return 'Explain the Lewis number for this suppressant';
    if (t.id === 'stefan') return 'Explain Stefan flow for this fuel';
    if (t.id === 'diffusion') return 'Explain molecular diffusion when ventilation is off';
    if (t.id === 'marangoni') return 'Explain Marangoni convection in a freefall liquid fire';
    return 'Explain why freefall flames are round when buoyancy is gone';
  });
}

/** Overview morph cycle: no buoyancy → diffusion → weak ventilation. */
export type TransportPhase = 'no-rising' | 'diffusion' | 'weak-flow';

export function transportPhaseFlame(phase: TransportPhase, t: number): { gravity: number; o2: number; flow: number; dilution: number; label: string } {
  const w = 0.5 + 0.5 * Math.sin(t * 1.2);
  if (phase === 'no-rising') {
    return { gravity: 0.02 + 0.08 * (1 - w), o2: 0.45 + 0.15 * w, flow: 0.02, dilution: 0.25, label: 'No buoyancy' };
  }
  if (phase === 'diffusion') {
    return { gravity: 0, o2: 0.35 + 0.25 * w, flow: 0.04, dilution: 0.45 - 0.2 * w, label: 'Diffusion' };
  }
  return { gravity: 0, o2: 0.4 + 0.3 * w, flow: 0.15 + 0.25 * w, dilution: 0.15, label: 'Weak ventilation' };
}

export { TAG as PHYSICS_TAG_BY_ID };
