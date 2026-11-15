// GET /api/ntrs?q=... — proxy to the free NASA NTRS citations search API (avoids browser CORS).

interface Req { method?: string; query?: Record<string, string | string[] | undefined>; url?: string }
interface Res {
  status: (n: number) => Res;
  json: (b: unknown) => void;
  setHeader: (k: string, v: string) => void;
}

export const config = { maxDuration: 20 };

function qParam(req: Req, key: string): string {
  const fromQuery = req.query?.[key];
  if (typeof fromQuery === 'string') return fromQuery;
  if (Array.isArray(fromQuery) && fromQuery[0]) return fromQuery[0];
  try {
    const u = new URL(req.url || '', 'http://localhost');
    return u.searchParams.get(key) || '';
  } catch {
    return '';
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }
  const q = qParam(req, 'q').trim();
  if (!q) return res.status(400).json({ error: 'Missing q' });
  const size = Math.min(10, Math.max(1, parseInt(qParam(req, 'page.size') || '5', 10) || 5));
  const url = `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(q)}&page.size=${size}`;
  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'FlameSight/1.0 (NASA Space Apps)' },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `NTRS ${upstream.status}`, results: [] });
    }
    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 200) : 'NTRS fetch failed';
    return res.status(502).json({ error: message, results: [] });
  }
}
