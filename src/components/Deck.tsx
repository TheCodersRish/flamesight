import type { ReactNode } from 'react';
import BrandLogo from './BrandLogo';

export function HudFrame({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`hud-panel relative flex min-h-0 flex-col rounded-2xl ${className}`}>
      <span className="hud-c tl" aria-hidden />
      <span className="hud-c tr" aria-hidden />
      <span className="hud-c bl" aria-hidden />
      <span className="hud-c br" aria-hidden />
      <h2 className="px-4 pt-3 text-sm font-semibold text-white">{title}</h2>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto px-4 py-3">{children}</div>
    </section>
  );
}

export function FlameStage({ title = 'Flame', caption, children, controls }: { title?: string; caption: string; children: ReactNode; controls?: ReactNode }) {
  return (
    <section className="flex min-h-[420px] flex-col lg:min-h-0">
      <div className="flex items-center gap-2.5 px-5 pt-4">
        <BrandLogo variant="mark" imgClassName="h-7 w-7 shrink-0" />
        <h1 className="text-lg font-semibold text-white">{title}</h1>
      </div>
      <div className="grid min-h-[200px] flex-1 place-items-center px-4">
        <div className="aspect-square w-[min(38vh,340px)] overflow-hidden rounded-full border border-white/15 shadow-[0_0_40px_-12px_rgba(94,200,255,0.7)]">
          {children}
        </div>
      </div>
      <p className="px-5 text-center text-xs text-slate-400">{caption}</p>
      {controls && <div className="grid gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">{controls}</div>}
    </section>
  );
}

export default function Deck({ experiments, graphs, outcome, stage, experimentsTitle = 'Closest tests', graphsTitle = 'Graph', outcomeTitle = 'What it means' }: { experiments: ReactNode; graphs: ReactNode; outcome: ReactNode; stage: ReactNode; experimentsTitle?: string; graphsTitle?: string; outcomeTitle?: string }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.15fr_0.9fr]">
      {stage}
      <div className="grid min-h-[520px] grid-rows-3 gap-3 p-3 lg:min-h-0">
        <HudFrame title={experimentsTitle}>{experiments}</HudFrame>
        <HudFrame title={graphsTitle}>{graphs}</HudFrame>
        <HudFrame title={outcomeTitle}>{outcome}</HudFrame>
      </div>
    </div>
  );
}
