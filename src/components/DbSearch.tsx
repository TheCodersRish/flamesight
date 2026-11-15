import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLongSearchQuery, searchDatabase, searchStudiesRemote, type SearchHit } from '../lib/search';

export default function DbSearch({ className = '' }: { className?: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [aiHits, setAiHits] = useState<SearchHit[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const nav = useNavigate();
  const keywordHits = searchDatabase(q);
  const useAi = isLongSearchQuery(q);
  const hits = useAi && aiHits ? aiHits : keywordHits;

  useEffect(() => setActive(0), [q, hits]);

  useEffect(() => {
    if (!useAi) {
      setAiHits(null);
      setAiLoading(false);
      return;
    }
    const controller = new AbortController();
    setAiHits(null);
    setAiLoading(true);
    const timer = window.setTimeout(() => {
      void searchStudiesRemote(q, controller.signal).then(remote => {
        if (controller.signal.aborted) return;
        setAiHits(remote);
        setAiLoading(false);
      });
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q, useAi]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const go = (hit: SearchHit) => {
    nav(`/explorer/${hit.acc}`);
    setOpen(false);
    setQ('');
    setAiHits(null);
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">Search the NASA archive</label>
      <input
        id={inputId}
        type="search"
        value={q}
        placeholder="Search archive"
        autoComplete="off"
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, Math.max(hits.length - 1, 0))); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); go(hits[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        className="w-full rounded-md border border-cyan-300/25 bg-space-950/80 px-3 py-1.5 font-mono text-xs text-cyan-50 placeholder:text-slate-500 focus:border-cyan-300/70 focus:outline-none"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 z-50 mt-1 w-[min(24rem,80vw)] overflow-hidden rounded-md border border-cyan-300/25 bg-space-950/95 shadow-glowBlue backdrop-blur-xl" role="listbox">
          {useAi && (
            <p className="border-b border-cyan-300/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/70">
              {aiLoading ? 'AI matching studies…' : aiHits ? 'AI study match' : 'Keyword fallback'}
            </p>
          )}
          {hits.length === 0 && !aiLoading && <p className="px-3 py-3 text-xs text-slate-400">No investigations or charted cases match.</p>}
          {hits.length === 0 && aiLoading && <p className="px-3 py-3 text-xs text-slate-400">Finding the best NASA study…</p>}
          {hits.map((h, i) => (
            <button
              key={h.kind === 'study' ? `s-${h.id}` : `i-${h.acc}`}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={`block w-full px-3 py-2 text-left ${i === active ? 'bg-cyan-400/10' : 'hover:bg-white/5'}`}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">{h.kind === 'study' ? `Case · ${h.acc}` : `Experiment · ${h.acc}`}</span>
              <span className="mt-0.5 block text-sm text-white">{h.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-400">{h.blurb}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
