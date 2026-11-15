import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader, Pill } from '../components/ui';
import { stats } from '../lib/data';
import { SCENARIOS } from '../lib/scenarios';
import { useUiVariation } from '../lib/uiVariation';

type Sample = {
  mission: string;
  o2: string;
  psi: string;
  gravity: string;
  verdict: string;
  score: number;
  takeaway: string;
  studies: { name: string; score: number; role: string }[];
};

const SAMPLE: Sample = {
  mission: 'ISS / Spacecraft',
  o2: '21%',
  psi: '14.7 psi',
  gravity: 'Micro-g',
  verdict: 'Borderline',
  score: 58,
  takeaway: 'Cabin air is Earth-like, but without buoyancy a flame can linger as a cool sphere near soft goods.',
  studies: [
    { name: 'BASS', score: 92, role: 'Spread' },
    { name: 'FLEX', score: 88, role: 'Droplets' },
    { name: 'SAFFIRE', score: 81, role: 'Large scale' },
    { name: 'ACME', score: 74, role: 'Limits' },
  ],
};

const METRICS = [
  { label: 'Investigations', value: String(stats.investigations) },
  { label: 'Tests', value: stats.testsTotal.toLocaleString() },
  { label: 'PSI data', value: `${stats.totalTB} TB` },
  { label: 'FLEX out', value: `${stats.flex.pctSelfExtinguished}%` },
];

export type Variation = {
  id: string;
  name: string;
  blurb: string;
  render: (s: Sample) => ReactNode;
};

function Shell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-2xl border border-white/10 bg-space-900/80 ${className}`}>{children}</div>;
}

export const VARIATIONS: Variation[] = [
  {
    id: 'glass-cards',
    name: 'Glass cards',
    blurb: 'Current FlameSight look: frosted panels and soft glow.',
    render: s => (
      <Shell className="p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {METRICS.map(m => (
            <div key={m.label} className="glass rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">{m.label}</p>
              <p className="mt-1 font-mono text-2xl text-flame-300">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 glass rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">{s.mission}</h3>
            <Pill tone="amber">{s.verdict}</Pill>
          </div>
          <p className="mt-2 text-sm text-slate-300">{s.takeaway}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>{s.o2} O₂</span><span>·</span><span>{s.psi}</span><span>·</span><span>{s.gravity}</span>
          </div>
        </div>
      </Shell>
    ),
  },
  {
    id: 'dense-table',
    name: 'Dense table',
    blurb: 'Spreadsheet-tight rows for scanning many numbers fast.',
    render: s => (
      <Shell>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-slate-200">
            <tr><td className="px-3 py-2 text-slate-400">Mission</td><td className="px-3 py-2">{s.mission}</td><td className="px-3 py-2 text-slate-500">preset</td></tr>
            <tr><td className="px-3 py-2 text-slate-400">O₂ / P / g</td><td className="px-3 py-2">{s.o2} · {s.psi} · {s.gravity}</td><td className="px-3 py-2 text-slate-500">cabin</td></tr>
            <tr><td className="px-3 py-2 text-slate-400">Verdict</td><td className="px-3 py-2 text-amber-300">{s.verdict} ({s.score}%)</td><td className="px-3 py-2 text-slate-500">model</td></tr>
            {s.studies.map(st => (
              <tr key={st.name}><td className="px-3 py-2 text-slate-400">{st.name}</td><td className="px-3 py-2">{st.score}</td><td className="px-3 py-2 text-slate-500">{st.role}</td></tr>
            ))}
          </tbody>
        </table>
      </Shell>
    ),
  },
  {
    id: 'hero-strip',
    name: 'Hero number strip',
    blurb: 'One giant verdict with a thin metric ribbon underneath.',
    render: s => (
      <Shell className="bg-gradient-to-br from-space-800 to-space-950 p-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-400">{s.mission}</p>
        <p className="mt-2 text-5xl font-semibold text-amber-300 sm:text-6xl">{s.verdict}</p>
        <p className="mt-1 font-mono text-micro-300">{s.score}% burn likelihood</p>
        <p className="mx-auto mt-4 max-w-md text-sm text-slate-300">{s.takeaway}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-6 border-t border-white/10 pt-4 font-mono text-sm">
          {METRICS.map(m => (
            <div key={m.label}><span className="text-white">{m.value}</span> <span className="text-slate-500">{m.label}</span></div>
          ))}
        </div>
      </Shell>
    ),
  },
  {
    id: 'mission-log',
    name: 'Mission log',
    blurb: 'Chronological / checklist tone, like a flight ops transcript.',
    render: s => (
      <Shell className="p-4 font-mono text-sm">
        <p className="text-micro-300">// cabin check · {s.mission}</p>
        <ul className="mt-3 space-y-2 text-slate-300">
          <li><span className="text-emerald-400">OK</span> atmosphere {s.o2} @ {s.psi}</li>
          <li><span className="text-emerald-400">OK</span> gravity regime {s.gravity}</li>
          <li><span className="text-amber-400">WARN</span> verdict {s.verdict.toUpperCase()} · p={s.score / 100}</li>
          <li><span className="text-slate-500">NOTE</span> {s.takeaway}</li>
        </ul>
        <div className="mt-4 border-t border-dashed border-white/15 pt-3">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">nearest studies</p>
          {s.studies.map(st => (
            <p key={st.name} className="mt-1 text-slate-200">→ {st.name.padEnd(10)} {st.score} · {st.role}</p>
          ))}
        </div>
      </Shell>
    ),
  },
  {
    id: 'gauge-ring',
    name: 'Gauge rings',
    blurb: 'Circular progress rings for score and key cabin knobs.',
    render: s => {
      const ring = (pct: number, color: string, label: string, value: string) => (
        <div className="flex flex-col items-center">
          <div
            className="grid h-24 w-24 place-items-center rounded-full"
            style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0)` }}
          >
            <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-space-900 text-center">
              <span className="font-mono text-lg text-white">{value}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{label}</p>
        </div>
      );
      return (
        <Shell className="p-5">
          <p className="mb-4 text-center text-sm text-slate-300">{s.mission} · {s.verdict}</p>
          <div className="flex flex-wrap justify-center gap-6">
            {ring(s.score, '#ff9f43', 'Burn score', `${s.score}%`)}
            {ring(21, '#5cb8ff', 'Oxygen', s.o2)}
            {ring(67.9, '#9fd3ff', 'FLEX out', `${stats.flex.pctSelfExtinguished}%`)}
            {ring(40, '#ffc27a', 'Pressure', s.psi.split(' ')[0])}
          </div>
        </Shell>
      );
    },
  },
  {
    id: 'split-pane',
    name: 'Split pane',
    blurb: 'Verdict on the left, supporting evidence stacked on the right.',
    render: s => (
      <Shell className="grid sm:grid-cols-2">
        <div className="border-b border-white/10 bg-flame-500/10 p-5 sm:border-b-0 sm:border-r">
          <p className="text-xs uppercase tracking-widest text-flame-300">Verdict</p>
          <p className="mt-2 text-4xl font-semibold text-white">{s.verdict}</p>
          <p className="mt-1 font-mono text-micro-300">{s.score}%</p>
          <p className="mt-4 text-sm text-slate-300">{s.takeaway}</p>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-sm font-medium text-white">{s.mission}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-slate-500">O₂</dt><dd className="text-white">{s.o2}</dd></div>
            <div><dt className="text-slate-500">Pressure</dt><dd className="text-white">{s.psi}</dd></div>
            <div><dt className="text-slate-500">Gravity</dt><dd className="text-white">{s.gravity}</dd></div>
            <div><dt className="text-slate-500">Studies</dt><dd className="text-white">{stats.investigations}</dd></div>
          </dl>
          <ul className="space-y-1 text-sm text-slate-300">
            {s.studies.map(st => <li key={st.name} className="flex justify-between"><span>{st.name}</span><span className="font-mono text-flame-300">{st.score}</span></li>)}
          </ul>
        </div>
      </Shell>
    ),
  },
  {
    id: 'editorial',
    name: 'Editorial columns',
    blurb: 'Magazine layout: big lead + narrow fact rail.',
    render: s => (
      <Shell className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
        <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-flame-400">Briefing</p>
          <h3 className="mt-2 text-3xl font-semibold leading-tight text-white">Will it burn on the {s.mission.split('/')[0].trim()}?</h3>
          <p className="mt-4 text-base leading-relaxed text-slate-300">{s.takeaway}</p>
          <p className="mt-4 text-sm text-amber-200/90">Model says <strong>{s.verdict}</strong> at {s.score}%.</p>
        </div>
        <aside className="bg-white/[0.03] p-5 text-sm">
          <p className="border-b border-white/10 pb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Facts</p>
          {[['Atmosphere', `${s.o2} · ${s.psi}`], ['Gravity', s.gravity], ['Catalog', `${stats.investigations} investigations`], ['Tests', stats.testsTotal.toLocaleString()]].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/5 py-2"><span className="text-slate-400">{k}</span><span className="text-white">{v}</span></div>
          ))}
        </aside>
      </Shell>
    ),
  },
  {
    id: 'terminal',
    name: 'Terminal console',
    blurb: 'CRT-style green-on-black readout for ops nerds.',
    render: s => (
      <Shell className="bg-black p-4 font-mono text-[13px] leading-relaxed text-emerald-400">
        <p className="text-emerald-600">flamesight@psi:~$ cabin-report --mission iss</p>
        <p className="mt-2">MISSION .... {s.mission}</p>
        <p>ATMOSPHERE . {s.o2} O2 / {s.psi} / {s.gravity}</p>
        <p>VERDICT .... <span className="text-amber-300">{s.verdict}</span> [{s.score}]</p>
        <p className="mt-2 text-emerald-200/80"># {s.takeaway}</p>
        <p className="mt-3 text-emerald-600">--- ranked studies ---</p>
        {s.studies.map(st => (
          <p key={st.name}>{st.score.toString().padStart(3)}  {st.name}  ({st.role})</p>
        ))}
        <p className="mt-2 animate-pulse">_</p>
      </Shell>
    ),
  },
  {
    id: 'soft-light',
    name: 'Soft light panels',
    blurb: 'Lighter surfaces and inkier type — calmer classroom feel.',
    render: s => (
      <Shell className="border-slate-300/20 bg-[#e8eef8] p-4 text-slate-800">
        <div className="grid gap-3 sm:grid-cols-4">
          {METRICS.map(m => (
            <div key={m.label} className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{m.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{s.mission}</h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">{s.verdict}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{s.takeaway}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.studies.map(st => (
              <span key={st.name} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{st.name} · {st.score}</span>
            ))}
          </div>
        </div>
      </Shell>
    ),
  },
  {
    id: 'type-first',
    name: 'Typography first',
    blurb: 'Almost no chrome — hierarchy does the work.',
    render: s => (
      <Shell className="space-y-4 border-none bg-transparent p-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{s.mission}</p>
        <h3 className="text-5xl font-semibold tracking-tight text-white">{s.verdict}</h3>
        <p className="max-w-xl text-lg text-slate-300">{s.takeaway}</p>
        <p className="font-mono text-sm text-flame-300">{s.o2} · {s.psi} · {s.gravity} · score {s.score}</p>
        <p className="text-sm text-slate-400">{s.studies.map(st => st.name).join(' · ')}</p>
      </Shell>
    ),
  },
  {
    id: 'chip-rail',
    name: 'Horizontal chip rail',
    blurb: 'Scrollable pills for metrics and ranked studies.',
    render: s => (
      <Shell className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-white">{s.mission}</h3>
          <Pill tone="amber">{s.verdict} · {s.score}%</Pill>
        </div>
        <p className="mt-2 text-sm text-slate-300">{s.takeaway}</p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {[...METRICS.map(m => `${m.label}: ${m.value}`), s.o2, s.psi, s.gravity, ...s.studies.map(st => `${st.name} ${st.score}`)].map(chip => (
            <span key={chip} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10">{chip}</span>
          ))}
        </div>
      </Shell>
    ),
  },
  {
    id: 'heatmap',
    name: 'Heatmap tiles',
    blurb: 'Color intensity encodes risk / relevance at a glance.',
    render: s => (
      <Shell className="p-4">
        <p className="mb-3 text-sm text-slate-300">{s.mission} · heat = relevance / burn risk</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Verdict', value: s.verdict, heat: s.score },
            ...s.studies.map(st => ({ label: st.name, value: String(st.score), heat: st.score })),
            { label: 'O₂', value: s.o2, heat: 40 },
            { label: 'FLEX out', value: `${stats.flex.pctSelfExtinguished}%`, heat: stats.flex.pctSelfExtinguished },
            { label: 'Tests', value: stats.testsTotal.toLocaleString(), heat: 55 },
          ].map(cell => (
            <div
              key={cell.label}
              className="rounded-xl p-3"
              style={{ background: `rgba(255, 122, 26, ${0.08 + (cell.heat / 100) * 0.45})` }}
            >
              <p className="text-[10px] uppercase tracking-wider text-flame-200/80">{cell.label}</p>
              <p className="mt-1 font-mono text-xl text-white">{cell.value}</p>
            </div>
          ))}
        </div>
      </Shell>
    ),
  },
  {
    id: 'stacked-rows',
    name: 'Stacked rows',
    blurb: 'Full-width accordion-style bands, one fact per row.',
    render: s => (
      <Shell>
        {[
          ['Mission', s.mission],
          ['Cabin', `${s.o2} · ${s.psi} · ${s.gravity}`],
          ['Verdict', `${s.verdict} (${s.score}%)`],
          ['Takeaway', s.takeaway],
          ['Top studies', s.studies.map(st => `${st.name} ${st.score}`).join(', ')],
        ].map(([k, v], i) => (
          <div key={k} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6 ${i % 2 ? 'bg-white/[0.03]' : ''}`}>
            <span className="w-28 shrink-0 text-xs uppercase tracking-wider text-slate-500">{k}</span>
            <span className="text-sm text-slate-200">{v}</span>
          </div>
        ))}
      </Shell>
    ),
  },
  {
    id: 'kpi-sparks',
    name: 'KPI + spark bars',
    blurb: 'Dashboard tiles with tiny bar charts under each number.',
    render: s => (
      <Shell className="p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400">{s.mission}</p>
            <p className="text-2xl font-semibold text-white">{s.verdict} <span className="font-mono text-base text-amber-300">{s.score}%</span></p>
          </div>
          <p className="max-w-sm text-xs text-slate-400">{s.takeaway}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {s.studies.map(st => (
            <div key={st.name} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-xs text-slate-400">{st.name}</p>
              <p className="font-mono text-2xl text-micro-300">{st.score}</p>
              <div className="mt-2 flex h-8 items-end gap-0.5">
                {Array.from({ length: 8 }, (_, i) => {
                  const h = 20 + ((st.score + i * 7) % 60);
                  return <span key={i} className="flex-1 rounded-sm bg-micro-500/70" style={{ height: `${h}%` }} />;
                })}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{st.role}</p>
            </div>
          ))}
        </div>
      </Shell>
    ),
  },
  {
    id: 'story-cards',
    name: 'Story cards',
    blurb: 'Scenario postcards — pick a place, read the fire story.',
    render: s => (
      <Shell className="p-4">
        <p className="mb-3 text-sm text-slate-400">Sample cabin: {s.mission} → {s.verdict}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SCENARIOS.slice(0, 3).map(sc => (
            <div key={sc.id} className="overflow-hidden rounded-xl bg-gradient-to-b from-space-800 to-space-950 ring-1 ring-white/10">
              <div className="h-16 bg-gradient-to-r from-flame-600/40 to-micro-600/30" />
              <div className="p-3">
                <p className="font-semibold text-white">{sc.name}</p>
                <p className="mt-1 font-mono text-xs text-flame-300">{Math.round(sc.o2 * 100)}% O₂ · {sc.psi} psi</p>
                <p className="mt-2 line-clamp-3 text-xs text-slate-400">{sc.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </Shell>
    ),
  },
  {
    id: 'minimal-plain',
    name: 'Minimal plain',
    blurb: 'Non-Jarvis: flat panels, quiet type, no HUD corners or glow.',
    render: s => (
      <Shell className="rounded-lg border-slate-700/70 bg-[#0c1018] p-5 shadow-none">
        <p className="text-sm text-slate-500">{s.mission}</p>
        <p className="mt-1 text-3xl font-medium tracking-tight text-slate-100">{s.verdict}</p>
        <p className="mt-1 text-sm text-slate-500">{s.score}% burn likelihood</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">{s.takeaway}</p>
        <dl className="mt-5 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-4">
          {[
            ['O₂', s.o2],
            ['Pressure', s.psi],
            ['Gravity', s.gravity],
            ['Studies', String(stats.investigations)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-600">{k}</dt>
              <dd className="mt-0.5 text-sm text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-600">{s.studies.map(st => `${st.name} ${st.score}`).join(' · ')}</p>
      </Shell>
    ),
  },
];

export default function UiVariations() {
  const { id: selected, setId: setSelected } = useUiVariation();
  const active = VARIATIONS.find(v => v.id === selected) ?? VARIATIONS[0];

  return (
    <div className="space-y-8">
      <PageHeader kicker="Design lab" title={`${VARIATIONS.length} UI variations`}>
        Preview different ways to present FlameSight cabin data, scores, and study rankings. Select a style to apply it across the whole app — your choice is saved in this browser.
      </PageHeader>

      <section className="rounded-2xl border border-micro-500/30 bg-micro-500/5 p-4 sm:p-5" aria-live="polite">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-micro-300">Currently selected</p>
            <h2 className="text-xl font-semibold text-white">{active.name}</h2>
            <p className="text-sm text-slate-400">{active.blurb}</p>
          </div>
          <Link to="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15">See it on dashboard →</Link>
        </div>
        {active.render(SAMPLE)}
      </section>

      <section aria-label="All variations">
        <h2 className="mb-4 text-lg font-semibold text-white">Try all {VARIATIONS.length} · tap Select to apply app-wide</h2>
        <div className="grid gap-6">
          {VARIATIONS.map((v, i) => {
            const isOn = v.id === selected;
            return (
              <motion.article
                key={v.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.35) }}
                className={`rounded-2xl border p-4 sm:p-5 ${isOn ? 'border-flame-500/50 bg-flame-500/5' : 'border-white/10 bg-space-900/40'}`}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-slate-500">#{String(i + 1).padStart(2, '0')}</p>
                    <h3 className="text-lg font-semibold text-white">{v.name}</h3>
                    <p className="text-sm text-slate-400">{v.blurb}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(v.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${isOn ? 'bg-flame-500 text-white shadow-glow' : 'bg-white/10 text-white hover:bg-white/15'}`}
                    aria-pressed={isOn}
                  >
                    {isOn ? 'Selected ✓' : 'Select'}
                  </button>
                </div>
                {v.render(SAMPLE)}
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
