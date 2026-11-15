// POST /api/search-study
// Body: { query: string, catalog: StudyCatalogEntry[] }
// Uses OpenRouter to rank NASA PSI studies for a long natural-language search string.
// Key stays in the Vercel environment. On failure the client keeps keyword search.

import { matchStudiesWithOpenRouter, type StudyCatalogEntry } from '../lib/openrouterServer.js';

interface Req { method?: string; body?: unknown }
interface Res {
  status: (n: number) => Res;
  json: (b: unknown) => void;
  setHeader: (k: string, v: string) => void;
}

export const config = {
  maxDuration: 30,
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'POST only' });
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'No OPENROUTER_API_KEY configured; using local search.' });
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
    query?: string;
    catalog?: StudyCatalogEntry[];
  };
  const query = String(body?.query || '').trim().slice(0, 800);
  const catalog = Array.isArray(body?.catalog) ? body.catalog.slice(0, 40) : [];
  if (!query || !catalog.length) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'query and catalog required' });
  }

  try {
    const accessions = await matchStudiesWithOpenRouter({
      key,
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      query,
      catalog,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ accessions });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'OpenRouter study match failed';
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: message.slice(0, 300) });
  }
}
