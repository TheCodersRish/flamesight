import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  { to: '/simulator', label: 'Will it burn?', hint: 'Full flame test' },
  { to: '/scenarios', label: 'Rank risks', hint: 'Mission match scores' },
  { to: '/insights', label: 'What NASA found', hint: 'Charts from the tests' },
  { to: '/fluid-physics', label: 'How flames work', hint: 'Why space fire looks different' },
  { to: '/explorer', label: 'Browse tests', hint: 'All 24 investigations' },
  { to: '/analyst', label: 'Ask a question', hint: 'Fire safety Q&A' },
];

export default function Home() {
  const { input: x, result, setInput: setX } = useBurn();
  const set = <K extends keyof typeof x>(k: K, v: (typeof x)[K]) => setX({ ...x, [k]: v });
  const [mission, setMission] = useState('iss');

  const ranked = useMemo(() => {
    const sc = {
      ...scenarioById(mission),
      o2: x.o2,
      psi: x.psi,
      flow: x.flow,
      gravity: x.gravity,
    };
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

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-flame-400">FlameSight</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Fire safety dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-300">Set the cabin once. See if it burns, which NASA tests matter, and what those tests found — all here.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-400">
          <span><span className="font-mono text-white">{stats.investigations}</span> NASA studies</span>
          <span><span className="font-mono text-white">{stats.testsTotal.toLocaleString()}</span> tests</span>
          <span><span className="font-mono text-white">{stats.totalTB} TB</span> data</span>
          <Link to="/about" className="text-micro-300 hover:text-white">About →</Link>
        </div>
      </header>

      {/* One place to set the cabin */}
      <section className="rounded-2xl border border-white/10 bg-space-900/60 p-4 sm:p-5" aria-label="Cabin settings">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Your cabin</h2>
          <p className="font-mono text-sm text-white">
            {Math.round(x.o2 * 100)}% oxygen · {x.psi.toFixed(1)} psi · {x.flow} cm/s · {GRAVITY[x.gravity].label.split(' ')[0]}
          </p>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickMission(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${mission === s.id ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              <ScenarioIcon id={s.id} className="h-4 w-4" />
              {s.short}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-slate-300">
            Fuel
            <select value={x.fuel} onChange={e => set('fuel', e.target.value)} className="mt-1 w-full rounded border border-white/10 bg-space-950 px-2 py-1.5 text-sm text-white">
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
      </section>

      {/* Three answers in one view */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="Key answers">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-900/60">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">Will it burn?</h2>
            <Link to="/simulator" className="text-xs text-micro-300 hover:text-white">Open full tool →</Link>
          </div>
          <Flame {...flame} className="h-40 w-full" label="Flame preview for current cabin" />
          <div className="flex flex-1 flex-col px-4 py-3">
            <p className={`text-2xl font-semibold ${verdictTone}`}>{result.verdict} to burn</p>
            <p className="mt-0.5 text-sm text-slate-400">{Math.round(result.p * 100)} / 100 · {result.confidenceLabel} confidence</p>
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
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-900/60">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">Top risks for this cabin</h2>
            <Link to={`/scenarios?s=${mission}`} className="text-xs text-micro-300 hover:text-white">Full ranking →</Link>
          </div>
          <ol className="flex flex-1 flex-col divide-y divide-white/5">
            {ranked.map((r, i) => (
              <li key={r.inv.accession}>
                <Link to={`/explorer/${r.inv.accession}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                  <span className="font-mono text-sm text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{r.inv.hasAcronym ? r.inv.acronym : r.inv.accession}</span>
                    <span className="block truncate text-xs text-slate-400">{r.inv.roleGroup}</span>
                  </span>
                  <span className="font-mono text-sm text-flame-300">{Math.round(r.score)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-900/60">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">What NASA found</h2>
            <Link to="/insights" className="text-xs text-micro-300 hover:text-white">See charts →</Link>
          </div>
          <div className="flex flex-1 flex-col px-4 py-3">
            <p className="text-lg font-semibold leading-snug text-white">{brief.headline}</p>
            <ul className="mt-3 flex-1 space-y-2">
              {brief.points.slice(0, 3).map(p => (
                <li key={p} className="text-sm leading-relaxed text-slate-300 before:mr-2 before:text-flame-400 before:content-['·']">{p}</li>
              ))}
            </ul>
            <p className="mt-3 border-t border-white/5 pt-3 text-sm text-cyan-100/90">{brief.action}</p>
          </div>
        </div>
      </section>

      {/* Everything else, one clean row */}
      <section aria-label="More tools">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">More tools</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(t => (
            <Link key={t.to} to={t.to} className="group flex items-baseline justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 hover:border-white/20 hover:bg-white/5">
              <span>
                <span className="block text-sm font-medium text-white group-hover:text-micro-300">{t.label}</span>
                <span className="text-xs text-slate-500">{t.hint}</span>
              </span>
              <span className="text-slate-500 group-hover:text-white">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
