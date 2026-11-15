import type { InsightBrief } from './insightBrief';
import type { SimInput, SimResult } from './knn';
import { cabinGravityLabel } from './scenarios';

/** Soften a few dense phrases so a finding is easier to say out loud. */
export function simplifyText(text: string): string {
  return text
    .replace(/\bself-extinguished\b/gi, 'ignited, then went out on their own')
    .replace(/\bextinction\b/gi, 'going out')
    .replace(/\bdiluent\b/gi, 'extra gas')
    .replace(/\bmicrogravity\b/gi, 'near-zero gravity')
    .replace(/\bpartial-gravity\b/gi, 'Moon or Mars gravity')
    .replace(/\bO₂\b/g, 'oxygen')
    .replace(/\bCO₂\b/g, 'carbon dioxide')
    .replace(/\batm\b/gi, 'atmospheres')
    .replace(/\bpsi\b/gi, 'pounds per square inch')
    .replace(/\bk-nearest neighbors?\b/gi, 'closest NASA tests')
    .replace(/\bprior\b/gi, 'simple physics check')
    .replace(/\bextrapolated\b/gi, 'estimated beyond the measured data')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortOutcome(raw: string | null | undefined): string {
  const o = raw || 'outcome not listed';
  if (/self-extinguish/i.test(o) || /^extinction$/i.test(o)) return 'ignited, then went out';
  if (/disruption/i.test(o)) return 'burned until the droplet broke apart';
  if (/completion|burned out|kept burning|turned off/i.test(o)) return 'kept burning';
  if (/no (hot )?ignition|no flame|failed/i.test(o)) return 'did not ignite';
  if (/flash/i.test(o)) return 'brief flash only';
  return simplifyText(o);
}

/** Short, presentable Will It Burn summary (no leading verdict — the UI already shows that). */
export function plainBurn(x: SimInput, result: SimResult): string {
  const fuel = x.fuel === 'any' ? 'this setup' : x.fuel;
  const o2 = Math.round(x.o2 * 100);
  const gas = x.diluent === 'none' ? 'no extra extinguishing gas' : x.diluent === 'CO2' ? 'carbon dioxide added' : 'helium added';
  const top = result.neighbors.slice(0, 2);
  const mostlyWentOut = top.length > 0 && top.every(n => n.t.burn > 0 && n.t.burn <= 0.65);
  const nuance =
    result.verdict === 'Likely' && mostlyWentOut
      ? 'Nearest NASA tests still ignited first — they just did not keep burning the whole time.'
      : result.verdict === 'Unlikely' && top.some(n => n.t.burn >= 0.8)
        ? 'Some nearby tests burned harder, so treat this as a cautious estimate.'
        : '';
  const near = top
    .map(n => `${n.t.id}: ${shortOutcome(n.t.outcome)}`)
    .join('; ');
  return [
    `You tested ${fuel} at ${o2}% oxygen, ${x.psi.toFixed(1)} pounds per square inch, ${x.flow} cm/s airflow, ${cabinGravityLabel(x)}, with ${gas}.`,
    `Burn score ${Math.round(result.p * 100)} out of 100 · based on ${result.nTests} NASA tests · range ${Math.round(result.band[0] * 100)}–${Math.round(result.band[1] * 100)} · ${result.confidenceLabel.toLowerCase()} confidence (how sure the match is, separate from the score).`,
    near ? `Closest NASA tests: ${near}.` : '',
    nuance,
    result.beyondTested ? 'Warning: these settings go beyond what NASA tested.' : '',
    ...result.flags.filter(f => !f.startsWith('WARNING:')).map(simplifyText),
  ].filter(Boolean).join(' ');
}

export function plainInsight(brief: InsightBrief): InsightBrief {
  return {
    headline: simplifyText(brief.headline),
    points: brief.points.map(simplifyText),
    action: simplifyText(brief.action),
  };
}

/** Turn a local analyst answer into a short presentation line. */
export function plainAnalyst(question: string, notes: string, caveats: string[]): string {
  const lead = simplifyText(notes);
  const warn = caveats.map(simplifyText).join(' ');
  return [
    `For “${question.trim()}”:`,
    lead,
    warn ? `Caveat: ${warn}` : '',
  ].filter(Boolean).join('\n\n');
}
