import investigationsJson from '../data/generated/investigations.json';
import statsJson from '../data/generated/stats.json';
import insightsJson from '../data/generated/insights.json';
import knnJson from '../data/generated/knn.json';
import type { Investigation, Stats, Insights, KnnTest, FuelOption, TestRecord, RawTable } from './types';

// All JSON is generated from NASA PSI CSVs by scripts/build-data.mjs. Nothing here is hand-typed.
export const investigations = investigationsJson as unknown as Investigation[];
export const stats = statsJson as unknown as Stats;
export const insights = insightsJson as unknown as Insights;
export const knnPool = (knnJson as unknown as { pool: KnnTest[] }).pool;
export const fuelOptions = (knnJson as unknown as { fuels: FuelOption[] }).fuels;

export const byAccession: Record<string, Investigation> = Object.fromEntries(investigations.map(i => [i.accession, i]));

export function invLabel(acc: string): string {
  const i = byAccession[acc];
  if (!i) return acc;
  return i.hasAcronym ? `${i.acronym} (${acc})` : acc;
}

// Large tables are split out and loaded on demand.
let testsCache: Promise<TestRecord[]> | null = null;
let tablesCache: Promise<Record<string, RawTable[]>> | null = null;
export function loadTests(): Promise<TestRecord[]> {
  testsCache ||= import('../data/generated/tests.json').then(m => m.default as unknown as TestRecord[]);
  return testsCache;
}
export function loadTables(): Promise<Record<string, RawTable[]>> {
  tablesCache ||= import('../data/generated/tables.json').then(m => m.default as unknown as Record<string, RawTable[]>);
  return tablesCache;
}

export const PSI_HOME = 'https://psi.nasa.gov';

export const fmt = {
  pct: (x: number | null | undefined, d = 0) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(d)}%`),
  num: (x: number | null | undefined, d = 2) => (x === null || x === undefined ? '—' : Number(x.toFixed(d)).toLocaleString()),
  atmToPsi: (atm: number) => atm * 14.696,
  psiToAtm: (psi: number) => psi / 14.696,
  range: (r: [number, number] | null, f: (n: number) => string) => (!r ? 'not in table' : r[0] === r[1] ? f(r[0]) : `${f(r[0])} – ${f(r[1])}`),
};
