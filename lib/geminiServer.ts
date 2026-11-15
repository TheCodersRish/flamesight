// Server-only Gemini call. The key is read from the environment and never sent to the browser.
// Lives outside /api so Vercel does not treat it as its own serverless entrypoint.
// Uses streamGenerateContent so tokens reach the client as they arrive (avoids mid-answer cutoffs).

export interface AskContext {
  accession: string;
  name: string;
  url: string;
  text: string;
}

const SYSTEM =
  'You are FlameSight, a fire-safety analyst for NASA Space Apps. Answer ONLY from the numbered NASA PSI sources given. ' +
  'Cite sources inline like (PSI-69). If the sources do not answer the question, say so. Never invent numbers. ' +
  'Moon/Mars conditions have no partial-gravity combustion data in PSI: label any such statement as extrapolated. ' +
  'The flame animation is illustrative, not a combustion simulation. ' +
  'Write 3–6 short sentences at a senior high-school / first-year university level. Keep technical terms when useful and briefly define the hardest jargon in place.';

const MAX_OUT = 2048;

function buildBody(question: string, context: AskContext[]) {
  const sources = context
    .map((c, i) => `[${i + 1}] ${c.name} — ${c.url}\n${String(c.text).slice(0, 1800)}`)
    .join('\n\n');
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: `Question: ${question}\n\nSources:\n${sources}` }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: MAX_OUT },
  };
}

function prepare(opts: { question: string; context: AskContext[] }) {
  const question = opts.question.slice(0, 500);
  const context = opts.context.slice(0, 6);
  if (!question || !context.length) throw new Error('question and context required');
  return { question, context, body: buildBody(question, context) };
}

interface GeminiChunk {
  error?: { message?: string };
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

function partText(j: GeminiChunk): string {
  return j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
}

/** Yield incremental text deltas from Gemini SSE streaming. */
export async function* streamAnswerWithGemini(opts: {
  key: string;
  model: string;
  question: string;
  context: AskContext[];
}): AsyncGenerator<string> {
  const { body } = prepare(opts);
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:streamGenerateContent?alt=sse`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': opts.key,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    let message = `Gemini error ${r.status}`;
    try {
      const j = (await r.json()) as { error?: { message?: string } };
      if (j.error?.message) message = j.error.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (!r.body) throw new Error('Gemini returned an empty stream');

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let yielded = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const json = event
        .split('\n')
        .filter(l => l.startsWith('data: '))
        .map(l => l.slice(6))
        .join('');
      if (!json || json === '[DONE]') continue;
      let parsed: GeminiChunk;
      try {
        parsed = JSON.parse(json) as GeminiChunk;
      } catch {
        continue;
      }
      if (parsed.error?.message) throw new Error(parsed.error.message);
      const text = partText(parsed);
      if (text) {
        yielded = true;
        yield text;
      }
    }
  }

  if (!yielded) throw new Error('Gemini returned an empty answer');
}

/** Collect a full answer (used when a caller does not need live tokens). */
export async function answerWithGemini(opts: {
  key: string;
  model: string;
  question: string;
  context: AskContext[];
}): Promise<string> {
  let out = '';
  for await (const chunk of streamAnswerWithGemini(opts)) out += chunk;
  const text = out.trim();
  if (!text) throw new Error('Gemini returned an empty answer');
  return text;
}
