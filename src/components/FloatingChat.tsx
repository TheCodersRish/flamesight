import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AiAnswer from './AiAnswer';
import { useBurn } from '../lib/burnSession';
import { simplifyText } from '../lib/plainEnglish';
import { narrateLocal } from '../lib/narrate';
import { answerLocal, askRemote, SAMPLE_QUESTIONS } from '../lib/retrieval';
import {
  describeWorkspace,
  describeSim,
  intentToOpen,
  intentToSimulate,
  SIM_FULL_PATH,
  stripOpenDirective,
  workspaceChip,
  type ScreenAction,
  type SimAction,
} from '../lib/screenAware';

interface Turn {
  question: string;
  notes: string;
  ai: string;
  source: 'local' | 'gemini';
  state: 'loading' | 'done';
  caveats: string[];
  hits: { accession: string; label: string }[];
  /** Page the AI wants to open — user must confirm first. */
  pendingOpen?: ScreenAction | null;
  /** Conditions the AI wants to simulate in fullscreen Will It Burn. */
  pendingSim?: SimAction | null;
  opened?: ScreenAction | null;
  simulated?: SimAction | null;
}

/** Floating Ask panel available on every page (except Analyst and Overview). */
export default function FloatingChat() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const burn = useBurn();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const request = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  // Full Analyst page already is the chat; Overview keeps the page clean — skip the launcher there.
  const hide = pathname === '/analyst' || pathname === '/overview';
  const workspace = describeWorkspace({ pathname, search, burn: { input: burn.input, result: burn.result } });
  const where = workspaceChip(pathname);

  const confirmOpen = (action: ScreenAction) => {
    navigate(action.path);
    setTurns(list => list.map((turn, i) => (
      i === 0 ? { ...turn, pendingOpen: null, opened: action } : turn
    )));
  };

  const confirmSim = (action: SimAction) => {
    burn.setInput(action.input);
    navigate(SIM_FULL_PATH);
    setOpen(false);
    setTurns(list => list.map((turn, i) => (
      i === 0 ? { ...turn, pendingSim: null, pendingOpen: null, simulated: action } : turn
    )));
  };

  const declineOpen = () => {
    setTurns(list => list.map((turn, i) => (
      i === 0 ? { ...turn, pendingOpen: null, pendingSim: null } : turn
    )));
  };

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const localSim = intentToSimulate(text);
    const localOpen = localSim ? null : intentToOpen(text);
    const openStudy = pathname.startsWith('/explorer/') ? pathname.split('/')[2]?.toUpperCase() : undefined;
    const a = answerLocal(text, openStudy);
    const notes = narrateLocal(a);
    const id = ++request.current;
    const hits = a.hits.map(h => ({
      accession: h.inv.accession,
      label: h.inv.hasAcronym ? h.inv.acronym : h.inv.title,
    }));
    setTurns(t => [{
      question: text,
      notes,
      ai: '',
      source: 'local',
      state: 'loading',
      caveats: a.caveats,
      hits,
      pendingOpen: localOpen,
      pendingSim: localSim,
      opened: null,
      simulated: null,
    }, ...t]);
    setQ('');
    setOpen(true);

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
          const { answer, action, simulate } = stripOpenDirective(remote);
          const pendingSim = simulate || turn.pendingSim || null;
          const pendingOpen = !pendingSim && action && (!turn.opened || turn.opened.path !== action.path)
            ? action
            : (!pendingSim ? (turn.pendingOpen || null) : null);
          return { ...turn, ai: answer, source: 'gemini', state: 'done', pendingOpen, pendingSim };
        }
        return { ...turn, ai: '', source: 'local', state: 'done' };
      }));
    })();
  };

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = 0;
  }, [open, turns.length]);

  useEffect(() => {
    if (hide) setOpen(false);
  }, [hide]);

  if (hide) return null;

  const latest = turns[0];
  const display = latest?.source === 'gemini' && latest.ai ? simplifyText(latest.ai) : '';

  return (
    <>
    {(latest?.pendingSim || latest?.pendingOpen) && (
      <div
        className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="presentation"
        onClick={declineOpen}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="float-open-title"
          aria-describedby="float-open-answer"
          className="flex w-full max-w-lg max-h-[min(90vh,40rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-space-950 shadow-2xl shadow-black/60"
          onClick={e => e.stopPropagation()}
        >
          <div className="border-b border-white/10 px-5 pt-5 pb-3">
            {latest.pendingSim ? (
              <>
                <h2 id="float-open-title" className="text-xl font-semibold text-white">
                  Simulate in fullscreen?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  FlameSight wants to run <span className="font-medium text-micro-100">{latest.pendingSim.label}</span> on Will It Burn and open the flame fullscreen.
                </p>
                <p className="mt-1.5 text-xs text-slate-400">{describeSim(latest.pendingSim.input)}</p>
              </>
            ) : (
              <>
                <h2 id="float-open-title" className="text-xl font-semibold text-white">
                  Open this page?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  FlameSight wants to open <span className="font-medium text-micro-100">{latest.pendingOpen!.label}</span>.
                </p>
              </>
            )}
          </div>
          <div id="float-open-answer" className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-micro-300/90">
              {display ? 'AI answer' : latest.state === 'loading' ? 'AI writing…' : 'AI answer'}
            </p>
            {display ? (
              <AiAnswer text={display} />
            ) : latest.state === 'loading' ? (
              <p className="text-sm text-cyan-100/90">Writing the AI answer…</p>
            ) : (
              <p className="text-sm text-slate-400">Read the request above, then accept or dismiss.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-white/10 px-5 py-4">
            {latest.pendingSim ? (
              <button
                type="button"
                onClick={() => confirmSim(latest.pendingSim!)}
                className="rounded-xl bg-flame-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-flame-400"
              >
                Accept & simulate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => confirmOpen(latest.pendingOpen!)}
                className="rounded-xl bg-flame-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-flame-400"
              >
                Accept & open
              </button>
            )}
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
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          className="pointer-events-auto flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-space-950/95 shadow-2xl shadow-black/50 backdrop-blur-md"
          role="dialog"
          aria-label="Ask FlameSight"
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-white">Ask FlameSight</p>
              <p className="text-[11px] text-slate-400">Sees your workspace · can simulate conditions fullscreen</p>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/analyst" className="rounded-lg px-2 py-1 text-[11px] text-micro-300 hover:bg-white/10" onClick={() => setOpen(false)}>
                Full page
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close chat">
                ✕
              </button>
            </div>
          </header>

          <div className="border-b border-white/10 px-3 py-1.5">
            <p className="truncate text-[11px] text-micro-200/90" title={workspace}>
              Working on: {where}
            </p>
          </div>

          <div ref={listRef} className="max-h-[min(50vh,22rem)] space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin">
            {!latest && (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400">Ask about fire in space, or say “pull up FLEX” / “open Will it burn?”:</p>
                {SAMPLE_QUESTIONS.slice(0, 2).map(s => (
                  <button key={s} type="button" onClick={() => ask(s)} className="block w-full rounded-lg bg-white/5 px-2.5 py-1.5 text-left text-[11px] leading-snug text-slate-200 hover:bg-white/10">
                    {s}
                  </button>
                ))}
                <button type="button" onClick={() => ask('Pull up the FLEX study')} className="block w-full rounded-lg bg-white/5 px-2.5 py-1.5 text-left text-[11px] leading-snug text-slate-200 hover:bg-white/10">
                  Pull up the FLEX study
                </button>
              </div>
            )}
            {latest && (
              <article className="space-y-3">
                <div className="rounded-xl bg-white/[0.06] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">You asked</p>
                  <p className="mt-0.5 text-sm font-medium text-white">{latest.question}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent px-3 py-2.5">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-micro-300/90">
                    {latest.source === 'gemini' ? 'Live AI answer' : latest.state === 'loading' ? 'AI writing…' : 'AI unavailable'}
                    {latest.state === 'loading' && latest.source === 'gemini' ? ' · writing…' : ''}
                  </p>
                  {display ? (
                    <AiAnswer text={display} />
                  ) : latest.state === 'loading' ? (
                    <p className="text-sm text-cyan-100/90">Writing the AI answer…</p>
                  ) : (
                    <p className="text-sm text-slate-400">The AI could not answer right now. Try again in a moment.</p>
                  )}
                </div>
                {latest.simulated && !latest.pendingSim && (
                  <p className="rounded-lg bg-flame-500/15 px-2.5 py-1.5 text-[11px] text-flame-100">
                    Simulating fullscreen: {latest.simulated.label}
                  </p>
                )}
                {latest.opened && !latest.pendingOpen && !latest.pendingSim && (
                  <p className="rounded-lg bg-micro-500/15 px-2.5 py-1.5 text-[11px] text-micro-100">
                    On screen: {latest.opened.label}
                  </p>
                )}
                {latest.caveats.map(c => (
                  <p key={c} className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-100">
                    ⚠ {simplifyText(c)}
                  </p>
                ))}
                {latest.hits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {latest.hits.map(h => (
                      <button
                        key={h.accession}
                        type="button"
                        onClick={() => {
                          setTurns(list => list.map((turn, i) => (
                            i === 0 ? { ...turn, pendingOpen: { path: `/explorer/${h.accession}`, label: h.label } } : turn
                          )));
                        }}
                        className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-micro-200 ring-1 ring-white/10 hover:bg-white/10"
                      >
                        {h.accession}
                      </button>
                    ))}
                  </div>
                )}
                {turns.length > 1 && (
                  <p className="text-[10px] text-slate-500">{turns.length - 1} earlier question{turns.length > 2 ? 's' : ''} this session</p>
                )}
              </article>
            )}
          </div>

          <form
            className="flex gap-2 border-t border-white/10 p-2.5"
            onSubmit={e => { e.preventDefault(); ask(q); }}
          >
            <label htmlFor="float-ask" className="sr-only">Your question</label>
            <input
              id="float-ask"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Ask, or say pull up FLEX…"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-space-900 px-2.5 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button type="submit" className="rounded-lg bg-flame-500 px-3 py-2 text-sm font-medium text-white hover:bg-flame-400">
              Ask
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-flame-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-flame-500/30 ring-2 ring-white/20 will-change-transform hover:bg-flame-400 hover:scale-105 active:scale-95"
        aria-expanded={open}
        aria-label={open ? 'Close Ask FlameSight' : 'Open Ask FlameSight'}
      >
        {open ? (
          <span className="text-sm leading-none">✕ Close</span>
        ) : (
          <span>FlameSight AI</span>
        )}
      </button>
    </div>
    </>
  );
}
