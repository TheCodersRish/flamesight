import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { SourceChip } from '../components/ui';
import { narrateLocal } from '../lib/narrate';
import { answerLocal, SAMPLE_QUESTIONS, type Answer } from '../lib/retrieval';

export default function Analyst() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState('');
  const [turns, setTurns] = useState<Answer[]>([]);
  const asked = useRef<string | null>(null);
  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    setTurns(t => [answerLocal(text), ...t]);
    setQ('');
  };
  useEffect(() => {
    const qq = sp.get('q');
    if (qq && asked.current !== qq) { asked.current = qq; ask(qq); }
  }, [sp]);
  const latest = turns[0];
  const spoken = latest ? narrateLocal(latest) : 'Ask about oxygen, pressure, smoke, suppressant gas, or a habitat. The answer is assembled on this device from the NASA catalog.';
  const bars = useMemo(() => (latest?.hits || []).map(h => ({
    name: h.inv.hasAcronym ? h.inv.acronym : h.inv.accession,
    match: Math.round(h.score),
  })), [latest]);

  return (
    <Deck
      experimentsTitle="Sources"
      graphsTitle="How well they match"
      outcomeTitle="Answer"
      stage={(
        <FlameStage title="Analyst" caption="Answers come from the NASA catalog on this device. No API key." controls={(
          <form className="flex gap-2 sm:col-span-2" onSubmit={e => { e.preventDefault(); ask(q); }}>
            <label htmlFor="q" className="sr-only">Your question</label>
            <input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Which gas puts out fuel fires best in microgravity?" className="min-w-0 flex-1 rounded border border-cyan-200/20 bg-space-950 px-2 py-1.5 text-sm text-white placeholder:text-slate-500" />
            <button className="rounded bg-flame-500/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white">Ask</button>
          </form>
        )}>
          <Flame gravity={0.15} o2={0.62} flow={0.25} dilution={0.1} className="h-full w-full" label="Analyst flame" />
        </FlameStage>
      )}
      experiments={(
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {SAMPLE_QUESTIONS.map(s => <button key={s} type="button" onClick={() => ask(s)} className="rounded bg-white/5 px-2 py-1 text-left text-[11px] text-slate-300 hover:text-white">{s}</button>)}
          </div>
          {latest ? (
            <ol className="space-y-2">
              {latest.hits.map((h, i) => (
                <li key={h.inv.accession}>
                  <Link to={`/explorer/${h.inv.accession}`} className="block rounded px-1 py-1 hover:bg-white/5">
                    <span className="font-mono text-[10px] text-cyan-200/70">{i + 1}. {h.inv.accession}</span>
                    <span className="block text-xs text-white">{h.inv.hasAcronym ? h.inv.acronym : h.inv.title}</span>
                    <span className="block text-[11px] text-slate-400">{h.inv.role}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : <p className="text-xs text-slate-400">Matched investigations show up here.</p>}
        </>
      )}
      graphs={bars.length ? (
        <div className="h-48 w-full">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">Retrieval score</p>
          <ResponsiveContainer>
            <BarChart data={bars} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={72} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="match" name="Match" fill="#67e8f9" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="text-xs text-slate-400">Ask a question to see how strongly each investigation matches.</p>}
      outcome={(
        <>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">Local analyst</p>
          {latest && <p className="mt-1 text-xs text-slate-400">You asked: {latest.question}</p>}
          <p className="mt-2 text-sm text-slate-100">{spoken}</p>
          {latest?.caveats.map(c => <p key={c} className="mt-2 text-xs text-amber-200">⚠ {c}</p>)}
          {latest?.hits.map(h => (
            <div key={h.inv.accession} className="mt-2 border-l border-cyan-200/30 pl-2">
              <div className="flex items-center gap-2"><SourceChip acc={h.inv.accession} compact /><span className="text-[11px] text-slate-300">{h.inv.why}</span></div>
              {h.passages.filter(p => p.kind === 'fact').slice(0, 1).map(p => <p key={p.id} className="mt-1 text-[11px] text-slate-400">{p.text}</p>)}
            </div>
          ))}
          <p className="mt-2 text-[11px] text-slate-500">BM25 search plus oxygen and pressure matching, all in the browser. Nothing is sent to an API.</p>
        </>
      )}
    />
  );
}
