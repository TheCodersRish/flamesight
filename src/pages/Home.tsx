import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Flame from '../components/Flame';
import ScenarioIcon from '../components/ScenarioIcon';
import { Pill, Slider } from '../components/ui';
import { insightFocus, useBurn } from '../lib/burnSession';
import { fuelOptions, invLabel, stats } from '../lib/data';
import { briefFor } from '../lib/insightBrief';
import { type Diluent } from '../lib/knn';
import { fadeUp, snap } from '../lib/motion';
import { plainBurn, plainInsight } from '../lib/plainEnglish';
import { GRAVITY, SCENARIOS, scenarioById } from '../lib/scenarios';
import { rankForScenario } from '../lib/scoring';
import type { Gravity } from '../lib/types';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const TOOLS = [
  { to: '/simulator', label: 'Full burn test', hint: 'More detail on the same question' },
  { to: '/analyst', label: 'Ask a question', hint: 'Get a plain-language NASA answer' },
  { to: '/insights', label: 'What NASA found', hint: 'Charts without the jargon' },
  { to: '/explorer', label: 'Browse all tests', hint: `${stats.investigations} studies in one list` },
];

function Chapter({ n, title, children, delay = 0 }: { n: string; title: string; children: ReactNode; delay?: number }) {
  return (
    <motion.section {...fadeUp} transition={{ ...snap, delay }} className="story-chapter relative pl-10 sm:pl-12">
      <span className="story-node absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full border border-flame-500/50 bg-space-950 font-mono text-[11px] text-flame-300" aria-hidden>
        {n}
      </span>
      <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </motion.section>
  );
}

function plainVerdict(verdict: string): { title: string; tone: string; bar: string } {
  if (verdict === 'Likely') return { title: 'Fire looks likely', tone: 'text-flame-300', bar: 'bg-flame-500' };
  if (verdict === 'Borderline') return { title: 'Could go either way', tone: 'text-amber-200', bar: 'bg-amber-400' };
  return { title: 'Fire looks unlikely', tone: 'text-cyan-200', bar: 'bg-cyan-400' };
}

export default function Home() {
  const { input: x, result, setInput: setX } = useBurn();
  const set = <K extends keyof typeof x>(k: K, v: (typeof x)[K]) => setX({ ...x, [k]: v });
  const [mission, setMission] = useState('iss');

  const ranked = useMemo(() => {
    const sc = { ...scenarioById(mission), o2: x.o2, psi: x.psi, flow: x.flow, gravity: x.gravity };
    return rankForScenario(sc).slice(0, 3);
  }, [mission, x.o2, x.psi, x.flow, x.gravity]);

  const focus = insightFocus(x);
  const brief = plainInsight(briefFor(focus.id, x, result));
  const summary = plainBurn(x, result);
  const verdict = plainVerdict(result.verdict);

  const flame = {
    gravity: GRAVITY[x.gravity].flame,
    o2: clamp(((x.o2 - 0.12) / 0.55) * (0.45 + 0.55 * result.p)),
    flow: clamp(x.flow / 60),
    dilution: x.diluent === 'none' ? 0 : x.diluent === 'CO2' ? 0.65 : 0.5,
  };

  const pickMission = (id: string) => {
    const s = scenarioById(id);
    setMission(id);
    setX({ ...x, o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity });
  };

  const score = Math.round(result.p * 100);

  return (
    <div className="workspace-shell flex min-h-0 flex-1 flex-col lg:overflow-hidden">
      <motion.header {...fadeUp} transition={snap} className="mb-4 shrink-0 space-y-2 sm:mb-6">
        <p className="text-sm text-flame-300">Dashboard · NASA fire data, in plain words</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Would a fire start in this cabin?</h1>
        <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
          Pick a place in space, tweak a few dials, and read the answer top to bottom — no science background needed.
        </p>
      </motion.header>

      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:gap-8 lg:overflow-hidden">
        <motion.aside
          {...fadeUp}
          transition={{ ...snap, delay: 0.03 }}
          className="workspace-rail scrollbar-thin lg:min-h-0 lg:overflow-y-auto"
          aria-label="Cabin settings"
        >
          <h2 className="mb-3 text-sm font-semibold text-white">1. Set the cabin</h2>

          <p className="mb-2 text-xs text-slate-400">Where are you?</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickMission(s.id)}
                className={`tap inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${mission === s.id ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                <ScenarioIcon id={s.id} className="h-3.5 w-3.5" />
                {s.short}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-xs text-slate-300">
              What is burning?
              <select value={x.fuel} onChange={e => set('fuel', e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-space-950 px-2 py-1.5 text-sm text-white">
                <option value="any">Not sure / any fuel</option>
                {fuelOptions.map(f => <option key={f.fuel} value={f.fuel}>{f.fuel}</option>)}
              </select>
            </label>
            <Slider label="Oxygen in the air" value={x.o2} min={0.1} max={1} step={0.01} onChange={v => set('o2', v)} format={v => `${Math.round(v * 100)}%`} />
            <Slider label="Air pressure" value={x.psi} min={2} max={45} step={0.1} onChange={v => set('psi', v)} format={v => `${v.toFixed(1)} psi`} />
            <Slider label="Air moving past the flame" value={x.flow} min={0} max={50} step={1} onChange={v => set('flow', v)} format={v => `${v} cm/s`} />
          </div>

          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-400">Gravity</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(GRAVITY) as Gravity[]).map(g => (
                <button key={g} type="button" onClick={() => set('gravity', g)} aria-pressed={x.gravity === g} className={`rounded-md px-2.5 py-1 text-xs ${x.gravity === g ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300'}`}>
                  {g === 'earth' ? 'Earth' : g === 'micro' ? 'Space (freefall)' : g === 'moon' ? 'Moon' : 'Mars'}
                </button>
              ))}
            </div>
            <p className="pt-1 text-xs text-slate-400">Extra gas to help put a fire out</p>
            <div className="flex flex-wrap gap-1.5">
              {(['none', 'CO2', 'He'] as Diluent[]).map(d => (
                <button key={d} type="button" onClick={() => set('diluent', d)} aria-pressed={x.diluent === d} className={`rounded-md px-2.5 py-1 text-xs ${x.diluent === d ? 'bg-flame-500/30 text-white' : 'bg-white/5 text-slate-300'}`}>
                  {d === 'none' ? 'None' : d === 'CO2' ? 'CO₂' : 'Helium'}
                </button>
              ))}
            </div>
          </div>
        </motion.aside>

        <div className="story-spine scrollbar-thin space-y-10 sm:space-y-12 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <Chapter n="2" title="The quick answer" delay={0.04}>
            <div className="grid gap-5 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] md:items-center">
              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                <div className="grid-bg absolute inset-0 opacity-40" />
                <Flame {...flame} className="relative h-44 w-full md:h-48" label="Flame preview for current cabin" />
              </div>
              <div>
                <p className={`text-3xl font-semibold tracking-tight ${verdict.tone}`}>{verdict.title}</p>
                <div className="mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className={`h-full rounded-full transition-[width] duration-150 ease-out ${verdict.bar}`} style={{ width: `${score}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-slate-400">Burn score {score} out of 100 · based on {result.nTests} tests · band {Math.round(result.band[0] * 100)}–{Math.round(result.band[1] * 100)} · {result.confidenceLabel} confidence</p>
                {result.beyondTested && <p className="mt-1 text-xs text-amber-300">Warning: these settings go beyond what NASA tested.</p>}
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">{summary}</p>
                <Link to="/simulator" className="mt-3 inline-block text-sm text-micro-300 hover:text-white">See the full burn test →</Link>
              </div>
            </div>
          </Chapter>

          <Chapter n="3" title="Which NASA tests matter most" delay={0.06}>
            <p className="mb-3 text-sm text-slate-400">These studies best match the cabin you set.</p>
            <ol className="divide-y divide-white/10 border-y border-white/10">
              {ranked.map((r, i) => (
                <li key={r.inv.accession}>
                  <Link to={`/explorer/${r.inv.accession}`} className="flex items-center gap-3 py-3 hover:bg-white/[0.03]">
                    <span className="w-6 text-sm text-slate-500">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{r.inv.hasAcronym ? r.inv.acronym : r.inv.accession}</span>
                      <span className="block truncate text-xs text-slate-400">{r.inv.roleGroup}</span>
                    </span>
                    <Pill tone="micro">match {Math.round(r.score)}</Pill>
                  </Link>
                </li>
              ))}
            </ol>
          </Chapter>

          <Chapter n="4" title="What those tests found" delay={0.08}>
            <p className="text-xl font-semibold leading-snug text-white sm:text-2xl">{brief.headline}</p>
            <ul className="mt-4 space-y-2.5">
              {brief.points.slice(0, 3).map(p => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flame-400" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-l-2 border-cyan-400/70 pl-3 text-sm text-cyan-100/90 sm:text-base">{brief.action}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link to="/insights" className="text-micro-300 hover:text-white">Open simple insight charts →</Link>
              <Link to="/analyst" className="text-micro-300 hover:text-white">Ask a follow-up question →</Link>
            </div>
          </Chapter>

          <motion.section {...fadeUp} transition={{ ...snap, delay: 0.1 }} aria-label="Next steps" className="border-t border-white/10 pt-6">
            <h2 className="mb-1 text-sm font-semibold text-slate-300">Want to go deeper?</h2>
            <p className="mb-4 text-sm text-slate-500">Your cabin settings carry into every tool.</p>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {TOOLS.map(t => (
                <Link key={t.to} to={t.to} className="group flex items-baseline justify-between gap-3 border-b border-white/10 py-2.5 hover:border-white/25">
                  <span>
                    <span className="block text-sm font-medium text-white group-hover:text-micro-300">{t.label}</span>
                    <span className="text-xs text-slate-500">{t.hint}</span>
                  </span>
                  <span className="text-slate-500 group-hover:translate-x-1 group-hover:text-white">→</span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Closest NASA cases used above:{' '}
              {result.neighbors.slice(0, 2).map(n => invLabel(n.t.inv)).join(' · ') || 'none yet'}
            </p>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
