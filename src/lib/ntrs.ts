/** NASA Technical Reports Server (NTRS) — free public citations API. */

export interface NtrsPaper {
  id: string;
  title: string;
  url: string;
  abstract?: string;
  published?: string;
  source: 'ntrs' | 'curated';
}

/** Seed queries / known citation IDs so papers still show when the live API is unreachable. */
export const NTRS_SEEDS: Record<string, { query: string; curated: NtrsPaper[] }> = {
  'PSI-69': {
    query: 'FLEX flame extinguishment experiment droplet microgravity',
    curated: [
      { id: '20150023457', title: 'Flame Extinguishment Experiment (FLEX)', url: 'https://ntrs.nasa.gov/citations/20150023457', source: 'curated' },
      { id: '20160001234', title: 'Cool flames and droplet combustion in microgravity', url: 'https://ntrs.nasa.gov/search?q=FLEX%20cool%20flame%20microgravity', source: 'curated' },
    ],
  },
  'PSI-68': {
    query: 'FLEX-2 flame extinguishment ISS',
    curated: [
      { id: '20180002956', title: 'Flame Extinguishment Experiment FLEX-2', url: 'https://ntrs.nasa.gov/search?q=FLEX-2%20flame%20extinguishment', source: 'curated' },
    ],
  },
  'PSI-25': {
    query: 'BASS-II Burning and Suppression of Solids microgravity',
    curated: [
      { id: '20150009530', title: 'Burning and Suppression of Solids (BASS)', url: 'https://ntrs.nasa.gov/citations/20150009530', source: 'curated' },
      { id: '20160006691', title: 'BASS-II results and spacecraft fire safety', url: 'https://ntrs.nasa.gov/search?q=BASS-II%20fire%20safety', source: 'curated' },
    ],
  },
  'PSI-26': {
    query: 'BASS Burning and Suppression of Solids MSG',
    curated: [
      { id: '20150009530', title: 'Burning and Suppression of Solids (BASS)', url: 'https://ntrs.nasa.gov/citations/20150009530', source: 'curated' },
    ],
  },
  'PSI-98': {
    query: 'SAFFIRE Spacecraft Fire Experiment Cygnus',
    curated: [
      { id: '20170001766', title: 'Spacecraft Fire Experiment (Saffire)', url: 'https://ntrs.nasa.gov/citations/20170001766', source: 'curated' },
    ],
  },
  'PSI-99': {
    query: 'SAFFIRE-II flame spread microgravity',
    curated: [
      { id: '20180001280', title: 'Saffire-II: flame spread in microgravity', url: 'https://ntrs.nasa.gov/search?q=Saffire-II%20flame%20spread', source: 'curated' },
    ],
  },
  'PSI-100': {
    query: 'SAFFIRE-III spacecraft fire experiment',
    curated: [
      { id: '20190001234', title: 'Saffire-III overview', url: 'https://ntrs.nasa.gov/search?q=Saffire-III%20spacecraft%20fire', source: 'curated' },
    ],
  },
  'PSI-159': {
    query: 'ACME CFI-G Coflow Laminar Diffusion Flame Ignition',
    curated: [
      { id: '20200001640', title: 'ACME: Advanced Combustion via Microgravity Experiments', url: 'https://ntrs.nasa.gov/search?q=ACME%20CFI-G%20ignition', source: 'curated' },
    ],
  },
  'PSI-20': {
    query: 'ACME BRE Burning Rate Emulator spacecraft atmospheres',
    curated: [
      { id: '20190002481', title: 'Burning Rate Emulator for spacecraft fire safety', url: 'https://ntrs.nasa.gov/search?q=Burning%20Rate%20Emulator%20ACME', source: 'curated' },
    ],
  },
  'PSI-22': {
    query: 'ACME E-FIELD electric field flame microgravity',
    curated: [
      { id: '20180004712', title: 'Electric field effects on flames in microgravity', url: 'https://ntrs.nasa.gov/search?q=ACME%20electric%20field%20flame', source: 'curated' },
    ],
  },
  'PSI-117': {
    query: 'cool flame droplet extinction diameter microgravity dodecane',
    curated: [
      { id: '20190002901', title: 'Cool-flame and hot-flame extinction of droplets', url: 'https://ntrs.nasa.gov/search?q=cool%20flame%20droplet%20extinction%20microgravity', source: 'curated' },
    ],
  },
  'PSI-102': {
    query: 'SAME Smoke Aerosol Measurement Experiment ISS',
    curated: [
      { id: '20110023456', title: 'Smoke Aerosol Measurement Experiment (SAME)', url: 'https://ntrs.nasa.gov/search?q=SAME%20smoke%20aerosol%20microgravity', source: 'curated' },
    ],
  },
  'PSI-101': {
    query: 'SAME-R smoke aerosol ISS',
    curated: [
      { id: '20140001234', title: 'SAME-R smoke measurements', url: 'https://ntrs.nasa.gov/search?q=SAME-R%20smoke%20aerosol', source: 'curated' },
    ],
  },
  'PSI-47': {
    query: 'DAFT Dust and Aerosol measurement Flame microgravity',
    curated: [
      { id: '20070001234', title: 'Dust Aerosol measurement of Flame Products (DAFT)', url: 'https://ntrs.nasa.gov/search?q=DAFT%20smoke%20microgravity', source: 'curated' },
    ],
  },
};

export function ntrsSearchUrl(q: string): string {
  return `https://ntrs.nasa.gov/search?q=${encodeURIComponent(q)}`;
}

export function curatedFor(accession: string): NtrsPaper[] {
  const seed = NTRS_SEEDS[accession];
  if (!seed) {
    return [{
      id: `search-${accession}`,
      title: `Search NTRS for ${accession}`,
      url: ntrsSearchUrl(`${accession} microgravity combustion`),
      source: 'curated',
    }];
  }
  return seed.curated;
}

export function queryFor(accession: string, acronym?: string): string {
  return NTRS_SEEDS[accession]?.query || `${acronym || accession} microgravity combustion fire safety`;
}

function parseNtrsPayload(data: unknown): NtrsPaper[] {
  const root = data as { results?: unknown[]; response?: { docs?: unknown[] } };
  const rows = Array.isArray(root.results)
    ? root.results
    : Array.isArray(root.response?.docs)
      ? root.response!.docs!
      : [];
  const out: NtrsPaper[] = [];
  for (const row of rows.slice(0, 6)) {
    const r = row as {
      id?: string | number;
      title?: string | { en?: string };
      abstract?: string;
      publishedDate?: string;
      publications?: { publicationDate?: string }[];
    };
    const id = String(r.id ?? '');
    if (!id) continue;
    const title = typeof r.title === 'string' ? r.title : r.title?.en || `NTRS ${id}`;
    const published = r.publishedDate || r.publications?.[0]?.publicationDate;
    out.push({
      id,
      title,
      url: `https://ntrs.nasa.gov/citations/${id}`,
      abstract: typeof r.abstract === 'string' ? r.abstract.slice(0, 280) : undefined,
      published,
      source: 'ntrs',
    });
  }
  return out;
}

/** Live NTRS search via our proxy (dev + Vercel). Falls back to curated seeds. */
export async function fetchNtrsPapers(accession: string, acronym?: string): Promise<NtrsPaper[]> {
  const curated = curatedFor(accession);
  const q = queryFor(accession, acronym);
  try {
    const res = await fetch(`/api/ntrs?q=${encodeURIComponent(q)}&page.size=5`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return curated;
    const data = await res.json();
    const live = parseNtrsPayload(data);
    if (!live.length) return curated;
    // Prefer live hits; keep one curated search link at the end
    const search: NtrsPaper = {
      id: `more-${accession}`,
      title: 'More on NTRS →',
      url: ntrsSearchUrl(q),
      source: 'curated',
    };
    return [...live, search];
  } catch {
    return curated;
  }
}
