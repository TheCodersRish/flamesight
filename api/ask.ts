// POST /api/ask
// Body: { question: string, context: { accession, name, url, text }[] }
// Uses GEMINI_API_KEY from the server environment. The key is never sent to the browser.
// If the key is missing or the call fails, returns an error and the app keeps its local answer.

import { answerWithGemini, type AskContext } from './gemini';

interface Req { method?: string; body?: unknown }
interface Res { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void }

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'No GEMINI_API_KEY configured; using local retrieval.' });

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { question?: string; context?: AskContext[] };
  const question = String(body?.question || '').slice(0, 500);
  const context = Array.isArray(body?.context) ? body.context.slice(0, 6) : [];
  if (!question || !context.length) return res.status(400).json({ error: 'question and context required' });

  try {
    const answer = await answerWithGemini({
      key,
      model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
      question,
      context,
    });
    return res.status(200).json({ answer });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gemini request failed';
    return res.status(502).json({ error: message.slice(0, 300) });
  }
}
