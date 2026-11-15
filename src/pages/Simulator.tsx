import { useEffect, useMemo, useState } from 'react';
import ScenarioIcon from '../components/ScenarioIcon';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Flame from '../components/Flame';
import { Card, PageHeader, Pill, Slider, SourceChip } from '../components/ui';
import { fuelOptions, invLabel, stats } from '../lib/data';
import { predict, type Diluent, type SimInput } from '../lib/knn';
import { GRAVITY, SCENARIOS, scenarioById } from '../lib/scenarios';
import type { Gravity } from '../lib/types';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const VERDICT_STYLE = { Likely: 'from-flame-500 to-rose-600', Borderline: 'from-amber-400 to-flame-500', Unlikely: 'from-micro-500 to-cyan-500' };

export default function Simulator() {
  const [sp] = useSearchParams();
  const preset = sp.get('preset');
  const demo = sp.get('demo') === '1';
  const init = preset ? scenarioById(preset) : null;
  const [x, setX] = useState<SimInput>(() => ({ fuel: 'any', o2: init?.o2 ?? 0.21, psi: init?.psi ?? 14.7, flow: init?.flow ?? 20, gravity: init?.gravity ?? 'micro', diluent: 'none' }));
  const set = <K extends keyof SimInput>(k: K, v: SimInput[K]) => setX(s => ({ ...s, [k]: v }));

  // Guided-demo animation: Earth → Moon → microgravity, oxygen up
  useEffect(() => {
    if (!demo) return;
    const seq: Partial<SimInput>[] = [{ gravity: 'earth', o2: 0.21 }, { gravity: 'moon', o2: 0.3 }, { gravity: 'micro', o2: 0.3 }, { gravity: 'micro', o2: 0.3, diluent: 'CO2' }];
    const ids = seq.map((s, i) => window.setTimeout(() => setX(v => ({ ...v, ...s })), 300 + i * 1600));
    return () => ids.forEach(window.clearTimeout);
  }, [demo]);

  const r = useMemo(() => predict(x), [x]);
  const flame = {
    gravity: GRAVITY[x.gravity].flame,
    o2: clamp(((x.o2 - 0.12) / 0.55) * (0.45 + 0.55 * r.p)),
    flow: clamp(x.flow / 60),
    dilution: x.diluent === 'none' ? 0 : x.diluent === 'CO2' ? 0.65 : 0.5,
  };
  const extrap = GRAVITY[x.gravity].extrapolated;

  return (
    <div>
      <PageHeader kicker="Will It Burn?" title="Set the conditions. See what NASA's tests say.">
        Pick a fuel and an atmosphere. FlameSight finds the closest real NASA tests (k-nearest neighbors over {stats.knnPool} tests that record what the flame did) and shows them as evidence.
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="self-center text-xs text-slate-400">Presets:</span>
        {SCENARIOS.map(s => <button key={s.id} onClick={() => setX(v => ({ ...v, o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity }))} className="glass rounded-lg px-3 py-1 text-xs text-slate-200 hover:text-white"><ScenarioIcon id={s.id} className="mr-1 inline h-4 w-4 align-[-3px]" /> {s.short}</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[340px_1fr_1fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-300">Inputs</h2>
          <label htmlFor="fuel" className="text-sm text-slate-300">Fuel / material (from NASA tests)</label>
          <select id="fuel" value={x.fuel} onChange={e => set('fuel', e.target.value)} className="mb-4 mt-1 w-full rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white">
            <option value="any">Any fuel (match conditions only)</option>
            {['liquid', 'gas', 'solid'].map(c => (
              <optgroup key={c} label={c === 'liquid' ? 'Liquid fuel droplets' : c === 'gas' ? 'Gas flames' : 'Solid materials'}>
                {fuelOptions.filter(f => f.fuelClass === c).map(f => <option key={f.fuel} value={f.fuel}>{f.fuel} · {f.n} test{f.n > 1 ? 's' : ''} ({f.invs.join(', ')})</option>)}
              </optgroup>
            ))}
          </select>
          <div className="space-y-4">
            <Slider label="Oxygen (O₂)" value={x.o2} min={0.1} max={1} step={0.01} onChange={v => set('o2', v)} format={v => `${Math.round(v * 100)}%`} hint="ISS 21% · Moon base 30% · suit 100%" />
            <Slider label="Pressure" value={x.psi} min={2} max={45} step={0.1} onChange={v => set('psi', v)} format={v => `${v.toFixed(1)} psi`} hint="Earth/ISS 14.7 · Moon base 10.2 · suit 4.3" />
            <Slider label="Airflow" value={x.flow} min={0} max={50} step={1} onChange={v => set('flow', v)} format={v => `${v} cm/s`} hint="SAFFIRE tests: 20–30 cm/s" />
          </div>
          <fieldset className="mt-4">
            <legend className="text-sm text-slate-300">Gravity</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(Object.keys(GRAVITY) as Gravity[]).map(g => (
                <button key={g} onClick={() => set('gravity', g)} aria-pressed={x.gravity === g} className={`rounded-lg px-2 py-1.5 text-xs ${x.gravity === g ? 'bg-micro-500/30 text-white ring-1 ring-micro-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                  {GRAVITY[g].label}{GRAVITY[g].extrapolated && g !== 'earth' ? ' *' : ''}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-amber-300/80">* Moon/Mars: extrapolated (no partial-gravity data in PSI)</p>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="text-sm text-slate-300">Suppressant gas in the air</legend>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(['none', 'CO2', 'He'] as Diluent[]).map(d => <button key={d} onClick={() => set('diluent', d)} aria-pressed={x.diluent === d} className={`rounded-lg px-2 py-1.5 text-xs ${x.diluent === d ? 'bg-flame-500/30 text-white ring-1 ring-flame-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{d === 'none' ? 'None' : d === 'CO2' ? 'CO₂' : 'Helium'}</button>)}
            </div>
          </fieldset>
        </Card>

        <Card className="relative flex flex-col overflow-hidden p-0" glow={x.gravity === 'micro' ? 'micro' : 'flame'}>
          <div className="grid-bg absolute inset-0 opacity-50" />
          <Flame {...flame} className="h-[360px] w-full flex-1" label={`Flame preview: ${GRAVITY[x.gravity].label}, ${Math.round(x.o2 * 100)}% oxygen`} />
          <div className="relative border-t border-white/5 bg-space-900/70 p-4 text-xs text-slate-400">
            Flame shape is an illustration driven by your inputs: gravity sets the shape (sphere ↔ teardrop), O₂ and the prediction set brightness and size, airflow stretches it, CO₂/He dims it.
          </div>
        </Card>

        <Card>
          <motion.div key={r.verdict} initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }} className={`rounded-2xl bg-gradient-to-br ${VERDICT_STYLE[r.verdict]} p-5 text-white`}>
            <p className="text-xs uppercase tracking-widest opacity-80">Prediction{extrap ? ' · extrapolated' : ''}</p>
            <p className="mt-1 text-4xl font-semibold">{r.verdict} to burn</p>
            <p className="mt-1 font-mono text-sm opacity-90">burn score {(r.p * 100).toFixed(0)}/100 · confidence {r.confidenceLabel} ({Math.round(r.confidence * 100)}%)</p>
          </motion.div>
          <p className="mt-2 text-[11px] text-slate-500">Score = {Math.round((1 - r.priorW) * 100)}% nearest NASA tests ({(r.pData * 100).toFixed(0)}) + {Math.round(r.priorW * 100)}% physics prior ({(r.prior * 100).toFixed(0)}). Not a safety certification.</p>
          {r.flags.length > 0 && <ul className="mt-3 space-y-1">{r.flags.map(f => <li key={f} className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">⚠ {f}</li>)}</ul>}
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-widest text-micro-300">Evidence: 3 nearest NASA tests</h3>
          <ol className="mt-2 space-y-2">
            {r.neighbors.map((n, i) => (
              <li key={n.t.id} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-slate-400">#{i + 1} · distance {n.d.toFixed(2)}</span><SourceChip acc={n.t.inv} compact /></div>
                <p className="mt-1 text-sm font-medium text-white">{n.t.id}</p>
                <p className="text-xs text-slate-300">{n.t.fuel} · {(n.t.o2 * 100).toFixed(1)}% O₂ · {n.t.pAtm ? `${(n.t.pAtm * 14.696).toFixed(1)} psi` : 'pressure not listed'} · {n.t.flow !== null ? `${n.t.flow} cm/s` : 'flow not listed'}{n.t.diluent ? ` · ${n.t.diluent}` : ''}</p>
                <p className="mt-1 text-xs"><Pill tone={n.t.burn >= 0.8 ? 'red' : n.t.burn >= 0.5 ? 'amber' : 'micro'}>{n.t.outcome}</Pill></p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-slate-500">All tests are from microgravity experiments: {Array.from(new Set(r.neighbors.map(n => invLabel(n.t.inv)))).join(', ')}. <Link to="/about#model" className="underline">How the model works</Link></p>
        </Card>
      </div>
    </div>
  );
}
