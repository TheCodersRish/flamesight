import { investigations, invLabel } from './data';
import { freefallStudies, type FreefallStudy } from './freefall';
import type { Investigation } from './types';

export interface StudyHit {
  kind: 'study';
  id: string;
  title: string;
  acc: string;
  blurb: string;
  score: number;
}

export interface InvestigationHit {
  kind: 'investigation';
  acc: string;
  title: string;
  blurb: string;
  score: number;
}

export type SearchHit = StudyHit | InvestigationHit;

export interface StudyCatalogEntry {
  accession: string;
  acronym: string;
  title: string;
  role: string;
  summary: string;
  keywords: string[];
}

/** Long free-text queries (natural language) use AI ranking instead of keyword scoring. */
export function isLongSearchQuery(query: string): boolean {
  const q = query.trim();
  if (q.length >= 40) return true;
  const words = q.split(/\s+/).filter(Boolean);
  return words.length >= 6;
}

export function catalogForAiSearch(): StudyCatalogEntry[] {
  return investigations.map(i => ({
    accession: i.accession,
    acronym: i.acronym,
    title: i.title,
    role: i.role,
    summary: i.summary,
    keywords: i.keywords.slice(0, 8),
  }));
}

function scoreText(query: string, hay: string): number {
  const q = query.toLowerCase().trim();
  if (!q || !hay) return 0;
  const h = hay.toLowerCase();
  let s = 0;
  if (h.includes(q)) s += 8 + Math.min(q.length, 24);
  for (const term of q.split(/\s+/)) {
    if (term.length < 2) continue;
    if (h.startsWith(term)) s += 4;
    else if (h.includes(term)) s += 2;
  }
  return s;
}

function studyHay(s: FreefallStudy): string {
  return [s.id, s.acc, s.title, s.what, s.fuels.join(' '), s.file, s.cond.flat().map(([k, v]) => `${k} ${v}`).join(' ')].join(' ');
}

function invHay(i: Investigation): string {
  return [i.accession, i.acronym, i.title, i.role, i.summary, i.why, i.keywords.join(' '), i.hardware, i.platform].join(' ');
}

function investigationHit(i: Investigation, score: number): InvestigationHit {
  return {
    kind: 'investigation',
    acc: i.accession,
    title: invLabel(i.accession),
    blurb: i.summary.split(/(?<=\.)\s/)[0] || i.role,
    score,
  };
}

/** Plain catalog search over investigations and charted cases. No model call. */
export function searchDatabase(query: string): SearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const s of freefallStudies) {
    const score = scoreText(q, studyHay(s));
    if (score <= 0) continue;
    hits.push({ kind: 'study', id: s.id, title: s.title, acc: s.acc, blurb: s.what, score: score + 1 });
  }
  for (const i of investigations) {
    const score = scoreText(q, invHay(i));
    if (score <= 0) continue;
    hits.push(investigationHit(i, score));
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 8);
}

/** Build hits from AI-ranked accession ids (investigations first, then matching charted cases). */
export function hitsFromAccessions(accessions: string[]): SearchHit[] {
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  accessions.forEach((acc, rank) => {
    const inv = investigations.find(i => i.accession === acc);
    if (!inv || seen.has(acc)) return;
    seen.add(acc);
    hits.push(investigationHit(inv, 1000 - rank));
    for (const s of freefallStudies) {
      if (s.acc !== acc) continue;
      hits.push({ kind: 'study', id: s.id, title: s.title, acc: s.acc, blurb: s.what, score: 900 - rank });
    }
  });
  return hits.slice(0, 8);
}

/** Ask /api/search-study to rank NASA studies for a long query. Returns null on failure. */
export async function searchStudiesRemote(query: string, signal?: AbortSignal): Promise<SearchHit[] | null> {
  try {
    const r = await fetch('/api/search-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim().slice(0, 800), catalog: catalogForAiSearch() }),
      signal,
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { accessions?: string[] };
    if (!Array.isArray(j.accessions) || !j.accessions.length) return [];
    return hitsFromAccessions(j.accessions);
  } catch {
    return null;
  }
}
