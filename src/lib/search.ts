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
    hits.push({
      kind: 'investigation',
      acc: i.accession,
      title: invLabel(i.accession),
      blurb: i.summary.split(/(?<=\.)\s/)[0] || i.role,
      score,
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 8);
}
