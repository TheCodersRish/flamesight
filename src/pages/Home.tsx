import { useEffect, useState } from 'react';
import ScenarioIcon from '../components/ScenarioIcon';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Flame from '../components/Flame';
import { Stat, Card, Pill } from '../components/ui';
import { stats } from '../lib/data';
import { transportPhaseFlame, type TransportPhase } from '../lib/physicsBridge';
import { SCENARIOS, GRAVITY } from '../lib/scenarios';
import { rankForScenario } from '../lib/scoring';

const TOPS = Object.fromEntries(SCENARIOS.map(s => [s.id, rankForScenario(s)[0]]));
const PHASES: TransportPhase[] = ['no-rising', 'diffusion', 'weak-flow'];
const PHASE_MS = 4200;

export default function Home() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [auto, setAuto] = useState(true);
  const [manualG, setManualG] = useState(0);
  const phase = PHASES[phaseIdx];

  useEffect(() => {
    if (!auto) return;
    const t0 = performance.now(); let raf = 0;
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      setTick(t);
      const idx = Math.floor((now - t0) / PHASE_MS) % PHASES.length;
      setPhaseIdx(idx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  const live = auto ? transportPhaseFlame(phase, tick) : {
    gravity: manualG,
    o2: 0.55,
    flow: 0,
    dilution: 0,
    label: `Gravity ≈ ${manualG.toFixed(2)} g`,
  };

  const tiles = [
    { label: 'Investigations', value: stats.investigations, sub: `${stats.withTestMatrix} with test tables`, accent: 'micro' as const },
    { label: 'Test records', value: stats.testsTotal.toLocaleString(), sub: `${stats.perTestRows.toLocaleString()} table rows + ${stats.flamesIgnitedFromDailyTables.toLocaleString()} flames in daily logs`, accent: 'flame' as const },
    { label: 'Years covered', value: `${stats.yearMax - stats.yearMin + 1}`, sub: `${stats.yearMin}–${stats.yearMax} mission dates`, accent: 'micro' as const },
    { label: 'Data in PSI', value: `${stats.totalTB} TB`, sub: `${stats.totalFiles.toLocaleString()} files listed`, accent: 'flame' as const },
    { label: 'FLEX went out alone', value: `${stats.flex.pctSelfExtinguished}%`, sub: `${stats.flex.extinction} of ${stats.flex.tests} droplet fires went out on their own`, accent: 'micro' as const },
  ];

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-micro-300">NASA Space Apps 2026 · Flame in Freefall</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Fire behaves differently in space.<br /><span className="bg-gradient-to-r from-flame-400 to-micro-400 bg-clip-text text-transparent">FlameSight shows what NASA learned.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            We turned {stats.investigations} NASA near-zero-gravity fire experiments into clear fire-safety guidance for spacecraft, Moon and Mars homes, rovers, and spacesuits. Every number links back to NASA's own data—written so a high-school student can follow along.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/scenarios" className="rounded-xl bg-gradient-to-r from-flame-500 to-flame-600 px-5 py-2.5 font-medium text-white shadow-glow hover:brightness-110">Rank risks for a mission →</Link>
            <Link to="/simulator" className="rounded-xl bg-white/10 px-5 py-2.5 font-medium text-white hover:bg-white/15">Will it burn?</Link>
            <Link to="/analyst" className="rounded-xl px-5 py-2.5 font-medium text-micro-300 ring-1 ring-micro-500/40 hover:bg-micro-500/10">Ask the analyst</Link>
          </div>
        </div>
        <Card className="relative overflow-hidden p-0" glow="micro">
          <div className="grid-bg absolute inset-0 opacity-60" />
          <Flame gravity={live.gravity} o2={live.o2} flow={live.flow} dilution={live.dilution} className="h-[340px] w-full sm:h-[400px]" label={`Transport cycle: ${live.label}`} />
          <div className="relative border-t border-white/5 bg-space-900/70 px-5 py-3">
            <div className="mb-2 flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Transport phase">
              {PHASES.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={auto && phaseIdx === i}
                  onClick={() => { setAuto(true); setPhaseIdx(i); }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] ${auto && phaseIdx === i ? 'bg-micro-500/30 text-white ring-1 ring-micro-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  {p === 'no-rising' ? 'No rising air' : p === 'diffusion' ? 'Slow mixing' : 'Weak cabin flow'}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-micro-300">Feel transport before Fluid Physics</span>
              <Link to="/fluid-physics" className="text-flame-300 hover:underline">Open sims →</Link>
            </div>
            <input
              aria-label="Gravity override"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={auto ? live.gravity : manualG}
              onChange={e => { setAuto(false); setManualG(parseFloat(e.target.value)); }}
              className="w-full"
            />
            <p className="text-center text-[11px] text-slate-500">
              {auto
                ? `Cycling: ${live.label}. Drag gravity to take control.`
                : `Gravity ≈ ${manualG.toFixed(2)} g (illustrative). Click a phase chip to resume the cycle.`}
            </p>
          </div>
        </Card>
      </section>

      <section aria-label="Key numbers">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {tiles.map((t, i) => (
            <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }}>
              <Stat {...t} />
            </motion.div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">All tiles are computed at build time from the NASA PSI catalog and test tables (see About → Data).</p>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-white">Pick a mission setting</h2>
          <Link to="/about" className="text-sm text-slate-400 hover:text-white">Where do these numbers come from?</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SCENARIOS.map((s, i) => {
            const top = TOPS[s.id];
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>
                <Link to={`/scenarios?s=${s.id}`} className="glass group block h-full rounded-2xl p-4 transition hover:-translate-y-1 hover:border-flame-500/40">
                  <ScenarioIcon id={s.id} className="h-9 w-9 text-flame-300" />
                  <h3 className="mt-2 font-semibold text-white">{s.name}</h3>
                  <p className="mt-1 font-mono text-sm text-flame-300">{Math.round(s.o2 * 100)}% O₂ · {s.psi} psi</p>
                  <p className="text-xs text-slate-400">{GRAVITY[s.gravity].label}</p>
                  <p className="mt-2 text-xs text-slate-300">{s.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {GRAVITY[s.gravity].extrapolated && <Pill tone="amber">estimated beyond the data</Pill>}
                    <Pill tone="micro">top: {top.inv.acronym}</Pill>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { to: '/explorer', t: 'Experiment Explorer', d: 'All 24 NASA fire studies with plain-English summaries, tables, and charts.' },
          { to: '/insights', t: 'Insights', d: 'What the big NASA fire tests actually showed—in everyday language.' },
          { to: '/about', t: 'Method & limits', d: 'How scoring works, what the data cannot say, and where numbers come from.' },
        ].map(x => (
          <Link key={x.to} to={x.to} className="glass rounded-2xl p-5 hover:border-micro-500/40">
            <h3 className="font-semibold text-white">{x.t} →</h3>
            <p className="mt-1 text-sm text-slate-400">{x.d}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
