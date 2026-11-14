/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers';

env.allowLocalModels = false;

type Gen = (messages: { role: string; content: string }[], opts: Record<string, unknown>) => Promise<unknown>;

let loadedId = '';
let generate: Gen | null = null;

function reply(data: Record<string, unknown>) {
  self.postMessage(data);
}

function readAnswer(out: unknown): string {
  const first = Array.isArray(out) ? out[0] : out;
  if (!first || typeof first !== 'object') return '';
  const text = (first as { generated_text?: unknown }).generated_text;
  if (typeof text === 'string') {
    const cut = text.split(/\bassistant\b/i).pop() || text;
    return cut.replace(/^[\s:>\-]+/, '').trim();
  }
  if (Array.isArray(text)) {
    const assistant = [...text].reverse().find(m => m && typeof m === 'object' && (m as { role?: string }).role === 'assistant') as { content?: string } | undefined;
    return (assistant?.content || '').trim();
  }
  return '';
}

self.onmessage = async (event: MessageEvent<{ requestId: number; model: string; system: string; user: string }>) => {
  const { requestId, model, system, user } = event.data;
  try {
    if (!generate || loadedId !== model) {
      reply({ requestId, type: 'progress', status: 'download', progress: 0, label: 'Starting the download' });
      const pipe = await pipeline('text-generation', model, {
        dtype: 'q4f16',
        device: 'wasm',
        progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
          reply({
            requestId,
            type: 'progress',
            status: p.status || 'download',
            progress: typeof p.progress === 'number' ? p.progress : 0,
            label: p.file || 'model weights',
          });
        },
      });
      generate = pipe as unknown as Gen;
      loadedId = model;
    }
    reply({ requestId, type: 'progress', status: 'writing', progress: 100, label: 'Writing from the NASA notes' });
    const out = await generate(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { max_new_tokens: 120, do_sample: false, temperature: 0, repetition_penalty: 1.12, return_full_text: false },
    );
    const text = readAnswer(out);
    if (!text) throw new Error('The model returned an empty answer.');
    reply({ requestId, type: 'done', text });
  } catch (err) {
    reply({ requestId, type: 'error', error: err instanceof Error ? err.message : 'The on-device model failed.' });
  }
};
