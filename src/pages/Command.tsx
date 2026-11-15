import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BurnCharts from '../components/BurnCharts';
import CabinStrip from '../components/CabinStrip';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { Pill, Slider } from '../components/ui';
import { useBurn } from '../lib/burnSession';
import { fuelOptions, invLabel } from '../lib/data';
import { isCatalogFuel, type Diluent, type FuelClass, type SimInput } from '../lib/knn';
import { narrateBurn } from '../lib/narrate';
import { feedingMode, fluidPhysicsHref } from '../lib/physicsBridge';
import { plainBurn } from '../lib/plainEnglish';
import { downloadReport, stamp } from '../lib/report';
import { loadScans, removeScan, saveScan, scanLabel, type SavedScan } from '../lib/scans';
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
  const [plain, setPlain] = useState(true);
  const [scans, setScans] = useState<SavedScan[]>(() => (typeof localStorage === 'undefined' ? [] : loadScans()));
  const [savedNote, setSavedNote] = useState('');

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

  const technical = useMemo(() => narrateBurn(x, result), [x, result]);
  const brief = plain ? plainBurn(x, result) : technical;
  const feed = useMemo(() => feedingMode(x), [x]);
  const flame = {
    gravity: GRAVITY[x.gravity].flame,
    o2: clamp(((x.o2 - 0.12) / 0.55) * (0.45 + 0.55 * result.p)),
    flow: clamp(x.flow / 60),
    dilution: x.diluent === 'none' ? 0 : x.diluent === 'CO2' ? 0.65 : 0.5,
  };

  const onSave = () => {
    const saved = saveScan({
      label: scanLabel(x, result.verdict),
      input: x,
      verdict: result.verdict,
      score: Math.round(result.p * 100),
      confidence: result.confidenceLabel,
      plain: plainBurn(x, result),
    });
    setScans(loadScans());
    setSavedNote(`Saved “${saved.label}”. Open it anytime from Saved scans.`);
    window.setTimeout(() => setSavedNote(''), 3500);
  };

  const onDownload = () => {
    const body = [
      'FlameSight — Will It Burn report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Settings',
      `  Fuel: ${x.fuel}`,
      `  Oxygen: ${Math.round(x.o2 * 100)}%`,
      `  Pressure: ${x.psi.toFixed(1)} psi`,
      `  Airflow: ${x.flow} cm/s`,
      `  Gravity: ${GRAVITY[x.gravity].label}`,
      `  Extra gas: ${x.diluent === 'none' ? 'none' : x.diluent}`,
      '',
      'Result',
      `  Verdict: ${result.verdict} to burn`,
      `  Score: ${Math.round(result.p * 100)} / 100`,
      `  Based on: ${result.nTests} nearest NASA tests`,
      `  Uncertainty band: ${Math.round(result.band[0] * 100)}–${Math.round(result.band[1] * 100)} / 100`,
      `  Confidence: ${result.confidenceLabel}`,
      ...(result.beyondTested ? ['  Warning: settings go beyond what NASA tested in PSI outcome tables.'] : []),
      ...result.flags.map(f => `  ${f}`),
      '',
      'Simpler wording',
      plainBurn(x, result),
      '',
      'Technical notes',
      technical,
      '',
      'Closest NASA tests',
      ...result.neighbors.map((n, i) => `  ${i + 1}. ${invLabel(n.t.inv)} — ${n.t.fuel}, ${Math.round((n.t.o2 || 0) * 100)}% oxygen, ${n.t.outcome || 'no outcome'}`),
      '',
      'Data: NASA Physical Sciences Informatics. Educational tool, not a safety certification.',
    ].join('\n');
    downloadReport(`flamesight-burn-${stamp()}.txt`, body);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pt-3 lg:px-4">
        <CabinStrip compact />
      </div>
    <Deck
      stage={(
        <FlameStage title="Will it burn?" caption="The flame is an illustration of the settings below. It is not a combustion simulation." controls={(
          <>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <span className="text-xs text-slate-400">Feeding mode</span>
              <Link
                to={fluidPhysicsHref(feed.mechId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-micro-500/20 px-2.5 py-1 text-xs font-medium text-micro-100 ring-1 ring-micro-400/50 hover:bg-micro-500/30"
                title={feed.detail}
              >
                {feed.label}
                <span className="font-normal text-slate-400">· open model</span>
              </Link>
              <span className="text-[11px] text-slate-500">{feed.detail}</span>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-xs text-slate-300">
                Fuel / material
                <select
                  value={isCatalogFuel(x.fuel) ? x.fuel : '__custom__'}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '__custom__') setX({ ...x, fuel: '', fuelClass: x.fuelClass && x.fuelClass !== 'any' ? x.fuelClass : 'solid' });
                    else setX({ ...x, fuel: v, fuelClass: undefined });
                  }}
                  className="mt-1 w-full rounded border border-cyan-200/20 bg-space-950 px-2 py-1 text-sm text-white"
                >
                  <option value="any">Any fuel</option>
                  {fuelOptions.map(f => <option key={f.fuel} value={f.fuel}>{f.fuel}</option>)}
                  <option value="__custom__">Custom material…</option>
                </select>
              </label>
              {!isCatalogFuel(x.fuel) && (
                <div className="space-y-2 rounded-lg bg-white/5 p-2 ring-1 ring-white/10">
                  <label className="block text-xs text-slate-300">
                    Material name
                    <input
                      value={x.fuel}
                      onChange={e => set('fuel', e.target.value)}
                      placeholder="e.g. cotton towel, acrylic panel, Nomex glove"
                      className="mt-1 w-full rounded border border-cyan-200/20 bg-space-950 px-2 py-1.5 text-sm text-white placeholder:text-slate-500"
                    />
                  </label>
                  <div>
                    <p className="text-[11px] text-slate-400">Material type (used when name is not in NASA tests)</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(['solid', 'liquid', 'gas'] as FuelClass[]).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => set('fuelClass', c)}
                          aria-pressed={(x.fuelClass || 'solid') === c}
                          className={`rounded-lg px-2.5 py-1 text-xs capitalize ${(x.fuelClass || 'solid') === c ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  {result.fuelResolve.note && <p className="text-[11px] text-cyan-200/90">{result.fuelResolve.note}</p>}
                </div>
              )}
            </div>
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
        <>
          <ul className="space-y-2">
            {result.neighbors.map((n, i) => (
              <li key={n.t.id} className="rounded-xl bg-white/5 px-3 py-2">
                <span className="flex items-center justify-between gap-2">
                  <Link to={`/explorer/${n.t.inv}`} className="min-w-0 text-sm font-medium text-white hover:underline">
                    <span className="block truncate">{i + 1}. {n.t.id}</span>
                    <span className="block text-[11px] font-normal text-slate-400">{invLabel(n.t.inv)}</span>
                  </Link>
                  <Pill tone={n.t.burn >= 0.8 ? 'red' : n.t.burn >= 0.5 ? 'amber' : 'micro'}>{n.t.outcome || 'no outcome'}</Pill>
                </span>
                <span className="mt-1 block text-xs text-slate-400">{n.t.fuel} · {Math.round((n.t.o2 || 0) * 100)}% oxygen</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Saved scans</p>
            {scans.length === 0 && <p className="mt-1 text-xs text-slate-500">Save a scan to revisit it later on this device.</p>}
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
              {scans.map(s => (
                <li key={s.id} className="flex items-start gap-1">
                  <button type="button" onClick={() => setX(s.input)} className="min-w-0 flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-left text-[11px] text-slate-200 hover:bg-white/10">
                    <span className="block truncate text-white">{s.label}</span>
                    <span className="text-slate-500">{new Date(s.savedAt).toLocaleString()}</span>
                  </button>
                  <button type="button" aria-label={`Delete ${s.label}`} onClick={() => { removeScan(s.id); setScans(loadScans()); }} className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-white/10 hover:text-white">✕</button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      graphs={<BurnCharts nearby={result.nearby} o2={x.o2} p={result.p} band={result.band} nTests={result.nTests} />}
      outcome={(
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPlain(p => !p)} className={`rounded-lg px-2.5 py-1 text-xs ${plain ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/5 text-slate-300'}`} aria-pressed={plain}>
              {plain ? 'Simpler wording on' : 'Simpler wording off'}
            </button>
            <button type="button" onClick={onSave} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/15">Save scan</button>
            <button type="button" onClick={onDownload} className="rounded-lg bg-flame-500/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-flame-500">Download report</button>
          </div>
          {savedNote && <p className="mt-2 text-xs text-cyan-200">{savedNote}</p>}
          <p className={`mt-3 text-2xl font-semibold ${result.verdict === 'Likely' ? 'text-flame-300' : result.verdict === 'Borderline' ? 'text-amber-200' : 'text-cyan-200'}`}>{result.verdict} to burn</p>
          <p className="mt-1 text-sm text-slate-300">Burn score {Math.round(result.p * 100)} out of 100 · based on {result.nTests} tests · {result.confidenceLabel} confidence</p>
          <p className="mt-1 text-xs text-slate-400">Uncertainty band {Math.round(result.band[0] * 100)}–{Math.round(result.band[1] * 100)} / 100</p>
          {result.beyondTested && (
            <p className="mt-2 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-xs text-amber-200 ring-1 ring-amber-500/30">
              Warning: these settings go beyond what NASA tested. Treat this as an estimate, not a certification.
            </p>
          )}
          {result.flags.filter(f => !f.startsWith('WARNING:')).slice(0, 2).map(f => (
            <p key={f} className="mt-1 text-[11px] text-amber-300/90">{f}</p>
          ))}
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{brief}</p>
          <Link to="/" className="mt-3 inline-block text-sm text-slate-300 hover:text-white">← Back to dashboard</Link>
          <Link to="/insights" className="mt-2 block text-sm text-cyan-200 hover:text-white">See the NASA chart for these settings →</Link>
          <Link to="/impact" className="mt-2 block text-sm text-flame-300 hover:text-white">Gap finder & mission PDF →</Link>
          <Link to="/scenarios" className="mt-2 block text-sm text-micro-300 hover:text-white">Rank risks with this same cabin →</Link>
        </>
      )}
    />
    </div>
  );
}
