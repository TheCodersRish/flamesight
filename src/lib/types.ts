export type Range = [number, number] | null;

export interface Envelope {
  o2: Range;
  pAtm: Range;
  flow: Range;
  sources: { o2?: string; pAtm?: string; flow?: string };
}

export interface CountInfo {
  count: number;
  unit: string;
  basis: string;
  notTests?: boolean;
}

export interface Investigation {
  accession: string;
  acronym: string;
  hasAcronym: boolean;
  title: string;
  tier: number | null;
  tierLabel: string;
  role: string;
  roleGroup: string;
  subArea: string;
  platform: string;
  hardware: string;
  start: string | null;
  end: string | null;
  startYear: number | null;
  endYear: number | null;
  objectives: string;
  keywords: string[];
  files: number | null;
  sizeGB: number | null;
  fileTypes: string;
  hasTestMatrix: boolean;
  hasAnalyzedData: boolean;
  psiPage: string;
  summary: string;
  why: string;
  count: CountInfo | null;
  envelope: Envelope;
  tables: string[];
}

export interface TestRecord {
  inv: string;
  id: string;
  fuel: string;
  fuelClass: string;
  o2: number | null;
  pAtm: number | null;
  flow: number | null;
  diluent: string | null;
  outcome: string | null;
  outcomeRaw?: string;
  burn: number | null;
  extra?: Record<string, unknown>;
}

export interface RawTable {
  name: string;
  header: string[];
  rows: string[][];
  kind: 'per-test' | 'plan' | 'daily';
}

export interface Stats {
  investigations: number;
  withTestMatrix: number;
  testsTotal: number;
  perTestRows: number;
  flamesIgnitedFromDailyTables: number;
  yearMin: number;
  yearMax: number;
  totalGB: number;
  totalTB: number;
  totalFiles: number;
  flex: { tests: number; extinction: number; disruption: number; completion: number; pctSelfExtinguished: number };
  countBasis: Record<string, CountInfo>;
  knnPool: number;
}

export interface OutcomeGroup { Extinction: number; Disruption: number; Completion: number; total: number }

export interface Insights {
  flex: {
    outcomes: { name: string; value: number }[];
    byDiluent: (OutcomeGroup & { group: string })[];
    byFuel: (OutcomeGroup & { fuel: string })[];
    byO2: (OutcomeGroup & { bin: string })[];
    scatter: { o2: number; burnTime: number; outcome: string; fuel: string; dil: string }[];
  };
  bass: {
    materials: { material: string; BASS: number; 'BASS-II': number }[];
    o2Bins: Record<string, string | number>[];
    belowAir: number;
    withO2: number;
    o2Range: [number, number];
  };
  saffire2: { id: string; material: string; thickness: string; ug: string; ugSpread: string; oneG: string; oneGSpread: string }[];
  cfig: { byO2: Record<string, string | number | null>[] };
  psi117: {
    source: string;
    hotExpt: { p: number; d: number }[];
    hotModel: { p: number; d: number }[];
    coolExpt: { p: number; d: number }[];
    coolModel: { p: number; d: number }[];
    kavgExpt: { p: number; k: number }[];
    kbModel: { p: number; k: number }[];
  };
}

export interface KnnTest {
  inv: string;
  id: string;
  fuel: string;
  fuelClass: string;
  o2: number;
  pAtm: number | null;
  flow: number | null;
  diluent: string | null;
  outcome: string | null;
  burn: number;
}

export interface FuelOption { fuel: string; fuelClass: string; n: number; invs: string[] }

export type Gravity = 'micro' | 'moon' | 'mars' | 'earth';
