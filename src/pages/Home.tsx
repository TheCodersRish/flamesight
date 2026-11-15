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
import { CLASSIC_UI_VARIATION, OVERHAUL_UI_VARIATION, useUiVariation } from '../lib/uiVariation';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const TOOLS = [
  { to: '/simulator', label: 'Full burn test', hint: 'More detail on the same question' },
  { to: '/analyst', label: 'Ask a question', hint: 'Get a plain-language NASA answer' },
  { to: '/insights', label: 'What NASA found', hint: 'Charts without the jargon' },
  { to: '/explorer', label: 'Browse all tests', hint: `${stats.investigations} studies in one list` },
];

const fade = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

function Chapter({ n, title, children, delay = 0 }: { n: string; title: string; children: ReactNode; delay?: number }) {
  return (
    <motion.section {...fade} transition={{ duration: 0.45, delay }} className="story-chapter relative pl-10 sm:pl-12">
      <span className="story-node absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full border border-flame-500/55 bg-space-950 font-mono text-[11px] text-flame-300" aria-hidden>
        {n}
      </span>
      <h2 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </motion.section>
  );
}

function plainVerdict(verdict: string): { title: string; tone: string; bar: string } {
  if (verdict === 'Likely') return { title: 'Fire looks likely', tone: 'text-flame-300', bar: 'bg-gradient-to-r from-flame-500 to-ember-400' };
  if (verdict === 'Borderline') return { title: 'Could go either way', tone: 'text-amber-200', bar: 'bg-gradient-to-r from-amber-400 to-flame-400' };
  return { title: 'Fire looks unlikely', tone: 'text-cyan-200', bar: 'bg-gradient-to-r from-cyan-400 to-micro-400' };
}

export default function Home() {
  const { input: x, result, setInput: setX } = useBurn();
  const { id: uiId, revert, setId, isOverhaul } = useUiVariation();
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
    <div className="workspace-shell">
      <motion.header {...fade} transition={{ duration: 0.4 }} className="relative mb-10 overflow-hidden rounded-[1.75rem] border border-white/10 px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-16 -top-24 h-64 w-64 animate-ember-pulse rounded-full bg-flame-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-micro-500/15 blur-3xl" />
          <div className="grid-bg absolute inset-0 opacity-30" />
        </div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-medium tracking-wide text-flame-300">FlameSight</p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Would a fire start{' '}
              <span className="bg-gradient-to-r from-flame-300 via-ember-400 to-micro-300 bg-clip-text text-transparent">
                in this cabin?
              </span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Pick a place in space, tweak a few dials, and read the answer top to bottom — NASA combustion data, no science background needed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (isOverhaul ? revert() : setId(OVERHAUL_UI_VARIATION))}
              className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:border-flame-400/40 hover:bg-flame-500/10 hover:text-white"
              title={isOverhaul ? 'Switch back to the classic FlameSight look' : 'Restore the Ember Forge design'}
            >
              {isOverhaul ? 'Revert design' : uiId === CLASSIC_UI_VARIATION ? 'Restore new design' : 'Revert design'}
            </button>
            <Link
              to="/ui-variations"
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:text-white"
            >
              More looks
            </Link>
          </div>
        </div>
      </motion.header>

      <div className="grid gap-8 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:items-start">
        <motion.aside
          {...fade}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="workspace-rail lg:sticky lg:top-4"
          aria-label="Cabin settings"
        >
          <h2 className="mb-3 font-display text-sm font-bold text-white">1. Set the cabin</h2>

          <p className="mb-2 text-xs text-slate-400">Where are you?</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickMission(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${mission === s.id ? 'bg-gradient-to-r from-flame-500/30 to-white/10 text-white ring-1 ring-flame-400/40' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                <ScenarioIcon id={s.id} className="h-3.5 w-3.5" />
                {s.short}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-xs text-slate-300">
              What is burning?
              <select value={x.fuel} onChange={e => set('fuel', e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-space-950 px-2.5 py-2 text-sm text-white">
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
                <button key={g} type="button" onClick={() => set('gravity', g)} aria-pressed={x.gravity === g} className={`rounded-lg px-2.5 py-1 text-xs ${x.gravity === g ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-white/5 text-slate-300'}`}>
                  {g === 'earth' ? 'Earth' : g === 'micro' ? 'Space (freefall)' : g === 'moon' ? 'Moon' : 'Mars'}
                </button>
              ))}
            </div>
            <p className="pt-1 text-xs text-slate-400">Extra gas to help put a fire out</p>
            <div className="flex flex-wrap gap-1.5">
              {(['none', 'CO2', 'He'] as Diluent[]).map(d => (
                <button key={d} type="button" onClick={() => set('diluent', d)} aria-pressed={x.diluent === d} className={`rounded-lg px-2.5 py-1 text-xs ${x.diluent === d ? 'bg-flame-500/35 text-white ring-1 ring-flame-400/40' : 'bg-white/5 text-slate-300'}`}>
                  {d === 'none' ? 'None' : d === 'CO2' ? 'CO₂' : 'Helium'}
                </button>
              ))}
            </div>
          </div>
        </motion.aside>

        <div className="story-spine space-y-10 sm:space-y-12">
          <Chapter n="2" title="The quick answer" delay={0.08}>
            <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:items-center">
              <motion.div
                className="relative overflow-hidden rounded-2xl border border-flame-500/20 shadow-soft"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="grid-bg absolute inset-0 opacity-40" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-space-950/80 via-transparent to-transparent" />
                <Flame {...flame} className="relative h-48 w-full md:h-52" label="Flame preview for current cabin" />
              </motion.div>
              <div>
                <p className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${verdict.tone}`}>{verdict.title}</p>
                <div className="mt-4 h-2.5 max-w-xs overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <motion.div
                    className={`h-full rounded-full ${verdict.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-400">Confidence score: {score} out of 100</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">{summary}</p>
                <Link to="/simulator" className="mt-4 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-flame-500 to-ember-500 px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:brightness-110">
                  See the full burn test →
                </Link>
              </div>
            </div>
          </Chapter>

          <Chapter n="3" title="Which NASA tests matter most" delay={0.12}>
            <p className="mb-3 text-sm text-slate-400">These studies best match the cabin you set.</p>
            <ol className="overflow-hidden rounded-2xl border border-white/10 divide-y divide-white/10">
              {ranked.map((r, i) => (
                <li key={r.inv.accession}>
                  <Link to={`/explorer/${r.inv.accession}`} className="flex items-center gap-3 px-3 py-3.5 transition hover:bg-white/[0.04]">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 font-mono text-xs text-flame-300">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{r.inv.hasAcronym ? r.inv.acronym : r.inv.accession}</span>
                      <span className="block truncate text-xs text-slate-400">{r.inv.roleGroup}</span>
                    </span>
                    <Pill tone="micro">match {Math.round(r.score)}</Pill>
                  </Link>
                </li>
              ))}
            </ol>
          </Chapter>

          <Chapter n="4" title="What those tests found" delay={0.16}>
            <p className="font-display text-xl font-bold leading-snug text-white sm:text-2xl">{brief.headline}</p>
            <ul className="mt-4 space-y-2.5">
              {brief.points.slice(0, 3).map(p => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flame-400 shadow-[0_0_8px_rgba(255,122,26,0.7)]" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl border border-cyan-400/25 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100/95 sm:text-base">{brief.action}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link to="/insights" className="text-micro-300 transition hover:text-white">Open simple insight charts →</Link>
              <Link to="/analyst" className="text-micro-300 transition hover:text-white">Ask a follow-up question →</Link>
            </div>
          </Chapter>

          <motion.section {...fade} transition={{ duration: 0.45, delay: 0.2 }} aria-label="Next steps" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h2 className="mb-1 font-display text-sm font-bold text-slate-200">Want to go deeper?</h2>
            <p className="mb-4 text-sm text-slate-500">Your cabin settings carry into every tool.</p>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {TOOLS.map(t => (
                <Link key={t.to} to={t.to} className="group flex items-baseline justify-between gap-3 border-b border-white/10 py-3 transition hover:border-flame-400/35">
                  <span>
                    <span className="block text-sm font-semibold text-white group-hover:text-flame-300">{t.label}</span>
                    <span className="text-xs text-slate-500">{t.hint}</span>
                  </span>
                  <span className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-flame-300">→</span>
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
