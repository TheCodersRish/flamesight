import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Flame from '../components/Flame';
import ScenarioIcon from '../components/ScenarioIcon';
import { Pill, Slider } from '../components/ui';
import { insightFocus, useBurn } from '../lib/burnSession';
import { fuelOptions, invLabel, stats } from '../lib/data';
import { briefFor } from '../lib/insightBrief';
import { type Diluent } from '../lib/knn';
import { plainBurn, plainInsight } from '../lib/plainEnglish';
import { GRAVITY, SCENARIOS, scenarioById } from '../lib/scenarios';
import { rankForScenario } from '../lib/scoring';
import type { Gravity } from '../lib/types';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const TOOLS = [
  { to: '/simulator', label: 'Will it burn?', hint: 'Full flame test with nearest NASA cases' },
  { to: '/scenarios', label: 'Rank risks', hint: 'Score every study for a mission' },
  { to: '/insights', label: 'What NASA found', hint: 'Charts from FLEX, BASS, SAFFIRE & more' },
  { to: '/fluid-physics', label: 'How flames work', hint: 'Why fire looks different without gravity' },
  { to: '/explorer', label: 'Browse tests', hint: `All ${stats.investigations} investigations` },
  { to: '/analyst', label: 'Ask a question', hint: 'SI answers grounded in NASA notes' },
];

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function Home() {
  const { input: x, result, setInput: setX } = useBurn();
  const set = <K extends keyof typeof x>(k: K, v: (typeof x)[K]) => setX({ ...x, [k]: v });
  const [mission, setMission] = useState('iss');

  const ranked = useMemo(() => {
    const sc = { ...scenarioById(mission), o2: x.o2, psi: x.psi, flow: x.flow, gravity: x.gravity };
    return rankForScenario(sc).slice(0, 5);
  }, [mission, x.o2, x.psi, x.flow, x.gravity]);

  const focus = insightFocus(x);
  const brief = plainInsight(briefFor(focus.id, x, result));
  const summary = plainBurn(x, result);

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

  const verdictTone =
    result.verdict === 'Likely' ? 'text-flame-300' : result.verdict === 'Borderline' ? 'text-amber-200' : 'text-cyan-200';
  const verdictBar =
    result.verdict === 'Likely' ? 'border-l-flame-500' : result.verdict === 'Borderline' ? 'border-l-amber-400' : 'border-l-cyan-400';
  const score = Math.round(result.p * 100);
  const gShort = GRAVITY[x.gravity].label.split(' ')[0];

  return (
    <div className="space-y-6">
      <motion.header {...fade} transition={{ duration: 0.35 }} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-flame-400">Flame in Freefall · Space Apps 2026</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Fire safety at a glance</h1>
            <p className="mt-2 max-w-2xl text-base text-slate-300 sm:text-lg">
              Set the cabin once. See if it burns, which NASA tests matter most, and what those tests found — on one screen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-400">
            <span><span className="text-white">{stats.investigations}</span> studies</span>
            <span><span className="text-white">{stats.testsTotal.toLocaleString()}</span> tests</span>
            <span><span className="text-white">{stats.totalTB} TB</span> in PSI</span>
            <Link to="/about" className="text-micro-300 hover:text-white">Sources →</Link>
          </div>
        </div>

        {/* Always-visible status rail — synoptic, no navigation needed */}
        <div className="grid gap-2 sm:grid-cols-4" aria-label="Cabin status">
          {[
            { k: 'Oxygen', v: `${Math.round(x.o2 * 100)}%` },
            { k: 'Pressure', v: `${x.psi.toFixed(1)} psi` },
            { k: 'Airflow', v: `${x.flow} cm/s` },
            { k: 'Gravity', v: gShort },
          ].map(cell => (
            <div key={cell.k} className="rounded-xl border border-white/10 bg-space-900/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{cell.k}</p>
              <p className="font-mono text-lg text-white">{cell.v}</p>
            </div>
          ))}
        </div>
      </motion.header>

      <motion.section
        {...fade}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-white/10 bg-space-900/55 p-4 sm:p-5"
        aria-label="Cabin settings"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Your cabin</h2>
          <p className="text-xs text-slate-500">Pick a mission, then fine-tune. Changes update the answers below.</p>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickMission(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${mission === s.id ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              <ScenarioIcon id={s.id} className="h-4 w-4" />
              {s.short}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-slate-300">
            Fuel
            <select value={x.fuel} onChange={e => set('fuel', e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-space-950 px-2 py-1.5 text-sm text-white">
              <option value="any">Any fuel</option>
              {fuelOptions.map(f => <option key={f.fuel} value={f.fuel}>{f.fuel}</option>)}
            </select>
          </label>
          <Slider label="Oxygen" value={x.o2} min={0.1} max={1} step={0.01} onChange={v => set('o2', v)} format={v => `${Math.round(v * 100)}%`} />
          <Slider label="Pressure" value={x.psi} min={2} max={45} step={0.1} onChange={v => set('psi', v)} format={v => `${v.toFixed(1)} psi`} />
          <Slider label="Airflow" value={x.flow} min={0} max={50} step={1} onChange={v => set('flow', v)} format={v => `${v} cm/s`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="mr-1 self-center text-xs text-slate-500">Gravity</span>
          {(Object.keys(GRAVITY) as Gravity[]).map(g => (
            <button key={g} type="button" onClick={() => set('gravity', g)} aria-pressed={x.gravity === g} className={`rounded-lg px-2.5 py-1 text-xs ${x.gravity === g ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300'}`}>
              {GRAVITY[g].label.split(' ')[0]}
            </button>
          ))}
          <span className="mx-1 self-center text-xs text-slate-500">Extra gas</span>
          {(['none', 'CO2', 'He'] as Diluent[]).map(d => (
            <button key={d} type="button" onClick={() => set('diluent', d)} aria-pressed={x.diluent === d} className={`rounded-lg px-2.5 py-1 text-xs ${x.diluent === d ? 'bg-flame-500/30 text-white' : 'bg-white/5 text-slate-300'}`}>
              {d === 'none' ? 'None' : d === 'CO2' ? 'CO₂' : 'Helium'}
            </button>
          ))}
        </div>
        {x.gravity !== 'earth' && (
          <p className="mt-3 border-t border-white/5 pt-3 text-xs leading-relaxed text-slate-400">
            In freefall, hot gas does not rise — flames turn round and quiet, and oxygen reaches them by mixing, not by a rising plume. That is why Moon and Mars cabins need NASA’s microgravity fire tests, not Earth intuition alone.
          </p>
        )}
      </motion.section>

      {/* Challenge triad: summarize · rank · explain */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="Key answers">
        <motion.div {...fade} transition={{ duration: 0.4, delay: 0.1 }} className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 border-l-4 bg-space-900/55 ${verdictBar}`}>
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">Will it burn?</h2>
            <Link to="/simulator" className="text-xs text-micro-300 hover:text-white">Full tool →</Link>
          </div>
          <div className="relative">
            <div className="grid-bg absolute inset-0 opacity-40" />
            <Flame {...flame} className="relative h-44 w-full" label="Flame preview for current cabin" />
          </div>
          <div className="flex flex-1 flex-col px-4 py-3">
            <p className={`text-2xl font-semibold ${verdictTone}`}>{result.verdict} to burn</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div
                className={`h-full rounded-full transition-all ${result.verdict === 'Likely' ? 'bg-flame-500' : result.verdict === 'Borderline' ? 'bg-amber-400' : 'bg-cyan-400'}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-sm text-slate-400">{score} / 100 · {result.confidenceLabel} confidence</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-200">{summary}</p>
            <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
              {result.neighbors.slice(0, 3).map((n, i) => (
                <li key={n.t.id} className="flex items-center justify-between gap-2 text-xs">
                  <Link to={`/explorer/${n.t.inv}`} className="truncate text-slate-300 hover:text-white">{i + 1}. {invLabel(n.t.inv)}</Link>
                  <Pill tone={n.t.burn >= 0.8 ? 'red' : n.t.burn >= 0.5 ? 'amber' : 'micro'}>{n.t.outcome || '—'}</Pill>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <motion.div {...fade} transition={{ duration: 0.4, delay: 0.15 }} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 border-l-4 border-l-micro-500 bg-space-900/55">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">Top risks for this cabin</h2>
            <Link to={`/scenarios?s=${mission}`} className="text-xs text-micro-300 hover:text-white">Full ranking →</Link>
          </div>
          <ol className="flex flex-1 flex-col divide-y divide-white/5">
            {ranked.map((r, i) => (
              <li key={r.inv.accession}>
                <Link to={`/explorer/${r.inv.accession}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                  <span className="font-mono text-sm text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{r.inv.hasAcronym ? r.inv.acronym : r.inv.accession}</span>
                    <span className="block truncate text-xs text-slate-400">{r.inv.roleGroup}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-white/10 sm:block" aria-hidden>
                      <span className="block h-full rounded-full bg-flame-500/80" style={{ width: `${Math.min(100, Math.round(r.score))}%` }} />
                    </span>
                    <span className="font-mono text-sm text-flame-300">{Math.round(r.score)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </motion.div>

        <motion.div {...fade} transition={{ duration: 0.4, delay: 0.2 }} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 border-l-4 border-l-cyan-400/80 bg-space-900/55">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">What NASA found</h2>
            <Link to="/insights" className="text-xs text-micro-300 hover:text-white">See charts →</Link>
          </div>
          <div className="flex flex-1 flex-col px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Best matching study for your settings</p>
            <p className="mt-1 text-lg font-semibold leading-snug text-white">{brief.headline}</p>
            <ul className="mt-3 flex-1 space-y-2">
              {brief.points.slice(0, 3).map(p => (
                <li key={p} className="text-sm leading-relaxed text-slate-300 before:mr-2 before:text-flame-400 before:content-['·']">{p}</li>
              ))}
            </ul>
            <p className="mt-3 border-t border-white/5 pt-3 text-sm text-cyan-100/90">{brief.action}</p>
          </div>
        </motion.div>
      </section>

      <motion.section {...fade} transition={{ duration: 0.4, delay: 0.25 }} aria-label="More tools">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Everything else</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(t => (
            <Link key={t.to} to={t.to} className="group flex items-baseline justify-between gap-3 rounded-xl border border-white/10 bg-space-900/40 px-4 py-3 transition hover:border-white/20 hover:bg-white/5">
              <span>
                <span className="block text-sm font-medium text-white group-hover:text-micro-300">{t.label}</span>
                <span className="text-xs text-slate-500">{t.hint}</span>
              </span>
              <span className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
            </Link>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
