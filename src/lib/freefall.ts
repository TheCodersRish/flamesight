import raw from '../data/freefall.json';
import { byAccession } from './data';
import type { Investigation } from './types';

export interface ChartSeries {
  label: string;
  kind: 'measured' | 'simulated' | 'unspecified' | string;
  inferred: boolean;
  color: number;
  n: number;
  pts: [number, number][];
}

export interface ChartPanel {
  title: string;
  x: string;
  y: string;
  clip: boolean;
  note: string;
  series: ChartSeries[];
}

export interface OutcomeSlice {
  name: string;
  n: number;
}

/** One charted case from the Flame in Freefall pack (plus the FLEX outcome summary). */
export interface FreefallStudy {
  id: string;
  acc: string;
  title: string;
  what: string;
  fuels: string[];
  cond: [string, string][][];
  warn: string[];
  file: string;
  ref: { label: string; url?: string };
  panels: ChartPanel[];
  outcomes?: OutcomeSlice[];
}

export const freefallStudies = raw.studies as FreefallStudy[];

export const studiesById: Record<string, FreefallStudy> = Object.fromEntries(freefallStudies.map(s => [s.id, s]));

export function studiesFor(acc: string): FreefallStudy[] {
  return freefallStudies.filter(s => s.acc === acc);
}

export function pointCount(study: FreefallStudy): number {
  return study.panels.reduce((n, p) => n + p.series.reduce((m, s) => m + s.pts.length, 0), 0);
}

export function conditionLines(study: FreefallStudy): [string, string][] {
  return study.cond.flat();
}

function numbersIn(text: string): number[] {
  return [...text.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => parseFloat(m[1]));
}

/** Pull a display string and a 0–1 shader oxygen level out of a condition cell. */
export function oxygenReadout(study: FreefallStudy | null, inv: Investigation | null): { label: string; visual: number } {
  const cell = study ? conditionLines(study).find(([k]) => /oxygen|o2|xo2/i.test(k)) : undefined;
  if (cell) {
    const nums = numbersIn(cell[1]);
    if (nums.length) {
      const asFrac = (n: number) => (n > 1 ? n / 100 : n);
      const fracs = nums.map(asFrac);
      const mid = fracs.reduce((a, b) => a + b, 0) / fracs.length;
      return { label: cell[1], visual: Math.min(1, Math.max(0.22, mid * 1.7)) };
    }
    return { label: cell[1], visual: 0.45 };
  }
  const range = inv?.envelope.o2;
  if (range) {
    const mid = (range[0] + range[1]) / 2;
    const lo = Math.round(range[0] * 100);
    const hi = Math.round(range[1] * 100);
    return { label: lo === hi ? `${lo}%` : `${lo}–${hi}%`, visual: Math.min(1, Math.max(0.22, mid * 1.7)) };
  }
  return { label: 'not in table', visual: 0.4 };
}

export function pressureReadout(study: FreefallStudy | null, inv: Investigation | null): string {
  const cell = study ? conditionLines(study).find(([k]) => /pressure|atm|psi/i.test(k)) : undefined;
  if (cell) return cell[1];
  const range = inv?.envelope.pAtm;
  if (range) return `${range[0]}–${range[1]} atm`;
  return 'not in table';
}

export function fuelReadout(study: FreefallStudy | null, inv: Investigation | null): string {
  if (study?.fuels.length) return study.fuels.join(', ');
  const cell = study ? conditionLines(study).find(([k]) => /fuel/i.test(k)) : undefined;
  if (cell) return cell[1];
  return inv?.keywords.slice(0, 3).join(', ') || '—';
}

export function studyContext(study: FreefallStudy) {
  const inv = byAccession[study.acc];
  const cond = conditionLines(study).map(([k, v]) => `${k}: ${v}`).join('; ');
  const text = [study.what, cond, study.warn.join(' '), inv?.summary || '', inv?.why || ''].filter(Boolean).join('\n');
  return {
    accession: study.acc,
    name: inv ? `${inv.hasAcronym ? inv.acronym : inv.title} (${study.acc})` : study.acc,
    url: inv?.psiPage || study.ref.url || 'https://psi.nasa.gov',
    text,
  };
}
