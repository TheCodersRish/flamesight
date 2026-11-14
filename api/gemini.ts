// Server-only Gemini call. The key is read from the environment and never sent to the browser.

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
  'Write for a general audience in 3–6 short plain-English sentences. Avoid jargon when a simple word works.';

export async function answerWithGemini(opts: {
  key: string;
  model: string;
  question: string;
  context: AskContext[];
}): Promise<string> {
  const question = opts.question.slice(0, 500);
  const context = opts.context.slice(0, 6);
  if (!question || !context.length) throw new Error('question and context required');

  const sources = context
    .map((c, i) => `[${i + 1}] ${c.name} — ${c.url}\n${String(c.text).slice(0, 1800)}`)
    .join('\n\n');

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': opts.key,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: `Question: ${question}\n\nSources:\n${sources}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    }),
  });

  const j = (await r.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!r.ok) throw new Error(j.error?.message || `Gemini error ${r.status}`);
  const text = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty answer');
  return text;
}
