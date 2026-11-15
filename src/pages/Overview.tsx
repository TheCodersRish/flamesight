import { useEffect, useState } from 'react';
import ScenarioIcon from '../components/ScenarioIcon';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Flame from '../components/Flame';
import { Stat, Card, Pill } from '../components/ui';
import { stats } from '../lib/data';
import { fadeUp, stagger } from '../lib/motion';
import { SCENARIOS, GRAVITY, scenarioGravityLabel } from '../lib/scenarios';
import { rankForScenario } from '../lib/scoring';

const TOPS = Object.fromEntries(SCENARIOS.map(s => [s.id, rankForScenario(s)[0]]));

export default function Overview() {
  const [g, setG] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t0 = performance.now(); let raf = 0;
    const loop = (now: number) => { const t = (now - t0) / 1000; setG(0.5 - 0.5 * Math.cos(t * 0.6)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  const tiles = [
    { label: 'Investigations', value: stats.investigations, sub: `${stats.withTestMatrix} with test tables`, accent: 'micro' as const },
    { label: 'Test records', value: stats.testsTotal.toLocaleString(), sub: `${stats.perTestRows.toLocaleString()} table rows + ${stats.flamesIgnitedFromDailyTables.toLocaleString()} flames in daily logs`, accent: 'flame' as const },
    { label: 'Years covered', value: `${stats.yearMax - stats.yearMin + 1}`, sub: `${stats.yearMin}–${stats.yearMax} mission dates`, accent: 'micro' as const },
    { label: 'Data in PSI', value: `${stats.totalTB} TB`, sub: `${stats.totalFiles.toLocaleString()} files listed`, accent: 'flame' as const },
    { label: 'FLEX self-extinguished', value: `${stats.flex.pctSelfExtinguished}%`, sub: `${stats.flex.extinction} of ${stats.flex.tests} droplet fires`, accent: 'micro' as const },
  ];

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm text-micro-300">NASA Space Apps 2026 · Flame in Freefall</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Fire behaves differently in space.<br /><span className="bg-gradient-to-r from-flame-400 to-micro-400 bg-clip-text text-transparent">FlameSight shows what NASA learned — in plain words.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Explore {stats.investigations} real NASA fire studies for spacecraft, Moon and Mars homes, rovers, and spacesuits. Start with a simple yes/maybe/no, then dig deeper if you want.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className="tap rounded-xl bg-gradient-to-r from-flame-500 to-flame-600 px-5 py-2.5 font-medium text-white shadow-glow hover:brightness-110">Try the simple dashboard →</Link>
            <Link to="/simulator" className="tap rounded-xl bg-white/10 px-5 py-2.5 font-medium text-white hover:bg-white/15">Will it burn?</Link>
            <Link to="/analyst" className="tap rounded-xl px-5 py-2.5 font-medium text-micro-300 ring-1 ring-micro-500/40 hover:bg-micro-500/10">Ask a question</Link>
          </div>
        </div>
        <Card className="relative overflow-hidden p-0" glow="micro">
          <div className="grid-bg absolute inset-0 opacity-60" />
          <Flame gravity={g} o2={0.55} flow={0} dilution={0} className="h-[340px] w-full sm:h-[400px]" label="Flame morphing between Earth gravity and microgravity" />
          <div className="relative border-t border-white/5 bg-space-900/70 px-5 py-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-micro-300">Microgravity: round, blue, slow</span>
              <span className="text-flame-300">Earth: tall, yellow, flickering</span>
            </div>
            <input aria-label="Gravity" type="range" min={0} max={1} step={0.01} value={g} onChange={e => { setAuto(false); setG(parseFloat(e.target.value)); }} className="w-full" />
            <p className="text-center text-[11px] text-slate-500">{auto ? 'Auto-morphing. Drag to take control.' : `Gravity ≈ ${(g).toFixed(2)} g (illustrative)`}</p>
          </div>
        </Card>
      </section>

      <section aria-label="Key numbers">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {tiles.map((t, i) => (
            <motion.div key={t.label} {...fadeUp} transition={stagger(i)}>
              <Stat {...t} />
            </motion.div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">All tiles are computed at build time from the NASA PSI catalog and test tables (see About → Data).</p>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-white">Choose a mission scenario</h2>
          <Link to="/about" className="text-sm text-slate-400 hover:text-white">Where do these numbers come from?</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SCENARIOS.map((s, i) => {
            const top = TOPS[s.id];
            return (
              <motion.div key={s.id} {...fadeUp} transition={stagger(i, 0.03)}>
                <Link to={`/scenarios?s=${s.id}`} className="glass lift group block h-full rounded-2xl p-4 hover:border-flame-500/40">
                  <ScenarioIcon id={s.id} className="h-9 w-9 text-flame-300" />
                  <h3 className="mt-2 font-semibold text-white">{s.name}</h3>
                  <p className="mt-1 font-mono text-sm text-flame-300">{Math.round(s.o2 * 100)}% O₂ · {s.psi} psi</p>
                  <p className="text-xs text-slate-400">{scenarioGravityLabel(s)}</p>
                  <p className="mt-2 text-xs text-slate-300">{s.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {GRAVITY[s.gravity].extrapolated && <Pill tone="amber">extrapolated</Pill>}
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
          { to: '/explorer', t: 'Browse tests', d: 'All 24 investigations with clear summaries, test tables, and charts.' },
          { to: '/insights', t: 'What NASA found', d: 'What FLEX, BASS, SAFFIRE, CFI-G and PSI-117 data actually show.' },
          { to: '/about', t: 'Method & limits', d: 'Scoring formula, data limits, sources, and AI-assistance credit.' },
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
