import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useDemo } from '../demo/Demo';
import DbSearch from '../components/DbSearch';
import Flame from '../components/Flame';
import StudyChart from '../components/StudyChart';
import { Pill, Slider, SourceChip } from '../components/ui';
import { fuelOptions, invLabel } from '../lib/data';
import { freefallStudies, studiesById, studiesFor, studyContext, type FreefallStudy, type OutcomeSlice } from '../lib/freefall';
import { predict, type Diluent, type SimInput } from '../lib/knn';
import { GRAVITY, SCENARIOS } from '../lib/scenarios';
import type { Gravity } from '../lib/types';

const NAV = [
  { to: '/', label: 'Will It Burn?', end: true },
  { to: '/overview', label: 'Overview' },
  { to: '/explorer', label: 'Experiments' },
  { to: '/scenarios', label: 'Risk Ranking' },
  { to: '/insights', label: 'Insights' },
  { to: '/analyst', label: 'Analyst' },
  { to: '/about', label: 'About' },
];

const briefCache = new Map<string, string>();
const OUTCOME_COLORS = ['#5cb8ff', '#facc15', '#ff7a1a', '#34d399'];
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

function HudFrame({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`hud-panel relative flex min-h-0 flex-col ${className}`}>
      <i className="hud-c tl" /><i className="hud-c tr" /><i className="hud-c bl" /><i className="hud-c br" />
      <header className="flex items-center gap-2 border-b border-cyan-200/15 px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
        <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-100">{title}</h2>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto px-3 py-2">{children}</div>
    </section>
  );
}

function OutcomeBar({ outcomes }: { outcomes: OutcomeSlice[] }) {
  const total = outcomes.reduce((n, o) => n + o.n, 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label={outcomes.map(o => `${o.n} ${o.name}`).join(', ')}>
        {outcomes.map((o, i) => <div key={o.name} style={{ flex: o.n, background: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }} />)}
      </div>
      <ul className="mt-2 space-y-1 text-xs text-slate-300">
        {outcomes.map((o, i) => (
          <li key={o.name} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-2 rounded-full" style={{ background: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }} />{o.name}</span>
            <span className="font-mono text-cyan-100">{o.n} · {total ? Math.round((100 * o.n) / total) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Command() {
  const { running, start, stop } = useDemo();
  const [sp, setSp] = useSearchParams();
  const [x, setX] = useState<SimInput>({ fuel: 'any', o2: 0.21, psi: 14.7, flow: 20, gravity: 'micro', diluent: 'none' });
  const set = <K extends keyof SimInput>(k: K, v: SimInput[K]) => setX(s => ({ ...s, [k]: v }));
  const result = useMemo(() => predict(x), [x]);
  const flame = {
    gravity: GRAVITY[x.gravity].flame,
    o2: clamp(((x.o2 - 0.12) / 0.55) * (0.45 + 0.55 * result.p)),
    flow: clamp(x.flow / 60),
    dilution: x.diluent === 'none' ? 0 : x.diluent === 'CO2' ? 0.65 : 0.5,
  };

  const caseId = sp.get('case');
  const exp = sp.get('exp');
  const neighborAccs = [...new Set(result.neighbors.map(n => n.t.inv))];
  const autoStudy = neighborAccs.flatMap(acc => studiesFor(acc))[0] || freefallStudies.find(s => s.id === 'flex-outcomes');
  const study: FreefallStudy | undefined = (caseId && studiesById[caseId]) || (exp ? studiesFor(exp)[0] : undefined) || autoStudy;

  const simKey = [x.fuel, x.o2.toFixed(2), x.psi.toFixed(1), x.flow, x.gravity, x.diluent].join('|');
  const cachedBrief = briefCache.get(simKey) ?? null;
  const [briefKey, setBriefKey] = useState(simKey);
  const [brief, setBrief] = useState<string | null>(cachedBrief);
  const [briefState, setBriefState] = useState<'pending' | 'done' | 'off'>(cachedBrief ? 'done' : 'pending');
  if (briefKey !== simKey) {
    setBriefKey(simKey);
    setBrief(cachedBrief);
    setBriefState(cachedBrief ? 'done' : 'pending');
  }

  useEffect(() => {
    if (briefCache.has(simKey)) return;
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 25000);
    const wait = window.setTimeout(() => {
      const fuel = x.fuel === 'any' ? 'an unspecified fuel' : x.fuel;
      const tests = result.neighbors.map(n => `${n.t.id} (${n.t.inv}): ${n.t.fuel}, ${Math.round(n.t.o2 * 100)}% O2, outcome ${n.t.outcome || 'not listed'}, burn score ${n.t.burn}.`).join(' ');
      const text = `Conditions: ${Math.round(x.o2 * 100)}% oxygen, ${x.psi} psi, ${x.flow} cm/s, ${GRAVITY[x.gravity].label}, suppressant ${x.diluent}. Model verdict: ${result.verdict} to burn, score ${Math.round(result.p * 100)}/100, confidence ${result.confidenceLabel}. Nearest NASA tests: ${tests} ${result.flags.join(' ')}`;
      void fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Will ${fuel} burn under these spacecraft conditions, and what should a habitat designer take from the nearest NASA tests?`,
          context: [{ accession: result.neighbors[0]?.t.inv || 'PSI-69', name: 'Will It Burn? nearest NASA tests', url: 'https://psi.nasa.gov', text }],
        }),
        signal: ctl.signal,
      }).then(async r => {
        const j = (await r.json()) as { answer?: string; error?: string };
        if (ctl.signal.aborted) return;
        const answer = r.ok && j.answer
          ? j.answer
          : /quota/i.test(j.error || '')
            ? 'Gemini is connected, but this key is over its quota right now. The score above is still the local model over the NASA tests.'
            : '';
        if (!answer) throw new Error('no brief');
        briefCache.set(simKey, answer);
        setBrief(answer);
        setBriefState('done');
      }).catch(() => { if (!ctl.signal.aborted) setBriefState('off'); });
    }, 500);
    return () => { ctl.abort(); window.clearTimeout(timer); window.clearTimeout(wait); };
  }, [simKey, result, x]);

  const selectStudy = (s: FreefallStudy) => setSp({ case: s.id });
  const charted = ['PSI-69', 'PSI-117', 'PSI-142'].map(acc => freefallStudies.filter(s => s.acc === acc)).filter(g => g.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-cyan-200/15 bg-space-950/80 px-2 py-2 lg:w-44 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-4" aria-label="Menu">
        <NavLink to="/" className="mb-1 hidden items-center gap-2 lg:flex" aria-label="FlameSight home">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan-200/40 bg-gradient-to-br from-flame-500 to-micro-600 font-mono text-xs font-bold text-white">FS</span>
          <span className="font-mono text-xs tracking-[0.16em] text-white">FLAME<span className="text-cyan-300">SIGHT</span></span>
        </NavLink>
        <p className="mb-2 hidden font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-200/50 lg:block">Menu</p>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `whitespace-nowrap rounded px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] lg:whitespace-normal ${isActive ? 'bg-cyan-300/15 text-cyan-50' : 'text-slate-400 hover:text-white'}`}>{n.label}</NavLink>
        ))}
        <DbSearch className="mt-2 w-44 shrink-0 lg:mt-4 lg:w-full" />
        <button onClick={running ? stop : start} className={`mt-2 whitespace-nowrap rounded px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] ${running ? 'bg-white/10 text-white' : 'text-flame-300 hover:bg-flame-500/10'}`}>
          {running ? 'Stop demo' : 'Guided demo'}
        </button>
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex min-h-[420px] flex-col lg:min-h-0">
          <h1 className="py-2 text-center font-mono text-xs uppercase tracking-[0.4em] text-cyan-100">Flame analysis</h1>
          <div className="grid flex-1 place-items-center px-4">
            <div className="relative aspect-square w-[min(48vh,440px)]">
              <div className="absolute inset-3 overflow-hidden rounded-full border border-cyan-200/30 shadow-[0_0_48px_-10px_rgba(94,200,255,0.75)]">
                <Flame {...flame} className="h-full w-full" label={`Will It Burn flame: ${GRAVITY[x.gravity].label}, ${Math.round(x.o2 * 100)}% oxygen`} />
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-cyan-200/25" />
            </div>
          </div>
          <p className="px-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Will It Burn? · illustrative flame · not a combustion simulation</p>
          <div className="grid gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300 sm:col-span-2">
              Fuel
              <select value={x.fuel} onChange={e => set('fuel', e.target.value)} className="mt-1 w-full rounded border border-cyan-200/20 bg-space-950 px-2 py-1 text-sm text-white">
                <option value="any">Any fuel</option>
                {fuelOptions.map(f => <option key={f.fuel} value={f.fuel}>{f.fuel}</option>)}
              </select>
            </label>
            <Slider label="Oxygen" value={x.o2} min={0.1} max={1} step={0.01} onChange={v => set('o2', v)} format={v => `${Math.round(v * 100)}%`} />
            <Slider label="Pressure" value={x.psi} min={2} max={45} step={0.1} onChange={v => set('psi', v)} format={v => `${v.toFixed(1)} psi`} />
            <Slider label="Airflow" value={x.flow} min={0} max={50} step={1} onChange={v => set('flow', v)} format={v => `${v} cm/s`} />
            <div>
              <p className="text-sm text-slate-300">Gravity</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(Object.keys(GRAVITY) as Gravity[]).map(g => (
                  <button key={g} type="button" onClick={() => set('gravity', g)} aria-pressed={x.gravity === g} className={`rounded px-2 py-1 font-mono text-[10px] uppercase ${x.gravity === g ? 'bg-cyan-300/20 text-white' : 'bg-white/5 text-slate-400'}`}>{g}</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-1">
              {SCENARIOS.map(s => (
                <button key={s.id} type="button" onClick={() => setX(v => ({ ...v, o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity }))} className="rounded border border-cyan-200/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:text-white">{s.short}</button>
              ))}
              {(['none', 'CO2', 'He'] as Diluent[]).map(d => (
                <button key={d} type="button" onClick={() => set('diluent', d)} aria-pressed={x.diluent === d} className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${x.diluent === d ? 'bg-flame-500/25 text-white' : 'text-slate-400'}`}>{d === 'none' ? 'No gas' : d === 'CO2' ? 'CO₂' : 'Helium'}</button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid min-h-[520px] grid-rows-3 gap-2 p-2 lg:min-h-0">
          <HudFrame title="Experiments">
            <ul className="space-y-1.5">
              {result.neighbors.map((n, i) => (
                <li key={n.t.id}>
                  <button type="button" onClick={() => { const first = studiesFor(n.t.inv)[0]; if (first) selectStudy(first); else setSp({ exp: n.t.inv }); }} className="w-full rounded px-1 py-1 text-left hover:bg-white/5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[10px] text-cyan-200/70">#{i + 1} {invLabel(n.t.inv)}</span>
                      <Pill tone={n.t.burn >= 0.8 ? 'red' : n.t.burn >= 0.5 ? 'amber' : 'micro'}>{n.t.outcome || 'no outcome'}</Pill>
                    </span>
                    <span className="block truncate text-xs text-slate-200">{n.t.id} · {n.t.fuel} · {Math.round(n.t.o2 * 100)}% O₂</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mb-1 mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Charted cases</p>
            {charted.map(group => (
              <div key={group[0].acc} className="mb-2">
                <p className="font-mono text-[10px] text-cyan-200/70">{invLabel(group[0].acc)}</p>
                {group.map(s => (
                  <button key={s.id} type="button" onClick={() => selectStudy(s)} className={`block w-full truncate rounded px-1 py-0.5 text-left text-xs ${study?.id === s.id ? 'bg-cyan-300/15 text-white' : 'text-slate-400 hover:text-white'}`}>{s.title}</button>
                ))}
              </div>
            ))}
          </HudFrame>

          <HudFrame title="Graphs">
            {study?.outcomes && <OutcomeBar outcomes={study.outcomes} />}
            {study && study.panels.length > 0 && (
              <div className="space-y-3">
                {study.panels.map(p => <StudyChart key={`${study.id}-${p.title}-${p.x}`} panel={p} />)}
                <p className="text-[10px] text-slate-500">{study.file && <span className="font-mono">{study.file}</span>}{study.ref.label ? ` · ${study.ref.label}` : ''}</p>
              </div>
            )}
            {study && !study.panels.length && !study.outcomes && <p className="text-sm text-slate-400">No plotted series for this case.</p>}
            {!study && <p className="text-sm text-slate-400">No chart in the freefall pack for these nearest tests.</p>}
          </HudFrame>

          <HudFrame title="Outcome / analyst">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">Will It Burn?</p>
            <p className={`mt-1 text-2xl font-semibold ${result.verdict === 'Likely' ? 'text-flame-300' : result.verdict === 'Borderline' ? 'text-amber-200' : 'text-cyan-200'}`}>{result.verdict} to burn</p>
            <p className="font-mono text-xs text-slate-400">{Math.round(result.p * 100)}/100 · {result.confidenceLabel} confidence · {Math.round(x.o2 * 100)}% O₂ · {x.psi.toFixed(1)} psi · {GRAVITY[x.gravity].label}</p>
            {result.flags.map(f => <p key={f} className="mt-2 text-xs text-amber-200">⚠ {f}</p>)}
            <div className="mt-2 rounded border border-cyan-200/20 bg-cyan-300/5 p-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200">Gemini · nearest NASA tests</p>
              {briefState === 'pending' && <p className="mt-1 animate-pulse text-sm text-slate-300">Reading the nearest tests…</p>}
              {brief && <p className="mt-1 text-sm text-slate-100">{brief}</p>}
              {briefState === 'off' && <p className="mt-1 text-xs text-slate-400">Gemini did not answer. The score above is the local model over the NASA tests.</p>}
            </div>
            {study && <p className="mt-2 text-[11px] text-slate-500">Graph on screen: {study.title}. <SourceChip acc={study.acc} compact /></p>}
            {study && <p className="mt-1 text-[11px] text-slate-500">{studyContext(study).text.split('\n')[0]}</p>}
          </HudFrame>
        </div>
      </div>
    </div>
  );
}
