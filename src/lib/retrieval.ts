import { investigations, insights, stats, byAccession, invLabel } from './data';
import type { Investigation } from './types';
import { rangeMatch, SCALES } from './scoring';

// ---------------------------------------------------------------------------
// Local "Fire Safety Analyst": BM25 retrieval over the catalog + facts computed from the test tables.
// The analyst answers in the browser. No API key and no network call.
// ---------------------------------------------------------------------------

export interface Passage { id: string; accession: string; kind: 'summary' | 'fact'; text: string; kw?: string }
export interface Hit { inv: Investigation; score: number; passages: Passage[] }
export interface Answer { question: string; intro: string; hits: Hit[]; caveats: string[] }

const STOP = new Set('a an the and or of to in on for with is are was were be by at as it its from that this what which how do does did can could would should will about into than then there their them they we you i me my our your if so not no yes vs'.split(' '));
const SYN: Record<string, string[]> = {
  moon: ['lunar', 'partial-gravity', 'oxygen', 'high-o2'], lunar: ['moon', 'high-o2'], mars: ['partial-gravity', 'high-o2'],
  smoke: ['detection', 'aerosol', 'particle', 'soot'], detector: ['detection', 'smoke'], detect: ['detection', 'smoke'],
  extinguish: ['suppression', 'extinction', 'co2', 'helium'], suppress: ['suppression', 'co2', 'helium'], suppressant: ['suppression', 'co2', 'helium'],
  oxygen: ['o2'], o2: ['oxygen'], spacesuit: ['high-o2', 'oxygen'], suit: ['high-o2', 'oxygen'], fabric: ['sibal', 'cotton'], plastic: ['pmma'],
  spread: ['flame', 'spread', 'flammability'], flammable: ['flammability', 'spread'], fuel: ['droplet', 'liquid'], liquid: ['droplet'],
  cool: ['cool', 'low-temperature'], ventilation: ['flow', 'airflow'], airflow: ['flow'], wind: ['flow'], rover: ['high-o2'], gravity: ['partial-gravity', 'buoyancy'],
};
const tok = (s: string) => s.toLowerCase().replace(/[₂]/g, '2').replace(/[^a-z0-9%.\- ]/g, ' ').split(/\s+/).map(w => w.replace(/^[-.]+|[-.]+$/g, '')).filter(w => w.length > 1 && !STOP.has(w));

function buildPassages(): Passage[] {
  const P: Passage[] = [];
  for (const i of investigations) {
    P.push({ id: `${i.accession}-s`, accession: i.accession, kind: 'summary', text: `${i.acronym} ${i.title}. ${i.role}. ${i.summary} ${i.why} Keywords: ${i.keywords.join(', ')}. ${i.objectives}` });
    if (i.count) P.push({ id: `${i.accession}-c`, accession: i.accession, kind: 'fact', text: `${i.acronym} test table: ${i.count.count.toLocaleString()} ${i.count.unit} (${i.count.basis}).` });
  }
  const f = insights.flex;
  P.push({ id: 'PSI-69-f1', accession: 'PSI-69', kind: 'fact', kw: 'suppression extinction outcomes', text: `FLEX: of ${stats.flex.tests} droplet fire tests, ${stats.flex.extinction} self-extinguished (extinction), ${stats.flex.disruption} ended in droplet disruption and ${stats.flex.completion} burned out completely (${stats.flex.pctSelfExtinguished}% self-extinguished).` });
  P.push({ id: 'PSI-69-f2', accession: 'PSI-69', kind: 'fact', kw: 'diluent suppressant co2 helium extinction', text: 'FLEX by diluent gas: ' + f.byDiluent.map(d => `${d.group}: ${d.Extinction} of ${d.total} self-extinguished`).join('; ') + '.' });
  P.push({ id: 'PSI-69-f3', accession: 'PSI-69', kind: 'fact', kw: 'oxygen level extinction', text: 'FLEX by starting oxygen: ' + f.byO2.map(d => `O₂ ${d.bin}: ${d.Extinction}/${d.total} extinction, ${d.Completion} burned out`).join('; ') + '.' });
  const c = insights.cfig.byO2;
  P.push({ id: 'PSI-159-f1', accession: 'PSI-159', kind: 'fact', kw: 'high oxygen hot ignition rate', text: 'ACME CFI-G hot-ignition rate by O₂: ' + c.filter(r => r.Normal_n || r.Inverse_n).map(r => `${r.bin}: normal ${r.Normal_n ? r.Normal_ign + '% of ' + r.Normal_n : 'no tests'}, inverse ${r.Inverse_n ? r.Inverse_ign + '% of ' + r.Inverse_n : 'no tests'}`).join('; ') + '.' });
  P.push({ id: 'PSI-99-f1', accession: 'PSI-99', kind: 'fact', kw: 'microgravity earth 1-g flammability spread fabric', text: 'SAFFIRE-II microgravity vs 1-g: ' + insights.saffire2.map(s => `${s.id} ${s.material || 'material not listed'}: µg burn length ${s.ug}, 1-g ${s.oneG}`).join('; ') + '.' });
  P.push({ id: 'PSI-25-f1', accession: 'PSI-25', kind: 'fact', kw: 'solid materials pmma sibal fabric flammability oxygen', text: `BASS-II tested solid materials at O₂ from ${insights.bass.o2Range[0]}% to ${insights.bass.o2Range[1]}% O2.` });
  const k = insights.psi117;
  P.push({ id: 'PSI-117-f1', accession: 'PSI-117', kind: 'fact', kw: 'droplet extinction diameter pressure low pressure', text: 'PSI-117 extinction diameter vs pressure: hot-flame extinction diameter (experiment) ' + k.hotExpt.map(x => `${x.d} mm at ${x.p} atm`).join(', ') + '; cool-flame ' + k.coolExpt.map(x => `${x.d} mm at ${x.p} atm`).join(', ') + '.' });
  P.push({ id: 'gap', accession: 'PSI-22', kind: 'fact', kw: 'partial gravity moon mars lunar', text: 'No partial-gravity combustion data exists in PSI. ACME E-FIELD uses electric fields as a buoyancy proxy. Moon and Mars results are extrapolated from microgravity data.' });
  P.push({ id: 'atm', accession: 'PSI-20', kind: 'fact', kw: 'exploration atmospheres spacecraft habitat rover oxygen pressure', text: 'NASA-considered atmospheres in ACME BRE objectives are 14.7 psia 21% O2, 10.2 psia 26.5% O2 and 8.2 psia 34% O2. Spacesuits use 100% O2 at 4.3 psi; a Moon base likely 30%+ O2 at 10.2 psi or less.' });
  return P;
}

const PASSAGES = buildPassages();
const DOCS = PASSAGES.map(p => tok(`${p.text} ${p.kw ?? ''}`));
const AVGDL = DOCS.reduce((s, d) => s + d.length, 0) / DOCS.length;
const DF = new Map<string, number>();
DOCS.forEach(d => new Set(d).forEach(w => DF.set(w, (DF.get(w) || 0) + 1)));

function bm25(qTerms: string[], di: number): number {
  const d = DOCS[di];
  const tf = new Map<string, number>();
  d.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
  let s = 0;
  for (const q of qTerms) {
    const f = tf.get(q); if (!f) continue;
    const n = DF.get(q) || 0;
    const idf = Math.log(1 + (PASSAGES.length - n + 0.5) / (n + 0.5));
    s += idf * (f * 2.2) / (f + 1.2 * (1 - 0.75 + 0.75 * d.length / AVGDL));
  }
  return s;
}

function parseConditions(q: string): { o2?: number; atm?: number } {
  const out: { o2?: number; atm?: number } = {};
  const lq = q.toLowerCase();
  const o = lq.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:o2|o₂|oxygen)/) || lq.match(/(?:o2|o₂|oxygen)[^0-9]{0,12}(\d{1,3}(?:\.\d+)?)\s*%/);
  if (o) out.o2 = parseFloat(o[1]) / 100;
  const p = lq.match(/(\d{1,2}(?:\.\d+)?)\s*psi/);
  if (p) out.atm = parseFloat(p[1]) / 14.696;
  const a = lq.match(/(\d(?:\.\d+)?)\s*atm/);
  if (a) out.atm = parseFloat(a[1]);
  if (/\b(moon|lunar)\b/.test(lq) && out.o2 === undefined) { out.o2 = 0.3; out.atm ??= 10.2 / 14.696; }
  if (/spacesuit|\bsuit\b/.test(lq) && out.o2 === undefined) { out.o2 = 1; out.atm ??= 4.3 / 14.696; }
  return out;
}

export function answerLocal(question: string): Answer {
  const base = tok(question);
  const q = [...new Set(base.concat(base.flatMap(w => SYN[w] || [])))];
  const cond = parseConditions(question);
  const scores = PASSAGES.map((p, i) => ({ p, s: bm25(q, i) * (p.kind === 'fact' ? 1.15 : 1) }));
  const byInv = new Map<string, { score: number; passages: Passage[] }>();
  for (const { p, s } of scores) {
    if (s <= 0) continue;
    const e = byInv.get(p.accession) || { score: 0, passages: [] };
    e.score = Math.max(e.score, s) + s * 0.25;
    e.passages.push(p);
    byInv.set(p.accession, e);
  }
  // condition-aware boost: investigations whose tested range covers the asked-for O₂ / pressure
  if (cond.o2 !== undefined || cond.atm !== undefined) {
    for (const i of investigations) {
      let b = 0;
      if (cond.o2 !== undefined && i.envelope.o2) b += 2 * rangeMatch(cond.o2, i.envelope.o2, SCALES.o2).s;
      if (cond.atm !== undefined && i.envelope.pAtm) b += 1.2 * rangeMatch(cond.atm, i.envelope.pAtm, SCALES.pAtm).s;
      if (b > 0.3) {
        const e = byInv.get(i.accession) || { score: 0, passages: PASSAGES.filter(p => p.accession === i.accession).slice(0, 1) };
        e.score += b; byInv.set(i.accession, e);
      }
    }
  }
  const hits: Hit[] = [...byInv.entries()]
    .map(([acc, e]) => ({ inv: byAccession[acc], score: e.score, passages: e.passages.sort((a, b) => (a.kind === 'fact' ? -1 : 1) - (b.kind === 'fact' ? -1 : 1)).slice(0, 3) }))
    .filter(h => h.inv)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const caveats: string[] = [];
  if (/moon|lunar|mars|partial/i.test(question)) caveats.push('No partial-gravity (Moon/Mars) combustion data exists in PSI. Anything about Moon or Mars here is extrapolated from microgravity tests.');
  if (cond.o2 !== undefined && cond.o2 > 0.85) caveats.push('The highest oxygen level in any PSI test is 85% (ACME CFI-G). 100% O₂ is beyond the data.');
  const intro = hits.length
    ? `Based on ${hits.length} NASA PSI investigation${hits.length > 1 ? 's' : ''} that best match your question, here is what the data says${cond.o2 !== undefined ? ` (I read your question as about ${Math.round(cond.o2 * 100)}% O₂${cond.atm ? ` at ${(cond.atm * 14.696).toFixed(1)} psi` : ''})` : ''}:`
    : 'I could not find a matching investigation. Try words like “smoke”, “oxygen”, “CO2”, “fabric”, “droplet” or a scenario like “lunar base”.';
  return { question, intro, hits, caveats };
}

export function contextForLLM(a: Answer) {
  return a.hits.map(h => ({ accession: h.inv.accession, name: invLabel(h.inv.accession), url: h.inv.psiPage, text: [h.inv.summary, ...h.passages.filter(p => p.kind === 'fact').map(p => p.text)].join(' ') }));
}

export async function askRemote(question: string, a: Answer, signal?: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context: contextForLLM(a) }), signal });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    const j = (await r.json()) as { answer?: string };
    return j.answer && j.answer.trim() ? j.answer.trim() : null;
  } catch {
    return null;
  }
}

export const SAMPLE_QUESTIONS = [
  'What happens to fire safety at a lunar base with 30% oxygen?',
  'Which gas is better at putting out fuel fires, CO2 or helium?',
  'How do smoke particles behave in microgravity for detectors?',
  'Does fabric spread fire faster in microgravity than on Earth?',
  'What is known about spacesuit fires at 100% oxygen?',
];
