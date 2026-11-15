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
  'You are FlameSight, a fire-safety guide for NASA Space Apps. Answer ONLY from the numbered NASA PSI sources given. ' +
  'Cite sources inline like (PSI-69). If the sources do not answer the question, say so. Never invent numbers. ' +
  'Moon/Mars conditions have no partial-gravity combustion data in PSI: label any such statement as extrapolated. ' +
  'The flame animation is illustrative, not a combustion simulation. ' +
  'Write 3–6 short everyday sentences a non-scientist can follow. Prefer plain words; if you must use a technical term, define it in the same sentence.';

// Gemini 3 thinking tokens count against maxOutputTokens. Keep thinking minimal and leave room for a full answer.
const MAX_OUT = 8192;

function buildBody(question: string, context: AskContext[]) {
  const sources = context
    .map((c, i) => `[${i + 1}] ${c.name} — ${c.url}\n${String(c.text).slice(0, 1800)}`)
    .join('\n\n');
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: `Question: ${question}\n\nSources:\n${sources}` }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: MAX_OUT,
      // Default Gemini 3 thinking is "high" and can eat the whole token budget, cutting answers mid-sentence.
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
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
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
}

function partText(j: GeminiChunk): string {
  // Skip internal "thought" parts so only the user-facing answer streams to the browser.
  return j.candidates?.[0]?.content?.parts
    ?.filter(p => !p.thought)
    .map(p => p.text || '')
    .join('') || '';
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

export interface StudyCatalogEntry {
  accession: string;
  acronym: string;
  title: string;
  role: string;
  summary: string;
  keywords: string[];
}

const MATCH_SYSTEM =
  'You match natural-language descriptions to NASA PSI combustion investigations. ' +
  'Return ONLY valid JSON: {"accessions":["PSI-…",…]} ranked best-first. ' +
  'Pick only from the catalog. Prefer 1–5 matches. If nothing fits, return {"accessions":[]}.';

/** Rank catalog studies for a long free-text query. Returns accession ids best-first. */
export async function matchStudiesWithGemini(opts: {
  key: string;
  model: string;
  query: string;
  catalog: StudyCatalogEntry[];
}): Promise<string[]> {
  const query = String(opts.query || '').trim().slice(0, 800);
  const catalog = (opts.catalog || []).slice(0, 40);
  if (!query || !catalog.length) throw new Error('query and catalog required');

  const allowed = new Set(catalog.map(c => c.accession));
  const listing = catalog
    .map(c => {
      const name = c.acronym && c.acronym !== c.accession ? `${c.acronym} (${c.accession})` : c.accession;
      const kw = (c.keywords || []).slice(0, 8).join(', ');
      return `- ${name}: ${c.title}. Role: ${c.role}. ${String(c.summary || '').slice(0, 220)}${kw ? ` Keywords: ${kw}.` : ''}`;
    })
    .join('\n');

  const body = {
    systemInstruction: { parts: [{ text: MATCH_SYSTEM }] },
    contents: [{
      role: 'user',
      parts: [{ text: `User search:\n${query}\n\nCatalog:\n${listing}\n\nJSON:` }],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`;
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

  const j = (await r.json()) as GeminiChunk;
  if (j.error?.message) throw new Error(j.error.message);
  const raw = partText(j).trim();
  if (!raw) throw new Error('Gemini returned an empty match list');

  let parsed: { accessions?: unknown };
  try {
    parsed = JSON.parse(raw) as { accessions?: unknown };
  } catch {
    // Model sometimes wraps JSON in fences or prose — pull the first array-looking blob.
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Gemini match response was not JSON');
    parsed = JSON.parse(m[0]) as { accessions?: unknown };
  }

  const list = Array.isArray(parsed.accessions) ? parsed.accessions : [];
  const out: string[] = [];
  for (const item of list) {
    const acc = String(item || '').trim().toUpperCase();
    // Catalog uses mixed case like PSI-25; normalize lookup.
    const hit = [...allowed].find(a => a.toUpperCase() === acc);
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out.slice(0, 8);
}
