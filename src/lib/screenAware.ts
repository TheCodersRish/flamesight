import { byAccession, investigations, invLabel } from './data';
import type { SimInput, SimResult } from './knn';
import { SCENARIOS } from './scenarios';

/** A route the agent can open on the user's screen. */
export interface ScreenAction {
  path: string;
  label: string;
}

const PAGES: { match: RegExp; path: string; label: string; keys: string[] }[] = [
  { match: /^\/$/, path: '/', label: 'Dashboard', keys: ['dashboard', 'home', 'cabin', 'mission control'] },
  { match: /^\/overview$/, path: '/overview', label: 'Overview', keys: ['overview', 'big picture'] },
  { match: /^\/simulator$/, path: '/simulator', label: 'Will it burn?', keys: ['simulator', 'will it burn', 'burn test', 'prediction'] },
  { match: /^\/insights$/, path: '/insights', label: 'What NASA found', keys: ['insights', 'nasa found', 'charts', 'takeaways'] },
  { match: /^\/fluid-physics$/, path: '/fluid-physics', label: 'How flames work', keys: ['fluid physics', 'physics', 'freefall', 'how flames'] },
  { match: /^\/scenarios$/, path: '/scenarios', label: 'Rank risks', keys: ['scenarios', 'risk', 'rank risks', 'mission ranking'] },
  { match: /^\/explorer$/, path: '/explorer', label: 'Browse tests', keys: ['explorer', 'browse', 'catalog', 'all studies', 'all tests'] },
  { match: /^\/analyst$/, path: '/analyst', label: 'Ask a question', keys: ['analyst', 'full chat', 'ask page'] },
  { match: /^\/about$/, path: '/about', label: 'About', keys: ['about', 'credits', 'method'] },
  { match: /^\/changelog$/, path: '/changelog', label: 'Changelog', keys: ['changelog', 'updates', 'what changed', 'release notes'] },
];

const OPEN_RE = /\b(?:open|show|pull\s*up|bring\s*up|take\s*me\s*to|go\s*to|navigate\s*to|display|launch)\b/i;

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
  return findStudy(q) || findPage(q);
}

const DIRECTIVE = /\[\[OPEN:([^\]|]+)(?:\|([^\]]*))?\]\]/i;

/** Pull an [[OPEN:path|label]] directive out of an AI answer (if present). */
export function stripOpenDirective(text: string): { answer: string; action: ScreenAction | null } {
  const m = text.match(DIRECTIVE);
  if (!m) return { answer: text.trim(), action: null };
  const rawPath = m[1].trim();
  const label = (m[2] || '').trim() || pageLabel(rawPath.split('?')[0]);
  const path = normalizeOpenPath(rawPath);
  const answer = text.replace(DIRECTIVE, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!path) return { answer, action: null };
  return { answer, action: { path, label } };
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

/** Short chip text for the chat UI. */
export function workspaceChip(pathname: string): string {
  return pageLabel(pathname || '/');
}
