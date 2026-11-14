import { useId } from 'react';
import type { ChartPanel, ChartSeries } from '../lib/freefall';

const COLORS = ['#ff9f43', '#5cb8ff', '#34d399', '#f472b6', '#facc15', '#a78bfa', '#fb7185', '#22d3ee'];

function pad(a: number, b: number, f: number): [number, number] {
  if (a === b) return [a - 1, b + 1];
  const d = (b - a) * f;
  let lo = a - d;
  const hi = b + d;
  if (a >= 0 && lo < 0) lo = 0;
  return [lo, hi];
}

function extent(series: ChartSeries[], axis: 0 | 1): [number, number] {
  const v = series.flatMap(s => s.pts.map(q => q[axis]));
  return [Math.min(...v), Math.max(...v)];
}

function ticks(a: number, b: number, n: number): number[] {
  if (!(b > a)) return [a];
  const step = (b - a) / (n - 1);
  return Array.from({ length: n }, (_, i) => a + step * i);
}

function num(v: number): string {
  const av = Math.abs(v);
  if (av >= 100) return v.toFixed(0);
  if (av >= 10) return v.toFixed(1);
  if (av >= 1) return String(Math.round(v * 100) / 100);
  return String(Math.round(v * 1000) / 1000);
}

function mode(s: ChartSeries): 'dash' | 'line' | 'dot' | 'ring' {
  if (s.kind === 'simulated') return 'dash';
  if (s.n > 250) return 'line';
  if (s.kind === 'measured') return 'dot';
  return 'ring';
}

export default function StudyChart({ panel }: { panel: ChartPanel }) {
  const W = 460;
  const H = 250;
  const m = { l: 52, r: 14, t: 10, b: 36 };
  const measured = panel.series.filter(s => s.kind !== 'simulated');
  const base = panel.clip && measured.length ? measured : panel.series;
  const [x0, x1] = pad(...extent(base, 0), 0.05);
  const [y0, y1] = pad(...extent(base, 1), panel.clip ? 0.3 : 0.08);
  const sx = (v: number) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const xs = ticks(x0, x1, 5);
  const ys = ticks(y0, y1, 5);
  const clipId = useId().replace(/:/g, '');

  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-100/80">{panel.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${panel.y} against ${panel.x}`} className="h-auto w-full">
        <defs>
          <clipPath id={clipId}>
            <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} />
          </clipPath>
        </defs>
        {xs.map(v => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={m.t} y2={H - m.b} stroke="rgba(148,180,255,0.12)" />
            <text x={sx(v)} y={H - m.b + 14} textAnchor="middle" fill="#94a3b8" fontSize="10">{num(v)}</text>
          </g>
        ))}
        {ys.map(v => (
          <g key={`y${v}`}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke="rgba(148,180,255,0.12)" />
            <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" fill="#94a3b8" fontSize="10">{num(v)}</text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          {panel.series.map(s => {
            const c = COLORS[s.color % COLORS.length];
            const md = mode(s);
            const key = `${s.label}-${s.kind}`;
            if (md === 'dash' || md === 'line') {
              return (
                <polyline key={key} fill="none" stroke={c} strokeWidth={md === 'dash' ? 2 : 1.4}
                  strokeDasharray={md === 'dash' ? '6 3' : undefined} strokeLinejoin="round"
                  points={s.pts.map(q => `${sx(q[0]).toFixed(1)},${sy(q[1]).toFixed(1)}`).join(' ')} />
              );
            }
            return (
              <g key={key}>
                {s.pts.map((q, i) => (
                  <circle key={i} cx={sx(q[0]).toFixed(1)} cy={sy(q[1]).toFixed(1)} r={s.n > 80 ? 2 : 3.2}
                    fill={md === 'dot' ? c : 'none'} stroke={c} strokeWidth={md === 'dot' ? 0 : 1.5} />
                ))}
              </g>
            );
          })}
        </g>
        <text x={(W + m.l - m.r) / 2} y={H - 4} textAnchor="middle" fill="#cbd5e1" fontSize="11">{panel.x}</text>
        <text transform={`translate(13 ${(H - m.b + m.t) / 2}) rotate(-90)`} textAnchor="middle" fill="#cbd5e1" fontSize="11">{panel.y}</text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
        {panel.series.map(s => (
          <span key={`${s.label}-${s.kind}`} className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[s.color % COLORS.length] }} />
            {s.label}, {s.kind === 'unspecified' ? 'source not stated' : s.kind}{s.inferred ? ' ?' : ''}
          </span>
        ))}
      </div>
      {panel.clip && <p className="mt-1 text-[10px] text-slate-500">Axes fit the measured values. Simulated values outside that range are cut off.</p>}
      {panel.note && <p className="mt-1 text-[10px] text-slate-500">{panel.note}</p>}
    </figure>
  );
}
