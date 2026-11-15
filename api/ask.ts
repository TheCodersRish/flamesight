// POST /api/ask
// Body: { question: string, context: { accession, name, url, text }[] }
// Streams OpenRouter tokens to the browser as SSE (text/event-stream) so answers are not cut off mid-way.
// The key stays in the Vercel environment. If the key is missing or the call fails,
// returns an error and the app keeps its local NASA-notes answer.

import { streamAnswerWithOpenRouter, type AskContext } from '../lib/openrouterServer.js';

interface Req { method?: string; body?: unknown }
interface Res {
  status: (n: number) => Res;
  json: (b: unknown) => void;
  setHeader: (k: string, v: string) => void;
  writeHead?: (n: number, h: Record<string, string>) => void;
  write: (chunk: string) => boolean;
  end: (chunk?: string) => void;
  flushHeaders?: () => void;
}

export const config = {
  supportsResponseStreaming: true,
  maxDuration: 60,
};

function writeSse(res: Res, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'POST only' });
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'No OPENROUTER_API_KEY configured; using local retrieval.' });
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { question?: string; context?: AskContext[] };
  const question = String(body?.question || '').slice(0, 500);
  const context = Array.isArray(body?.context) ? body.context.slice(0, 6) : [];
  if (!question || !context.length) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'question and context required' });
  }

  try {
    if (res.writeHead) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
    } else {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
    }
    res.flushHeaders?.();

    let full = '';
    for await (const chunk of streamAnswerWithOpenRouter({
      key,
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      question,
      context,
    })) {
      full += chunk;
      writeSse(res, { t: chunk });
    }
    writeSse(res, { done: true, answer: full.trim() });
    res.end();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'OpenRouter request failed';
    // If headers already went out as SSE, finish the stream with an error event.
    try {
      writeSse(res, { error: message.slice(0, 300) });
      res.end();
    } catch {
      return res.status(502).json({ error: message.slice(0, 300) });
    }
  }
}
