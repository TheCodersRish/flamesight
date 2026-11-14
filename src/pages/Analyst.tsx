import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { SourceChip } from '../components/ui';
import { ANALYST_MODELS, ANALYST_SYSTEM, type AnalystModelId } from '../lib/analystModel';
import { narrateLocal } from '../lib/narrate';
import { answerLocal, SAMPLE_QUESTIONS, type Answer } from '../lib/retrieval';

function bestFact(h: Answer['hits'][number], question: string): string {
  const words = question.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const facts = h.passages.filter(p => p.kind === 'fact');
  const score = (text: string) => words.filter(w => text.toLowerCase().includes(w)).length;
  return [...facts].sort((a, b) => score(`${b.kw || ''} ${b.text}`) - score(`${a.kw || ''} ${a.text}`))[0]?.text || '';
}

function percents(text: string): string[] {
  return [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => m[1]);
}

function sharesEvidence(answer: string, notes: string): boolean {
  const claimed = percents(answer);
  const allowed = new Set(percents(notes));
  if (claimed.some(p => !allowed.has(p))) return false;
  const numbers = (notes.match(/\d+(?:\.\d+)?/g) || []).filter(n => n.length >= 2);
  if (numbers.some(n => answer.includes(n))) return true;
  const names = ['flex', 'saffire', 'bass', 'cfig', 'psi-'];
  const lower = answer.toLowerCase();
  return names.some(n => notes.toLowerCase().includes(n) && lower.includes(n));
}

interface Turn {
  a: Answer;
  notes: string;
  evidence: string;
  ai: string;
  state: 'loading' | 'writing' | 'done' | 'error';
  progress: number;
  label: string;
}

export default function Analyst() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState('');
  const [model, setModel] = useState<AnalystModelId>(ANALYST_MODELS[0].id);
  const [turns, setTurns] = useState<Turn[]>([]);
  const asked = useRef<string | null>(null);
  const request = useRef(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/analystModel.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const onMessage = (event: MessageEvent<{ requestId: number; type: string; text?: string; error?: string; progress?: number; label?: string; status?: string }>) => {
      const msg = event.data;
      setTurns(list => list.map((turn, i) => {
        if (i !== 0 || msg.requestId !== request.current) return turn;
        if (msg.type === 'done') {
          const text = (msg.text || '').replace(/\*\*/g, '').trim();
          const usesNotes = sharesEvidence(text, `${turn.evidence}\n${turn.notes}`);
          return usesNotes
            ? { ...turn, ai: text, state: 'done', progress: 100, label: 'Answered on this device' }
            : { ...turn, ai: turn.evidence || turn.notes, state: 'error', label: 'That draft did not match the NASA percents, so the measurements are shown instead.' };
        }
        if (msg.type === 'error') return { ...turn, ai: turn.notes, state: 'error', label: msg.error || 'The model failed. Showing the NASA notes.' };
        return { ...turn, state: msg.status === 'writing' ? 'writing' : 'loading', progress: msg.progress || turn.progress, label: msg.label || turn.label };
      }));
    };
    worker.addEventListener('message', onMessage);
    return () => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const a = answerLocal(text);
    const notes = narrateLocal(a);
    const qWords = text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const ranked = a.hits.flatMap(h => h.passages.filter(p => p.kind === 'fact').map(p => {
      const hay = `${p.kw || ''} ${p.text}`.toLowerCase();
      const hit = qWords.filter(w => hay.includes(w)).length;
      const name = h.inv.hasAcronym ? h.inv.acronym : h.inv.accession;
      return { line: `${name}: ${p.text}`, hit };
    })).sort((x, y) => y.hit - x.hit);
    const noteBlock = ranked.slice(0, 4).map(r => r.line).join('\n');
    const id = ++request.current;
    setTurns(t => [{ a, notes, evidence: noteBlock, ai: '', state: 'loading', progress: 0, label: 'Loading the free model' }, ...t]);
    setQ('');
    workerRef.current?.postMessage({
      requestId: id,
      model,
      system: ANALYST_SYSTEM,
      user: `Notes:\n${noteBlock || 'No matching note.'}\n\n${a.caveats.join(' ')}\n\nQuestion: ${text}\nWrite the answer in sentences. Start with the direct answer and one number from the notes.`,
    });
  };

  useEffect(() => {
    const qq = sp.get('q');
    if (qq && asked.current !== qq) { asked.current = qq; ask(qq); }
    // The sample-question link should ask once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const latest = turns[0];
  const bars = useMemo(() => (latest?.a.hits || []).map(h => ({
    name: h.inv.hasAcronym ? h.inv.acronym : h.inv.accession,
    match: Math.round(h.score),
  })), [latest]);
  const chosen = ANALYST_MODELS.find(m => m.id === model) || ANALYST_MODELS[0];

  return (
    <Deck
      experimentsTitle="NASA sources"
      graphsTitle="How well they match"
      outcomeTitle="Answer"
      stage={(
        <FlameStage title="Analyst" caption={`${chosen.label} runs in this browser. No API key. The first question downloads the model.`} controls={(
          <>
            <form className="flex gap-2 sm:col-span-2" onSubmit={e => { e.preventDefault(); ask(q); }}>
              <label htmlFor="q" className="sr-only">Your question</label>
              <input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Which gas puts out fuel fires best in microgravity?" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-space-950 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              <button className="rounded-lg bg-flame-500 px-4 py-2 text-sm font-medium text-white">Ask</button>
            </form>
            <label className="text-xs text-slate-300 sm:col-span-2">Free model
              <select value={model} onChange={e => setModel(e.target.value as AnalystModelId)} className="mt-1 w-full rounded-lg border border-white/15 bg-space-950 px-2 py-1.5 text-sm text-white">
                {ANALYST_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.note}</option>)}
              </select>
            </label>
          </>
        )}>
          <Flame gravity={0.15} o2={0.62} flow={0.25} dilution={0.1} className="h-full w-full" label="Analyst flame" />
        </FlameStage>
      )}
      experiments={(
        <>
          <div className="mb-2 flex flex-col gap-1">
            {SAMPLE_QUESTIONS.map(s => <button key={s} type="button" onClick={() => ask(s)} className="rounded-lg bg-white/5 px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10">{s}</button>)}
          </div>
          {latest ? (
            <ol className="space-y-2">
              {latest.a.hits.map((h, i) => (
                <li key={h.inv.accession}>
                  <Link to={`/explorer/${h.inv.accession}`} className="block rounded-lg px-1 py-1 hover:bg-white/5">
                    <span className="text-[11px] text-cyan-200/80">{i + 1}. {h.inv.accession}</span>
                    <span className="block text-sm text-white">{h.inv.hasAcronym ? h.inv.acronym : h.inv.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-slate-400">The matching NASA investigations show up here.</p>}
        </>
      )}
      graphs={bars.length ? (
        <div className="h-48 w-full">
          <ResponsiveContainer>
            <BarChart data={bars} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={78} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="match" name="Match" fill="#67e8f9" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="text-sm text-slate-400">Ask a question to see which investigations match.</p>}
      outcome={(
        <>
          <p className="text-xs text-slate-400">{chosen.label} · on this device</p>
          {latest && <p className="mt-1 text-sm text-slate-300">You asked: {latest.a.question}</p>}
          {latest && latest.state !== 'done' && latest.state !== 'error' && (
            <p className="mt-3 text-sm text-cyan-100">
              {latest.state === 'writing' ? 'Writing the answer from the NASA notes…' : `Downloading ${chosen.label}… ${Math.round(latest.progress)}%`}
              <span className="mt-1 block text-xs text-slate-400">{latest.label}. Your question stays in the browser.</span>
            </p>
          )}
          {latest && (latest.state === 'done' || latest.state === 'error') && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{latest.ai}</p>}
          {!latest && <p className="mt-3 text-sm text-slate-300">Ask a question. A free model writes the answer from the NASA notes it finds. Nothing is sent to an AI service.</p>}
          {latest?.state === 'error' && <p className="mt-2 text-xs text-amber-200">{latest.label}</p>}
          {latest?.a.caveats.map(c => <p key={c} className="mt-2 text-xs text-amber-200">⚠ {c}</p>)}
          {latest?.a.hits.slice(0, 3).map(h => (
            <div key={h.inv.accession} className="mt-2 border-l border-white/15 pl-2">
              <SourceChip acc={h.inv.accession} compact />
              {bestFact(h, latest.a.question) && <p className="mt-1 text-[11px] text-slate-400">{bestFact(h, latest.a.question)}</p>}
            </div>
          ))}
        </>
      )}
    />
  );
}
