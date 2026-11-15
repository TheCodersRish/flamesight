import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { byAccession, invLabel } from '../lib/data';

export function Card({ children, className = '', glow }: { children: ReactNode; className?: string; glow?: 'flame' | 'micro' }) {
  return (
    <div className={`glass lift rounded-2xl p-5 ${glow === 'flame' ? 'shadow-glow' : glow === 'micro' ? 'shadow-glowBlue' : ''} ${className}`}>{children}</div>
  );
}

export function PageHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-flame-400">{kicker}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-3xl text-slate-300">{children}</div>}
    </header>
  );
}

export function TierBadge({ tier, label }: { tier: number | null; label?: string }) {
  const cls = tier === 1 ? 'bg-flame-500/15 text-flame-300 ring-flame-500/40' : tier === 2 ? 'bg-micro-500/15 text-micro-300 ring-micro-500/40' : 'bg-slate-500/15 text-slate-300 ring-slate-500/30';
  const txt = label || (tier === 1 ? '1 Core' : tier === 2 ? '2 Strong' : '3 Background');
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${cls}`} title="Fire-safety tier: our team's judgment (1 Core = named in the challenge), not NASA's">Tier {txt}</span>;
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'flame' | 'micro' | 'green' | 'amber' | 'red' }) {
  const t = { slate: 'bg-white/5 text-slate-300 ring-white/10', flame: 'bg-flame-500/15 text-flame-300 ring-flame-500/30', micro: 'bg-micro-500/15 text-micro-300 ring-micro-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30', amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30', red: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${t}`}>{children}</span>;
}

/** Source chip: links to the investigation inside the app and to its real NASA PSI page. */
export function SourceChip({ acc, compact }: { acc: string; compact?: boolean }) {
  const inv = byAccession[acc];
  if (!inv) return <Pill>{acc}</Pill>;
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full text-[11px] ring-1 ring-micro-500/40">
      <Link to={`/explorer/${acc}`} className="bg-micro-500/10 px-2 py-0.5 text-micro-300 hover:bg-micro-500/25">{compact ? acc : invLabel(acc)}</Link>
      <a href={inv.psiPage} target="_blank" rel="noreferrer" className="border-l border-micro-500/30 px-1.5 py-0.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label={`Open ${acc} on psi.nasa.gov`}>↗</a>
    </span>
  );
}

export function Stat({ label, value, sub, accent = 'flame' }: { label: string; value: ReactNode; sub?: ReactNode; accent?: 'flame' | 'micro' }) {
  return (
    <div className="glass lift rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-semibold ${accent === 'flame' ? 'text-flame-300' : 'text-micro-300'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; hint?: string }) {
  const id = `s-${label.replace(/\W+/g, '-')}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-slate-300">{label}</label>
        <span className="font-mono text-sm text-white">{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="mt-1 w-full" />
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function Takeaway({ children }: { children: ReactNode }) {
  return <p className="mt-3 border-l-2 border-flame-500 pl-3 text-sm text-slate-200"><span className="font-semibold text-flame-300">Takeaway: </span>{children}</p>;
}
