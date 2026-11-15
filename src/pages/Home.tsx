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

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function Chapter({ n, title, children, delay = 0 }: { n: string; title: string; children: ReactNode; delay?: number }) {
  return (
    <motion.section {...fade} transition={{ duration: 0.4, delay }} className="story-chapter relative pl-10 sm:pl-12">
      <span className="story-node absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full border border-flame-500/50 bg-space-950 font-mono text-[11px] text-flame-300" aria-hidden>
        {n}
      </span>
      <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </motion.section>
  );
}

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
  const score = Math.round(result.p * 100);
  const gShort = GRAVITY[x.gravity].label.split(' ')[0];
  const barFill =
    result.verdict === 'Likely' ? 'bg-flame-500' : result.verdict === 'Borderline' ? 'bg-amber-400' : 'bg-cyan-400';

  return (
    <div className="workspace-shell">
      <motion.header {...fade} transition={{ duration: 0.35 }} className="mb-8 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-flame-400">Flame in Freefall · Space Apps 2026</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">A fire-safety story for your cabin</h1>
        <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
          One workspace, read top to bottom: set the cabin, watch the flame answer, then see which NASA tests matter and what they found.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-mono text-xs text-slate-400">
          <span><span className="text-white">{stats.investigations}</span> studies</span>
          <span><span className="text-white">{stats.testsTotal.toLocaleString()}</span> tests</span>
          <span><span className="text-white">{stats.totalTB} TB</span> in PSI</span>
          <Link to="/about" className="text-micro-300 hover:text-white">Sources →</Link>
        </div>
      </motion.header>

      <div className="grid gap-8 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-start">
        {/* Sticky cabin rail — the workspace control surface */}
        <motion.aside
          {...fade}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="workspace-rail lg:sticky lg:top-4"
          aria-label="Cabin settings"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Cabin</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Live</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2" aria-label="Cabin status">
            {[
              { k: 'O₂', v: `${Math.round(x.o2 * 100)}%` },
              { k: 'P', v: `${x.psi.toFixed(1)} psi` },
              { k: 'Flow', v: `${x.flow} cm/s` },
              { k: 'g', v: gShort },
            ].map(cell => (
              <div key={cell.k} className="border-b border-white/10 pb-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{cell.k}</p>
                <p className="font-mono text-base text-white">{cell.v}</p>
              </div>
            ))}
          </div>

          <p className="mb-2 text-xs text-slate-500">Mission preset</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickMission(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition ${mission === s.id ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                <ScenarioIcon id={s.id} className="h-3.5 w-3.5" />
                {s.short}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-xs text-slate-300">
              Fuel
              <select value={x.fuel} onChange={e => set('fuel', e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-space-950 px-2 py-1.5 text-sm text-white">
                <option value="any">Any fuel</option>
                {fuelOptions.map(f => <option key={f.fuel} value={f.fuel}>{f.fuel}</option>)}
              </select>
            </label>
            <Slider label="Oxygen" value={x.o2} min={0.1} max={1} step={0.01} onChange={v => set('o2', v)} format={v => `${Math.round(v * 100)}%`} />
            <Slider label="Pressure" value={x.psi} min={2} max={45} step={0.1} onChange={v => set('psi', v)} format={v => `${v.toFixed(1)} psi`} />
            <Slider label="Airflow" value={x.flow} min={0} max={50} step={1} onChange={v => set('flow', v)} format={v => `${v} cm/s`} />
          </div>

          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500">Gravity</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(GRAVITY) as Gravity[]).map(g => (
                <button key={g} type="button" onClick={() => set('gravity', g)} aria-pressed={x.gravity === g} className={`rounded-md px-2.5 py-1 text-xs ${x.gravity === g ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300'}`}>
                  {GRAVITY[g].label.split(' ')[0]}
                </button>
              ))}
            </div>
            <p className="pt-1 text-xs text-slate-500">Extra gas</p>
            <div className="flex flex-wrap gap-1.5">
              {(['none', 'CO2', 'He'] as Diluent[]).map(d => (
                <button key={d} type="button" onClick={() => set('diluent', d)} aria-pressed={x.diluent === d} className={`rounded-md px-2.5 py-1 text-xs ${x.diluent === d ? 'bg-flame-500/30 text-white' : 'bg-white/5 text-slate-300'}`}>
                  {d === 'none' ? 'None' : d === 'CO2' ? 'CO₂' : 'Helium'}
                </button>
              ))}
            </div>
          </div>

          {x.gravity !== 'earth' && (
            <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-400">
              In freefall, hot gas does not rise — flames turn round and quiet, and oxygen reaches them by mixing, not by a rising plume.
            </p>
          )}
        </motion.aside>

        {/* Story column — sequential chapters, not a card grid */}
        <div className="story-spine space-y-10 sm:space-y-12">
          <Chapter n="01" title="Will it burn?" delay={0.08}>
            <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:items-center">
              <div className="relative overflow-hidden rounded-full border border-white/10">
                <div className="grid-bg absolute inset-0 opacity-40" />
                <Flame {...flame} className="relative h-48 w-full md:h-52" label="Flame preview for current cabin" />
              </div>
              <div>
                <p className={`text-3xl font-semibold tracking-tight ${verdictTone}`}>{result.verdict} to burn</p>
                <div className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className={`h-full rounded-full transition-all ${barFill}`} style={{ width: `${score}%` }} />
                </div>
                <p className="mt-1.5 font-mono text-sm text-slate-400">{score} / 100 · {result.confidenceLabel} confidence</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">{summary}</p>
                <ul className="mt-4 space-y-2 border-t border-white/10 pt-3">
                  {result.neighbors.slice(0, 3).map((n, i) => (
                    <li key={n.t.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link to={`/explorer/${n.t.inv}`} className="truncate text-slate-300 hover:text-white">{i + 1}. {invLabel(n.t.inv)}</Link>
                      <Pill tone={n.t.burn >= 0.8 ? 'red' : n.t.burn >= 0.5 ? 'amber' : 'micro'}>{n.t.outcome || '—'}</Pill>
                    </li>
                  ))}
                </ul>
                <Link to="/simulator" className="mt-3 inline-block text-sm text-micro-300 hover:text-white">Open full burn tool →</Link>
              </div>
            </div>
          </Chapter>

          <Chapter n="02" title="Which NASA tests matter most" delay={0.12}>
            <ol className="divide-y divide-white/10 border-y border-white/10">
              {ranked.map((r, i) => (
                <li key={r.inv.accession}>
                  <Link to={`/explorer/${r.inv.accession}`} className="flex items-center gap-3 py-3 transition hover:bg-white/[0.03]">
                    <span className="w-6 font-mono text-sm text-slate-500">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{r.inv.hasAcronym ? r.inv.acronym : r.inv.accession}</span>
                      <span className="block truncate text-xs text-slate-400">{r.inv.roleGroup}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-white/10 sm:block" aria-hidden>
                        <span className="block h-full rounded-full bg-flame-500/80" style={{ width: `${Math.min(100, Math.round(r.score))}%` }} />
                      </span>
                      <span className="font-mono text-sm text-flame-300">{Math.round(r.score)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link to={`/scenarios?s=${mission}`} className="mt-3 inline-block text-sm text-micro-300 hover:text-white">See full ranking →</Link>
          </Chapter>

          <Chapter n="03" title="What those tests found" delay={0.16}>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Best matching study for your settings</p>
            <p className="mt-1 text-xl font-semibold leading-snug text-white sm:text-2xl">{brief.headline}</p>
            <ul className="mt-4 space-y-2.5">
              {brief.points.slice(0, 3).map(p => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-flame-400" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-l-2 border-cyan-400/70 pl-3 text-sm text-cyan-100/90 sm:text-base">{brief.action}</p>
            <Link to="/insights" className="mt-3 inline-block text-sm text-micro-300 hover:text-white">Open insight charts →</Link>
          </Chapter>

          <motion.section {...fade} transition={{ duration: 0.4, delay: 0.2 }} aria-label="Workspace tools" className="border-t border-white/10 pt-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Continue in the workspace</h2>
            <p className="mb-4 text-sm text-slate-500">Same cabin settings carry into every tool.</p>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {TOOLS.map(t => (
                <Link key={t.to} to={t.to} className="group flex items-baseline justify-between gap-3 border-b border-white/10 py-2.5 transition hover:border-white/25">
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
      </div>
    </div>
  );
}
