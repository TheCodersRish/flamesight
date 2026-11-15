import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AiAnswer from '../components/AiAnswer';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { Pill, SourceChip } from '../components/ui';
import { useBurn } from '../lib/burnSession';
import { analystPhysicsCitations, fluidPhysicsHref, physicsFollowUps } from '../lib/physicsBridge';
import { simplifyText } from '../lib/plainEnglish';
import { downloadReport, stamp } from '../lib/report';
import { answerLocal, askRemote, SAMPLE_QUESTIONS, type Answer } from '../lib/retrieval';
import { narrateLocal } from '../lib/narrate';
import { describeWorkspace, intentToOpen, stripOpenDirective, type ScreenAction } from '../lib/screenAware';

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
  /** Page the AI wants to open — user must confirm first. */
  pendingOpen?: ScreenAction | null;
  opened?: ScreenAction | null;
}

export default function Analyst() {
  const [sp] = useSearchParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const burn = useBurn();
  const [q, setQ] = useState('');
  const [plain, setPlain] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);
  const asked = useRef<string | null>(null);
  const request = useRef(0);
  const workspace = describeWorkspace({ pathname, search, burn: { input: burn.input, result: burn.result } });

  const confirmOpen = (action: ScreenAction) => {
    navigate(action.path);
    setTurns(list => list.map((turn, i) => (
      i === 0 ? { ...turn, pendingOpen: null, opened: action } : turn
    )));
  };

  const declineOpen = () => {
    setTurns(list => list.map((turn, i) => (
      i === 0 ? { ...turn, pendingOpen: null } : turn
    )));
  };

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const localOpen = intentToOpen(text);
    const openStudy = pathname.startsWith('/explorer/') ? pathname.split('/')[2]?.toUpperCase() : undefined;
    const a = answerLocal(text, openStudy);
    const notes = narrateLocal(a);
    const id = ++request.current;
    setTurns(t => [{
      a,
      notes,
      ai: '',
      source: 'local',
      state: 'loading',
      pendingOpen: localOpen,
      opened: null,
    }, ...t]);
    setQ('');

    void (async () => {
      const remote = await askRemote(text, a, undefined, (partial) => {
        if (id !== request.current) return;
        const { answer } = stripOpenDirective(partial);
        setTurns(list => list.map((turn, i) => (
          i === 0 ? { ...turn, ai: answer || partial, source: 'gemini', state: 'loading' } : turn
        )));
      }, workspace);
      if (id !== request.current) return;
      setTurns(list => list.map((turn, i) => {
        if (i !== 0) return turn;
        if (remote) {
          const { answer, action } = stripOpenDirective(remote);
          const pendingOpen = action && (!turn.opened || turn.opened.path !== action.path)
            ? action
            : (turn.pendingOpen || null);
          return { ...turn, ai: answer, source: 'gemini', state: 'done', pendingOpen };
        }
        return { ...turn, ai: '', source: 'local', state: 'done' };
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
  const citations = useMemo(
    () => (latest ? analystPhysicsCitations(latest.a.question, latest.a.hits.map(h => h.inv.accession)) : []),
    [latest],
  );
  const followUps = useMemo(() => physicsFollowUps(citations), [citations]);

  const display = latest?.source === 'gemini' && latest.ai
    ? (plain ? simplifyText(latest.ai) : latest.ai)
    : '';

  const onDownload = () => {
    if (!latest || !display) return;
    const body = [
      'FlameSight — Fire Safety Analyst report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Question: ${latest.a.question}`,
      'Answer source: Live AI on Vercel (/api/ask)',
      '',
      'Answer',
      display,
      '',
      'Matching investigations',
      ...latest.a.hits.map((h, i) => `  ${i + 1}. ${h.inv.accession} — ${h.inv.hasAcronym ? h.inv.acronym : h.inv.title}`),
      '',
      latest.a.caveats.length ? `Caveats:\n${latest.a.caveats.map(c => `  - ${c}`).join('\n')}` : '',
      '',
      'The live site runs the AI model on Vercel via /api/ask, then uses that answer.',
      'Data: NASA Physical Sciences Informatics. Educational tool, not a safety certification.',
    ].filter(Boolean).join('\n');
    downloadReport(`flamesight-analyst-${stamp()}.txt`, body);
  };

  return (
    <>
    {latest?.pendingOpen && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="presentation"
        onClick={declineOpen}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="analyst-open-title"
          className="w-full max-w-md rounded-2xl border border-white/15 bg-space-950 p-6 shadow-2xl shadow-black/60"
          onClick={e => e.stopPropagation()}
        >
          <h2 id="analyst-open-title" className="text-xl font-semibold text-white">
            Open this page?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            FlameSight wants to open <span className="font-medium text-micro-100">{latest.pendingOpen.label}</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => confirmOpen(latest.pendingOpen!)}
              className="rounded-xl bg-flame-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-flame-400"
            >
              Open
            </button>
            <button
              type="button"
              onClick={declineOpen}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/15"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    )}
    <Deck
      experimentsTitle="NASA sources"
      graphsTitle="How well they match"
      outcomeTitle="Answer"
      stage={(
        <FlameStage title="Ask FlameSight" caption="Knows what you are working on. Ask in everyday language — it will ask before opening another page." controls={(
          <>
            <form className="flex gap-2 sm:col-span-2" onSubmit={e => { e.preventDefault(); ask(q); }}>
              <label htmlFor="q" className="sr-only">Your question</label>
              <input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Ask, or say pull up Will it burn…" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-space-950 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              <button className="rounded-lg bg-flame-500 px-4 py-2 text-sm font-medium text-white">Ask</button>
            </form>
            <p className="text-[11px] leading-relaxed text-slate-400 sm:col-span-2">
              Tip: the agent sees your current page and Will-it-burn knobs. Say “open lunar risks” or “pull up BASS-II” — it asks before switching.
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
              {plain ? 'Simpler wording on' : 'Simpler wording off'}
            </button>
            {latest && display && (
              <button type="button" onClick={onDownload} className="rounded-lg bg-flame-500/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-flame-500">Download report</button>
            )}
          </div>
          {latest && (
            <div className="mt-2 rounded-xl bg-white/[0.06] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">You asked</p>
              <p className="mt-0.5 text-sm font-medium text-white">{latest.a.question}</p>
            </div>
          )}
          <div className="mt-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent px-3 py-2.5">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-micro-300/90">
              {latest?.source === 'gemini' ? 'Live AI answer' : latest?.state === 'loading' ? 'AI writing…' : latest ? 'AI unavailable' : 'AI answer'}
            </p>
            {latest && latest.state === 'loading' && !display && (
              <p className="text-sm text-cyan-100/90">Writing the AI answer…</p>
            )}
            {display && <AiAnswer text={display} />}
            {latest && latest.state === 'done' && !display && (
              <p className="text-sm text-slate-400">The AI could not answer right now. Try again in a moment.</p>
            )}
            {!latest && (
              <p className="text-sm text-slate-300">Ask anything about fire in space. You will get a short AI answer grounded in NASA tests.</p>
            )}
          </div>
          {latest?.opened && !latest.pendingOpen && (
            <p className="mt-2 rounded-lg bg-micro-500/15 px-2.5 py-1.5 text-xs text-micro-100">
              On screen: {latest.opened.label}
            </p>
          )}
          {latest?.a.caveats.map(c => (
            <p key={c} className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs leading-snug text-amber-100">
              ⚠ {plain ? simplifyText(c) : c}
            </p>
          ))}
          {citations.length > 0 && (
            <div className="mt-3 rounded-lg bg-micro-500/10 p-2 ring-1 ring-micro-500/25">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-micro-300">Freefall physics</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {citations.map(c => (
                  <Link key={c.id} to={fluidPhysicsHref(c.id)} title={c.story}>
                    <Pill tone="micro">{c.short}</Pill>
                  </Link>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{citations[0]?.story}</p>
            </div>
          )}
          {followUps.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-[11px] text-slate-500">Ask next (physics-grounded)</p>
              {followUps.map(f => (
                <button key={f} type="button" onClick={() => ask(f)} className="rounded-lg bg-white/5 px-2 py-1 text-left text-[11px] text-slate-200 hover:bg-white/10">
                  {f}
                </button>
              ))}
            </div>
          )}
          {latest?.a.hits.slice(0, 3).map(h => (
            <div key={h.inv.accession} className="mt-2 border-l border-white/15 pl-2">
              <SourceChip acc={h.inv.accession} compact />
              {bestFact(h, latest.a.question) && <p className="mt-1 text-[11px] text-slate-400">{plain ? simplifyText(bestFact(h, latest.a.question)) : bestFact(h, latest.a.question)}</p>}
            </div>
          ))}
        </>
      )}
    />
    </>
  );
}
