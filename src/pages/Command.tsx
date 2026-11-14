import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BurnCharts from '../components/BurnCharts';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { Pill, Slider } from '../components/ui';
import { useBurn } from '../lib/burnSession';
import { fuelOptions, invLabel } from '../lib/data';
import { type Diluent, type SimInput } from '../lib/knn';
import { narrateBurn } from '../lib/narrate';
import { GRAVITY, SCENARIOS, scenarioById } from '../lib/scenarios';
import type { Gravity } from '../lib/types';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

export default function Command() {
  const [sp] = useSearchParams();
  const { input: x, result, setInput: setX } = useBurn();
  const set = <K extends keyof SimInput>(k: K, v: SimInput[K]) => setX({ ...x, [k]: v });
  const preset = sp.get('preset');
  const demo = sp.get('demo') === '1';
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const init = preset ? scenarioById(preset) : null;
    if (init) setX({ fuel: 'any', o2: init.o2, psi: init.psi, flow: init.flow, gravity: init.gravity, diluent: 'none' });
  }, [preset, setX]);

  useEffect(() => {
    if (!demo) return;
    const seq: Partial<SimInput>[] = [{ gravity: 'earth', o2: 0.21 }, { gravity: 'moon', o2: 0.3 }, { gravity: 'micro', o2: 0.3 }, { gravity: 'micro', o2: 0.3, diluent: 'CO2' }];
    const ids = seq.map((s, i) => window.setTimeout(() => setX(v => ({ ...v, ...s })), 300 + i * 1600));
    return () => ids.forEach(window.clearTimeout);
  }, [demo, setX]);

  const brief = useMemo(() => narrateBurn(x, result), [x, result]);
  const flame = {
    gravity: GRAVITY[x.gravity].flame,
    o2: clamp(((x.o2 - 0.12) / 0.55) * (0.45 + 0.55 * result.p)),
    flow: clamp(x.flow / 60),
    dilution: x.diluent === 'none' ? 0 : x.diluent === 'CO2' ? 0.65 : 0.5,
  };

  return (
    <Deck
      stage={(
        <FlameStage title="Will it burn?" caption="The flame is an illustration of the settings below. It is not a combustion simulation." controls={(
          <>
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
                  <button key={g} type="button" onClick={() => set('gravity', g)} aria-pressed={x.gravity === g} className={`rounded-lg px-2.5 py-1 text-xs ${x.gravity === g ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300'}`}>{GRAVITY[g].label.split(' ')[0]}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 sm:col-span-2">
              {SCENARIOS.map(s => (
                <button key={s.id} type="button" onClick={() => setX({ ...x, o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity })} className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10">{s.short}</button>
              ))}
              {(['none', 'CO2', 'He'] as Diluent[]).map(d => (
                <button key={d} type="button" onClick={() => set('diluent', d)} aria-pressed={x.diluent === d} className={`rounded-lg px-2.5 py-1 text-xs ${x.diluent === d ? 'bg-flame-500/30 text-white' : 'bg-white/5 text-slate-300'}`}>{d === 'none' ? 'No gas' : d === 'CO2' ? 'CO₂' : 'Helium'}</button>
              ))}
            </div>
          </>
        )}>
          <Flame {...flame} className="h-full w-full" label={`Will It Burn flame: ${GRAVITY[x.gravity].label}, ${Math.round(x.o2 * 100)}% oxygen`} />
        </FlameStage>
      )}
      experiments={(
        <ul className="space-y-2">
          {result.neighbors.map((n, i) => (
            <li key={n.t.id} className="rounded-xl bg-white/5 px-3 py-2">
              <span className="flex items-center justify-between gap-2">
                <Link to={`/explorer/${n.t.inv}`} className="text-sm font-medium text-white hover:underline">{i + 1}. {invLabel(n.t.inv)}</Link>
                <Pill tone={n.t.burn >= 0.8 ? 'red' : n.t.burn >= 0.5 ? 'amber' : 'micro'}>{n.t.outcome || 'no outcome'}</Pill>
              </span>
              <span className="mt-1 block text-xs text-slate-400">{n.t.fuel} · {Math.round(n.t.o2 * 100)}% oxygen</span>
            </li>
          ))}
        </ul>
      )}
      graphs={<BurnCharts nearby={result.nearby} o2={x.o2} p={result.p} />}
      outcome={(
        <>
          <p className={`text-2xl font-semibold ${result.verdict === 'Likely' ? 'text-flame-300' : result.verdict === 'Borderline' ? 'text-amber-200' : 'text-cyan-200'}`}>{result.verdict} to burn</p>
          <p className="mt-1 text-sm text-slate-300">{Math.round(result.p * 100)} out of 100 · {result.confidenceLabel} confidence</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{brief}</p>
          <Link to="/insights" className="mt-3 inline-block text-sm text-cyan-200 hover:text-white">See the NASA chart for these settings →</Link>
        </>
      )}
    />
  );
}
