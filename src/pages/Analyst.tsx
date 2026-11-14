import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { SourceChip } from '../components/ui';
import { plainAnalyst, simplifyText } from '../lib/plainEnglish';
import { downloadReport, stamp } from '../lib/report';
import { answerLocal, askRemote, SAMPLE_QUESTIONS, type Answer } from '../lib/retrieval';
import { narrateLocal } from '../lib/narrate';

function bestFact(h: Answer['hits'][number], question: string): string {
  const words = question.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const facts = h.passages.filter(p => p.kind === 'fact');
  const score = (text: string) => words.filter(w => text.toLowerCase().includes(w)).length;
  return [...facts].sort((a, b) => score(`${b.kw || ''} ${b.text}`) - score(`${a.kw || ''} ${a.text}`))[0]?.text || '';
}

interface Turn {
  a: Answer;
  notes: string;
  ai: string;
  source: 'local' | 'gemini';
  state: 'loading' | 'done';
}

export default function Analyst() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState('');
  const [plain, setPlain] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);
  const asked = useRef<string | null>(null);
  const request = useRef(0);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const a = answerLocal(text);
    const notes = narrateLocal(a);
    const id = ++request.current;
    setTurns(t => [{ a, notes, ai: plainAnalyst(text, notes, a.caveats), source: 'local', state: 'loading' }, ...t]);
    setQ('');

    void (async () => {
      const remote = await askRemote(text, a);
      if (id !== request.current) return;
      setTurns(list => list.map((turn, i) => {
        if (i !== 0) return turn;
        if (remote) return { ...turn, ai: remote, source: 'gemini', state: 'done' };
        return { ...turn, ai: notes, source: 'local', state: 'done' };
      }));
    })();
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

  const display = latest
    ? (plain
      ? (latest.source === 'gemini' ? simplifyText(latest.ai) : plainAnalyst(latest.a.question, latest.notes, latest.a.caveats))
      : (latest.source === 'gemini' ? latest.ai : latest.notes))
    : '';

  const onDownload = () => {
    if (!latest) return;
    const body = [
      'FlameSight — Fire Safety Analyst report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Question: ${latest.a.question}`,
      `Answer source: ${latest.source === 'gemini' ? 'Gemini (free API key)' : 'NASA notes on this device (no API key)'}`,
      '',
      'Answer',
      display,
      '',
      'Matching investigations',
      ...latest.a.hits.map((h, i) => `  ${i + 1}. ${h.inv.accession} — ${h.inv.hasAcronym ? h.inv.acronym : h.inv.title}`),
      '',
      latest.a.caveats.length ? `Caveats:\n${latest.a.caveats.map(c => `  - ${c}`).join('\n')}` : '',
      '',
      'Tip: for optional cloud wording, run: node scripts/setup-gemini-key.mjs',
      'Data: NASA Physical Sciences Informatics. Educational tool, not a safety certification.',
    ].filter(Boolean).join('\n');
    downloadReport(`flamesight-analyst-${stamp()}.txt`, body);
  };

  return (
    <Deck
      experimentsTitle="NASA sources"
      graphsTitle="How well they match"
      outcomeTitle="Answer"
      stage={(
        <FlameStage title="Analyst" caption="Answers from NASA notes in this browser. No on-device model download. Optional free Gemini key via CLI." controls={(
          <>
            <form className="flex gap-2 sm:col-span-2" onSubmit={e => { e.preventDefault(); ask(q); }}>
              <label htmlFor="q" className="sr-only">Your question</label>
              <input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Which gas puts out fuel fires best in microgravity?" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-space-950 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              <button className="rounded-lg bg-flame-500 px-4 py-2 text-sm font-medium text-white">Ask</button>
            </form>
            <p className="text-[11px] leading-relaxed text-slate-400 sm:col-span-2">
              Works with no API key. For optional clearer cloud answers, run <code className="rounded bg-white/10 px-1 text-cyan-100">node scripts/setup-gemini-key.mjs</code> to create a free Gemini key.
            </p>
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
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPlain(p => !p)} className={`rounded-lg px-2.5 py-1 text-xs ${plain ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/5 text-slate-300'}`} aria-pressed={plain}>
              {plain ? 'Plain English on' : 'Plain English off'}
            </button>
            {latest && (latest.state === 'done' || latest.ai) && (
              <button type="button" onClick={onDownload} className="rounded-lg bg-flame-500/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-flame-500">Download report</button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {latest?.source === 'gemini' ? 'Gemini · free API key' : 'NASA notes · no API key · no model download'}
          </p>
          {latest && <p className="mt-1 text-sm text-slate-300">You asked: {latest.a.question}</p>}
          {latest && latest.state === 'loading' && (
            <p className="mt-3 text-sm text-cyan-100">
              Checking for an optional free Gemini key…
              <span className="mt-1 block text-xs text-slate-400">Showing NASA notes right away. Cloud wording appears only if a key is set.</span>
            </p>
          )}
          {latest && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{display}</p>}
          {!latest && <p className="mt-3 text-sm text-slate-300">Ask a question. FlameSight answers from NASA notes in this browser. No on-device model and no API key required.</p>}
          {latest?.a.caveats.map(c => <p key={c} className="mt-2 text-xs text-amber-200">⚠ {plain ? simplifyText(c) : c}</p>)}
          {latest?.a.hits.slice(0, 3).map(h => (
            <div key={h.inv.accession} className="mt-2 border-l border-white/15 pl-2">
              <SourceChip acc={h.inv.accession} compact />
              {bestFact(h, latest.a.question) && <p className="mt-1 text-[11px] text-slate-400">{plain ? simplifyText(bestFact(h, latest.a.question)) : bestFact(h, latest.a.question)}</p>}
            </div>
          ))}
        </>
      )}
    />
  );
}
