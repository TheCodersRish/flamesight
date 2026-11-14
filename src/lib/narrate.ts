import type { Answer } from './retrieval';
import type { SimResult, SimInput } from './knn';
import { GRAVITY } from './scenarios';

/** A short answer written only from retrieved NASA passages. No network and no API key. */
export function narrateLocal(a: Answer): string {
  if (!a.hits.length) return a.intro;
  const facts = a.hits.slice(0, 3).map(h => {
    const fact = h.passages.find(p => p.kind === 'fact');
    const name = h.inv.hasAcronym ? h.inv.acronym : h.inv.accession;
    return fact ? `${name}: ${fact.text}` : `${name}: ${h.inv.why}`;
  });
  return [a.intro, ...facts, ...a.caveats].join(' ');
}

/** Will It Burn copy from the local k-NN result. No network and no API key. */
export function narrateBurn(x: SimInput, result: SimResult): string {
  const fuel = x.fuel === 'any' ? 'these conditions' : x.fuel;
  const nearest = result.neighbors.map(n => `${n.t.id} (${n.t.fuel}, ${Math.round(n.t.o2 * 100)}% O₂, ${n.t.outcome || 'outcome not listed'})`).join('; ');
  const gas = x.diluent === 'none' ? 'no suppressant gas' : x.diluent === 'CO2' ? 'CO₂ added' : 'helium added';
  const lead = `For ${fuel} at ${Math.round(x.o2 * 100)}% oxygen, ${x.psi.toFixed(1)} psi, ${x.flow} cm/s, ${GRAVITY[x.gravity].label}, with ${gas}, the local model says ${result.verdict.toLowerCase()} to burn (${Math.round(result.p * 100)}/100, ${result.confidenceLabel.toLowerCase()} confidence).`;
  const evidence = `The closest NASA tests are ${nearest}.`;
  const mix = `That score is ${Math.round((1 - result.priorW) * 100)}% the nearest tests and ${Math.round(result.priorW * 100)}% a simple physics prior.`;
  return [lead, evidence, mix, ...result.flags].join(' ');
}
