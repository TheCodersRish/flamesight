import { byAccession, investigations, invLabel } from './data';
import type { Diluent, SimInput, SimResult } from './knn';
import { SCENARIOS } from './scenarios';
import type { Gravity } from './types';

/** A route the agent can open on the user's screen. */
export interface ScreenAction {
  path: string;
  label: string;
}

/** Conditions the agent wants to run on Will It Burn (always opens fullscreen). */
export interface SimAction {
  input: SimInput;
  label: string;
}

const DEFAULT_SIM: SimInput = {
  fuel: 'any',
  o2: 0.21,
  psi: 14.7,
  flow: 20,
  gravity: 'micro',
  diluent: 'none',
};

/** Will It Burn path that enters the immersive fullscreen stage. */
export const SIM_FULL_PATH = '/simulator?full=1';

const PAGES: { match: RegExp; path: string; label: string; keys: string[] }[] = [
  { match: /^\/$/, path: '/', label: 'Dashboard', keys: ['dashboard', 'home', 'cabin', 'mission control'] },
  { match: /^\/overview$/, path: '/overview', label: 'Overview', keys: ['overview', 'big picture'] },
  { match: /^\/simulator$/, path: '/simulator', label: 'Will it burn?', keys: ['simulator', 'will it burn', 'burn test', 'prediction'] },
  { match: /^\/insights$/, path: '/insights', label: 'What NASA found', keys: ['insights', 'nasa found', 'charts', 'takeaways'] },
  { match: /^\/fluid-physics$/, path: '/fluid-physics', label: 'How flames work', keys: ['fluid physics', 'physics', 'freefall', 'how flames'] },
  { match: /^\/scenarios$/, path: '/scenarios', label: 'Rank risks', keys: ['scenarios', 'risk', 'rank risks', 'mission ranking'] },
  { match: /^\/explorer$/, path: '/explorer', label: 'Browse tests', keys: ['explorer', 'browse', 'catalog', 'all studies', 'all tests'] },
  { match: /^\/analyst$/, path: '/analyst', label: 'Ask a question', keys: ['analyst', 'full chat', 'ask page'] },
  { match: /^\/impact$/, path: '/impact', label: 'Test next', keys: ['test next', 'impact', 'gap finder', 'gaps', 'mission report', 'case studies', 'what nasa should test'] },
  { match: /^\/about$/, path: '/about', label: 'About', keys: ['about', 'credits', 'method'] },
  { match: /^\/changelog$/, path: '/changelog', label: 'Changelog', keys: ['changelog', 'updates', 'what changed', 'release notes'] },
];

const OPEN_RE = /\b(?:open|show|pull\s*up|bring\s*up|take\s*me\s*to|go\s*to|navigate\s*to|display|launch)\b/i;
const SIM_RE = /\b(?:simulate|run\s+(?:a\s+)?(?:burn|simulation|test)|set\s+(?:the\s+)?conditions?|try\s+(?:these\s+)?conditions?|what\s+if\s+(?:we\s+)?(?:set|use|run)|dial\s+in)\b/i;

function pageLabel(pathname: string): string {
  if (pathname.startsWith('/explorer/')) {
    const acc = pathname.split('/')[2]?.toUpperCase() || '';
    const inv = byAccession[acc];
    if (inv) return `Experiment ${invLabel(acc)}`;
    return `Experiment ${acc || 'detail'}`;
  }
  const hit = PAGES.find(p => p.match.test(pathname));
  return hit?.label || pathname;
}

function findStudy(token: string): ScreenAction | null {
  const q = token.trim().toLowerCase().replace(/[₂]/g, '2');
  if (!q) return null;
  const accHit = q.match(/\bpsi[-\s]?(\d+)\b/i);
  if (accHit) {
    const acc = `PSI-${accHit[1]}`;
    const inv = byAccession[acc];
    if (inv) return { path: `/explorer/${acc}`, label: invLabel(acc) };
  }
  for (const inv of investigations) {
    const acronym = (inv.acronym || '').toLowerCase();
    const title = inv.title.toLowerCase();
    if (acronym && acronym.length >= 3 && (q === acronym || q.includes(acronym) || new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q))) {
      return { path: `/explorer/${inv.accession}`, label: invLabel(inv.accession) };
    }
    if (q.length >= 8 && title.includes(q)) {
      return { path: `/explorer/${inv.accession}`, label: invLabel(inv.accession) };
    }
  }
  // Common nicknames that are not exact acronym matches
  const aliases: [RegExp, string][] = [
    [/\bflex[-\s]?2\b/i, 'PSI-148'],
    [/\bflex\b/i, 'PSI-69'],
    [/\bbass[-\s]?ii\b/i, 'PSI-25'],
    [/\bbass\b/i, 'PSI-22'],
    [/\bsaffire[-\s]?iii\b/i, 'PSI-100'],
    [/\bsaffire[-\s]?ii\b/i, 'PSI-99'],
    [/\bsaffire[-\s]?i\b|\bsaffire\b/i, 'PSI-98'],
    [/\bcfi[-\s]?g\b/i, 'PSI-159'],
  ];
  for (const [re, acc] of aliases) {
    if (re.test(token) && byAccession[acc]) return { path: `/explorer/${acc}`, label: invLabel(acc) };
  }
  return null;
}

function findPage(q: string): ScreenAction | null {
  const lower = q.toLowerCase();
  for (const page of PAGES) {
    if (page.keys.some(k => lower.includes(k))) return { path: page.path, label: page.label };
  }
  // Mission scenarios → risk ranking with query
  for (const s of SCENARIOS) {
    const keys = [s.id, s.name, s.short].map(x => x.toLowerCase());
    if (keys.some(k => k.length > 2 && lower.includes(k))) {
      return { path: `/scenarios?s=${encodeURIComponent(s.id)}`, label: `${s.name} risk ranking` };
    }
  }
  if (/\blunar\s*base\b|\bmoon\s*base\b/i.test(q)) {
    return { path: '/scenarios?s=lunar', label: 'Lunar Base risk ranking' };
  }
  return null;
}

/** Plain-English snapshot of what the user is looking at right now. */
export function describeWorkspace(opts: {
  pathname: string;
  search?: string;
  burn?: { input: SimInput; result: SimResult };
}): string {
  const path = opts.pathname || '/';
  const parts: string[] = [`They are on: ${pageLabel(path)} (${path}${opts.search || ''}).`];

  if (path.startsWith('/explorer/')) {
    const acc = path.split('/')[2]?.toUpperCase() || '';
    const inv = byAccession[acc];
    if (inv) {
      parts.push(`Open study: ${invLabel(acc)} — ${inv.role}. ${inv.summary.slice(0, 280)}`);
    }
  }

  if (opts.burn) {
    const { input, result } = opts.burn;
    const o2 = Math.round(input.o2 * 100);
    parts.push(
      `Will-it-burn knobs: fuel=${input.fuel}, O₂=${o2}%, pressure=${input.psi} psi, flow=${input.flow} cm/s, gravity=${input.gravity}, diluent=${input.diluent}.`,
    );
    parts.push(`Latest prediction: ${result.verdict} (burn score ${Math.round(result.p * 100)}/100, confidence ${Math.round(result.confidence * 100)}%).`);
  }

  if (path === '/scenarios' && opts.search) {
    const id = new URLSearchParams(opts.search.replace(/^\?/, '')).get('s');
    const sc = SCENARIOS.find(s => s.id === id);
    if (sc) parts.push(`Selected mission scenario: ${sc.name} (${Math.round(sc.o2 * 100)}% O₂ @ ${sc.psi} psi).`);
  }

  return parts.join(' ');
}

/**
 * If the user asks to open / show / pull something up, resolve a screen action.
 * Works offline without the LLM.
 */
export function intentToOpen(question: string): ScreenAction | null {
  const q = question.trim();
  if (!q || !OPEN_RE.test(q)) return null;
  // Prefer simulate when they clearly want conditions run on Will It Burn
  if (SIM_RE.test(q) && intentToSimulate(q)) return null;
  return findStudy(q) || findPage(q);
}

/**
 * If the user asks to simulate / dial in cabin conditions, resolve a Will It Burn run.
 * Always pairs with fullscreen mode. Works offline without the LLM.
 */
export function intentToSimulate(question: string): SimAction | null {
  const q = question.trim();
  if (!q || !SIM_RE.test(q)) return null;

  for (const s of SCENARIOS) {
    const keys = [s.id, s.name, s.short, `${s.short} base`, `${s.name} cabin`].map(x => x.toLowerCase());
    if (keys.some(k => k.length > 2 && q.toLowerCase().includes(k))) {
      return {
        input: { fuel: 'any', o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity, diluent: 'none' },
        label: `${s.name} conditions`,
      };
    }
  }
  if (/\blunar\s*base\b|\bmoon\s*base\b|\bmoon\s*cabin\b/i.test(q)) {
    const s = SCENARIOS.find(x => x.id === 'lunar')!;
    return { input: { fuel: 'any', o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity, diluent: 'none' }, label: 'Lunar Base conditions' };
  }

  const parsed = parseSimSpec(q);
  if (!parsed) return null;
  return { input: parsed, label: describeSim(parsed) };
}

const OPEN_DIRECTIVE = /\[\[OPEN:([^\]|]+)(?:\|([^\]]*))?\]\]/i;
const SIM_DIRECTIVE = /\[\[SIMULATE:([^\]|]+)(?:\|([^\]]*))?\]\]/i;

/** Pull [[OPEN:…]] / [[SIMULATE:…]] directives out of an AI answer (if present). */
export function stripOpenDirective(text: string): {
  answer: string;
  action: ScreenAction | null;
  simulate: SimAction | null;
} {
  let answer = text;
  let action: ScreenAction | null = null;
  let simulate: SimAction | null = null;

  const sim = answer.match(SIM_DIRECTIVE);
  if (sim) {
    const spec = sim[1].trim();
    const label = (sim[2] || '').trim();
    const input = parseSimSpec(spec);
    answer = answer.replace(SIM_DIRECTIVE, '');
    if (input) simulate = { input, label: label || describeSim(input) };
  }

  const open = answer.match(OPEN_DIRECTIVE);
  if (open) {
    const rawPath = open[1].trim();
    const label = (open[2] || '').trim() || pageLabel(rawPath.split('?')[0]);
    const path = normalizeOpenPath(rawPath);
    answer = answer.replace(OPEN_DIRECTIVE, '');
    if (path) action = { path, label };
  }

  return { answer: answer.replace(/\n{3,}/g, '\n\n').trim(), action, simulate };
}

function normalizeOpenPath(raw: string): string | null {
  let path = raw.trim();
  if (!path.startsWith('/')) path = `/${path}`;
  const base = path.split('?')[0];
  if (base.startsWith('/explorer/')) {
    const acc = base.split('/')[2]?.toUpperCase() || '';
    if (!byAccession[acc]) return null;
    return `/explorer/${acc}${path.includes('?') ? `?${path.split('?')[1]}` : ''}`;
  }
  if (PAGES.some(p => p.path === base) || base === '/') return path;
  // Allow scenario deep-links
  if (base === '/scenarios') return path;
  return null;
}

function parseO2(raw: string): number | null {
  const t = raw.trim().replace(/%$/, '');
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  // 30 or 30% → 0.30; already-fraction 0.3 stays 0.3
  const frac = n > 1 ? n / 100 : n;
  if (frac < 0.05 || frac > 1) return null;
  return frac;
}

function parseGravity(raw: string): Gravity | null {
  const t = raw.trim().toLowerCase();
  if (t === 'micro' || t === 'µg' || t === 'ug' || t === 'iss' || t === 'zero-g' || t === '0g') return 'micro';
  if (t === 'moon' || t === 'lunar') return 'moon';
  if (t === 'mars' || t === 'martian') return 'mars';
  if (t === 'earth' || t === '1g' || t === 'one-g') return 'earth';
  return null;
}

function parseDiluent(raw: string): Diluent | null {
  const t = raw.trim().toLowerCase().replace(/₂/g, '2');
  if (t === 'none' || t === 'no' || t === 'air') return 'none';
  if (t === 'co2' || t === 'carbon dioxide') return 'CO2';
  if (t === 'he' || t === 'helium') return 'He';
  return null;
}

/** Parse key=value pairs, a scenario preset id, or loose natural-language numbers into SimInput. */
export function parseSimSpec(spec: string): SimInput | null {
  const raw = spec.trim();
  if (!raw) return null;

  // preset=lunar or bare scenario id
  const presetHit = raw.match(/(?:^|[,;\s])(?:preset|scenario|mission)\s*=\s*([a-z]+)/i)
    || (/^(iss|lunar|mars|rover|suit)$/i.test(raw) ? [null, raw] as const : null);
  if (presetHit) {
    const id = String(presetHit[1]).toLowerCase();
    const s = SCENARIOS.find(x => x.id === id);
    if (s) return { fuel: 'any', o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity, diluent: 'none' };
  }
  for (const s of SCENARIOS) {
    if (new RegExp(`\\b${s.id}\\b`, 'i').test(raw) && /preset|scenario|mission|=/.test(raw)) {
      return { fuel: 'any', o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity, diluent: 'none' };
    }
  }

  const next: SimInput = { ...DEFAULT_SIM };
  let touched = false;

  const pairs = raw.matchAll(/(?:^|[,;\s])([a-z_]+)\s*=\s*([^,;|]+)/gi);
  for (const m of pairs) {
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'o2' || key === 'oxygen') {
      const o2 = parseO2(val);
      if (o2 != null) { next.o2 = o2; touched = true; }
    } else if (key === 'psi' || key === 'pressure' || key === 'p') {
      const n = Number(val.replace(/psi$/i, ''));
      if (Number.isFinite(n) && n >= 1 && n <= 50) { next.psi = n; touched = true; }
    } else if (key === 'flow' || key === 'airflow') {
      const n = Number(val.replace(/cm\/?s$/i, ''));
      if (Number.isFinite(n) && n >= 0 && n <= 80) { next.flow = n; touched = true; }
    } else if (key === 'gravity' || key === 'g') {
      const g = parseGravity(val);
      if (g) { next.gravity = g; touched = true; }
    } else if (key === 'diluent' || key === 'gas' || key === 'suppressant') {
      const d = parseDiluent(val);
      if (d) { next.diluent = d; touched = true; }
    } else if (key === 'fuel' || key === 'material') {
      if (val) { next.fuel = val; touched = true; }
    } else if (key === 'preset' || key === 'scenario' || key === 'mission') {
      const s = SCENARIOS.find(x => x.id === val.toLowerCase());
      if (s) {
        next.o2 = s.o2; next.psi = s.psi; next.flow = s.flow; next.gravity = s.gravity;
        touched = true;
      }
    }
  }

  // Loose natural language: "30% oxygen", "10.2 psi", "microgravity", "CO2"
  if (!touched) {
    const o2m = raw.match(/(\d{1,3}(?:\.\d+)?)\s*%?\s*(?:oxygen|o₂|o2)\b/i)
      || raw.match(/(?:oxygen|o₂|o2)\s*(?:at|=|:)?\s*(\d{1,3}(?:\.\d+)?)\s*%?/i);
    if (o2m) {
      const o2 = parseO2(o2m[1]);
      if (o2 != null) { next.o2 = o2; touched = true; }
    }
    const psim = raw.match(/(\d{1,2}(?:\.\d+)?)\s*psi\b/i);
    if (psim) {
      const n = Number(psim[1]);
      if (n >= 1 && n <= 50) { next.psi = n; touched = true; }
    }
    const flowm = raw.match(/(\d{1,2}(?:\.\d+)?)\s*cm\/?s\b/i);
    if (flowm) {
      const n = Number(flowm[1]);
      if (n >= 0 && n <= 80) { next.flow = n; touched = true; }
    }
    if (/\bmicro(?:gravity)?\b|\bzero[\s-]?g\b|\biss\b/i.test(raw)) { next.gravity = 'micro'; touched = true; }
    else if (/\bmoon\b|\blunar\b/i.test(raw)) { next.gravity = 'moon'; touched = true; }
    else if (/\bmars\b|\bmartian\b/i.test(raw)) { next.gravity = 'mars'; touched = true; }
    else if (/\bearth\b|\b1[\s-]?g\b/i.test(raw)) { next.gravity = 'earth'; touched = true; }
    if (/\bco₂\b|\bco2\b|\bcarbon dioxide\b/i.test(raw)) { next.diluent = 'CO2'; touched = true; }
    else if (/\bhelium\b|\bhe\b/i.test(raw)) { next.diluent = 'He'; touched = true; }
  }

  return touched ? next : null;
}

export function describeSim(input: SimInput): string {
  const o2 = Math.round(input.o2 * 100);
  const bits = [`${o2}% O₂`, `${input.psi} psi`, input.gravity];
  if (input.diluent !== 'none') bits.push(input.diluent === 'CO2' ? 'CO₂' : 'Helium');
  if (input.fuel && input.fuel !== 'any') bits.push(input.fuel);
  return bits.join(' · ');
}

/** Short chip text for the chat UI. */
export function workspaceChip(pathname: string): string {
  return pageLabel(pathname || '/');
}
