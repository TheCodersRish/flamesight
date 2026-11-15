// Server-only OpenRouter call. The key is read from the environment and never sent to the browser.
// Lives outside /api so Vercel does not treat it as its own serverless entrypoint.
// Uses OpenAI-compatible chat completions streaming so tokens reach the client as they arrive.

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
  'You can see what the user is working on from the Workspace line — use it to tailor the answer. ' +
  'If they ask to open, show, or pull something up on screen, end with exactly one directive on its own line: ' +
  '[[OPEN:/path|short label]] using an app route such as /simulator, /insights, /scenarios, /scenarios?s=lunar, /explorer, /explorer/PSI-69, /analyst, /impact, /overview, /fluid-physics, /about, /changelog, or /. ' +
  'The Test next page (/impact: gap finder, mission reports, case studies) is AI-only — open it when they ask for those tools; it is not in the side menu. ' +
  'If they ask to simulate, dial in, or try cabin/burn conditions (oxygen, pressure, gravity, airflow, suppressant, fuel, or a mission preset), end with exactly one directive on its own line: ' +
  '[[SIMULATE:key=value,…|short label]] with keys preset|o2|psi|flow|gravity|diluent|fuel ' +
  '(examples: [[SIMULATE:preset=lunar|Lunar Base]], [[SIMULATE:o2=0.3,psi=10.2,gravity=moon,flow=20,diluent=none|Moon cabin]]). ' +
  'o2 may be a fraction (0.3) or percent (30); gravity is micro|moon|mars|earth; diluent is none|CO2|He. ' +
  'A SIMULATE run always opens Will It Burn in fullscreen — do not also emit [[OPEN:/simulator…]] for the same request. ' +
  'Emit at most one of [[OPEN:…]] or [[SIMULATE:…]], never both, and only when they asked for that action. ' +
  'Otherwise do not emit those directives. ' +
  'Write 3–6 short everyday sentences a non-scientist can follow. Prefer plain words; if you must use a technical term, define it in the same sentence.';

const MAX_OUT = 2048;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function prepare(opts: { question: string; context: AskContext[]; workspace?: string }) {
  const question = opts.question.slice(0, 500);
  const context = opts.context.slice(0, 6);
  if (!question || !context.length) throw new Error('question and context required');
  const sources = context
    .map((c, i) => `[${i + 1}] ${c.name} — ${c.url}\n${String(c.text).slice(0, 1800)}`)
    .join('\n\n');
  const workspace = String(opts.workspace || '').trim().slice(0, 900);
  const workspaceLine = workspace ? `Workspace (what they are looking at):\n${workspace}\n\n` : '';
  return {
    question,
    context,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `${workspaceLine}Question: ${question}\n\nSources:\n${sources}` },
    ],
  };
}

function openRouterHeaders(key: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'HTTP-Referer': 'https://flamesight.vercel.app',
    'X-Title': 'FlameSight',
  };
}

interface OpenRouterChunk {
  error?: { message?: string };
  choices?: { delta?: { content?: string | null }; message?: { content?: string | null } }[];
}

/** Yield incremental text deltas from OpenRouter SSE streaming. */
export async function* streamAnswerWithOpenRouter(opts: {
  key: string;
  model: string;
  question: string;
  context: AskContext[];
  workspace?: string;
}): AsyncGenerator<string> {
  const { messages } = prepare(opts);
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: openRouterHeaders(opts.key),
    body: JSON.stringify({
      model: opts.model,
      messages,
      temperature: 0.2,
      max_tokens: MAX_OUT,
      stream: true,
    }),
  });

  if (!r.ok) {
    let message = `OpenRouter error ${r.status}`;
    try {
      const j = (await r.json()) as { error?: { message?: string } };
      if (j.error?.message) message = j.error.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (!r.body) throw new Error('OpenRouter returned an empty stream');

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
      let parsed: OpenRouterChunk;
      try {
        parsed = JSON.parse(json) as OpenRouterChunk;
      } catch {
        continue;
      }
      if (parsed.error?.message) throw new Error(parsed.error.message);
      const text = parsed.choices?.[0]?.delta?.content || '';
      if (text) {
        yielded = true;
        yield text;
      }
    }
  }

  if (!yielded) throw new Error('OpenRouter returned an empty answer');
}

/** Collect a full answer (used when a caller does not need live tokens). */
export async function answerWithOpenRouter(opts: {
  key: string;
  model: string;
  question: string;
  context: AskContext[];
  workspace?: string;
}): Promise<string> {
  let out = '';
  for await (const chunk of streamAnswerWithOpenRouter(opts)) out += chunk;
  const text = out.trim();
  if (!text) throw new Error('OpenRouter returned an empty answer');
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
export async function matchStudiesWithOpenRouter(opts: {
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

  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: openRouterHeaders(opts.key),
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: MATCH_SYSTEM },
        { role: 'user', content: `User search:\n${query}\n\nCatalog:\n${listing}\n\nJSON:` },
      ],
      temperature: 0.1,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) {
    let message = `OpenRouter error ${r.status}`;
    try {
      const j = (await r.json()) as { error?: { message?: string } };
      if (j.error?.message) message = j.error.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  const j = (await r.json()) as OpenRouterChunk & {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };
  if (j.error?.message) throw new Error(j.error.message);
  const raw = String(j.choices?.[0]?.message?.content || '').trim();
  if (!raw) throw new Error('OpenRouter returned an empty match list');

  let parsed: { accessions?: unknown };
  try {
    parsed = JSON.parse(raw) as { accessions?: unknown };
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('OpenRouter match response was not JSON');
    parsed = JSON.parse(m[0]) as { accessions?: unknown };
  }

  const list = Array.isArray(parsed.accessions) ? parsed.accessions : [];
  const out: string[] = [];
  for (const item of list) {
    const acc = String(item || '').trim().toUpperCase();
    const hit = [...allowed].find(a => a.toUpperCase() === acc);
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out.slice(0, 8);
}
