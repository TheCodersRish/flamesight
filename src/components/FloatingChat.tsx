import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBurn } from '../lib/burnSession';
import { plainAnalyst, simplifyText } from '../lib/plainEnglish';
import { narrateLocal } from '../lib/narrate';
import { answerLocal, askRemote, SAMPLE_QUESTIONS } from '../lib/retrieval';
import {
  describeWorkspace,
  intentToOpen,
  stripOpenDirective,
  workspaceChip,
  type ScreenAction,
} from '../lib/screenAware';

interface Turn {
  question: string;
  notes: string;
  ai: string;
  source: 'local' | 'gemini';
  state: 'loading' | 'done';
  caveats: string[];
  hits: { accession: string; label: string }[];
  opened?: ScreenAction | null;
}

/** Floating Ask panel available on every page (except the full Analyst deck). */
export default function FloatingChat() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const burn = useBurn();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const request = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  // Full Analyst page already is the chat — skip the bubble there.
  const hide = pathname === '/analyst';
  const workspace = describeWorkspace({ pathname, search, burn: { input: burn.input, result: burn.result } });
  const where = workspaceChip(pathname);

  const applyOpen = (action: ScreenAction | null | undefined) => {
    if (!action) return;
    navigate(action.path);
  };

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const localOpen = intentToOpen(text);
    if (localOpen) applyOpen(localOpen);
    const openStudy = pathname.startsWith('/explorer/') ? pathname.split('/')[2]?.toUpperCase() : undefined;
    const a = answerLocal(text, openStudy);
    const notes = narrateLocal(a);
    const id = ++request.current;
    const hits = a.hits.map(h => ({
      accession: h.inv.accession,
      label: h.inv.hasAcronym ? h.inv.acronym : h.inv.title,
    }));
    const localNotes = localOpen
      ? `${notes}\n\nOpened ${localOpen.label} on your screen.`
      : notes;
    setTurns(t => [{
      question: text,
      notes: localNotes,
      ai: plainAnalyst(text, localNotes, a.caveats),
      source: 'local',
      state: 'loading',
      caveats: a.caveats,
      hits,
      opened: localOpen,
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
          const { answer, action } = stripOpenDirective(remote);
          const opened = action || turn.opened || null;
          if (action && (!turn.opened || turn.opened.path !== action.path)) applyOpen(action);
          return { ...turn, ai: answer, source: 'gemini', state: 'done', opened };
        }
        return { ...turn, ai: turn.notes, source: 'local', state: 'done' };
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
  const display = latest
    ? (latest.source === 'gemini' ? simplifyText(latest.ai) : plainAnalyst(latest.question, latest.notes, latest.caveats))
    : '';

  return (
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
              <p className="text-[11px] text-slate-400">Sees what you are working on · can open pages</p>
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
              <article className="space-y-2">
                <p className="text-xs text-slate-400">You asked</p>
                <p className="text-sm text-white">{latest.question}</p>
                <p className="text-[11px] text-slate-500">
                  {latest.source === 'gemini' ? 'Live AI answer' : 'NASA notes (AI still loading or unavailable)'}
                  {latest.state === 'loading' ? ' · writing…' : ''}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{display}</p>
                {latest.opened && (
                  <p className="rounded-lg bg-micro-500/15 px-2 py-1.5 text-[11px] text-micro-100">
                    On screen: {latest.opened.label}
                  </p>
                )}
                {latest.caveats.map(c => (
                  <p key={c} className="text-[11px] text-amber-200">⚠ {simplifyText(c)}</p>
                ))}
                {latest.hits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {latest.hits.map(h => (
                      <button
                        key={h.accession}
                        type="button"
                        onClick={() => {
                          applyOpen({ path: `/explorer/${h.accession}`, label: h.label });
                          setTurns(list => list.map((turn, i) => (
                            i === 0 ? { ...turn, opened: { path: `/explorer/${h.accession}`, label: h.label } } : turn
                          )));
                        }}
                        className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-micro-200 hover:bg-white/10"
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
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-flame-500 text-white shadow-lg shadow-flame-500/30 ring-2 ring-white/20 transition hover:bg-flame-400 hover:scale-105"
        aria-expanded={open}
        aria-label={open ? 'Close Ask FlameSight' : 'Open Ask FlameSight'}
      >
        {open ? (
          <span className="text-xl leading-none">✕</span>
        ) : (
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19a7 7 0 1 0-6.3-4L4 20l5.2-1.4A7 7 0 0 0 12 19Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
