import type { InsightBrief } from './insightBrief';
import type { SimInput, SimResult } from './knn';
import { GRAVITY } from './scenarios';

/** Soften a few dense phrases so a finding is easier to say out loud. */
export function simplifyText(text: string): string {
  return text
    .replace(/\bself-extinguished\b/gi, 'went out on their own')
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

/** Short, presentable Will It Burn summary. */
export function plainBurn(x: SimInput, result: SimResult): string {
  const fuel = x.fuel === 'any' ? 'this setup' : x.fuel;
  const o2 = Math.round(x.o2 * 100);
  const gas = x.diluent === 'none' ? 'no extra extinguishing gas' : x.diluent === 'CO2' ? 'carbon dioxide added' : 'helium added';
  const verdict =
    result.verdict === 'Likely'
      ? 'A fire is likely.'
      : result.verdict === 'Borderline'
        ? 'It is a caution zone — a fire could go either way.'
        : 'A fire is unlikely.';
  const near = result.neighbors
    .slice(0, 2)
    .map(n => `${n.t.fuel || n.t.id} (${n.t.outcome || 'outcome not listed'})`)
    .join('; ');
  return [
    verdict,
    `You tested ${fuel} at ${o2}% oxygen, ${x.psi.toFixed(1)} pounds per square inch, ${x.flow} cm/s airflow, ${GRAVITY[x.gravity].label}, with ${gas}.`,
    `Score: ${Math.round(result.p * 100)} out of 100, ${result.confidenceLabel.toLowerCase()} confidence.`,
    near ? `Closest NASA tests: ${near}.` : '',
    ...result.flags.map(simplifyText),
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
