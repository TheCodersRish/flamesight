import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Flame from '../components/Flame';
import { Card, PageHeader, Pill, Slider, Takeaway } from '../components/ui';
import {
  MECHANISMS,
  PRIMARY,
  SECONDARY,
  evaluateMechanism,
  mechById,
  type MechId,
} from '../lib/microMechanisms';

type Mode = 'thermo' | 'mechanisms';
type ThemeId = 'adiabatic' | 'isothermal' | 'isochoric' | 'polytropic';

const MECH_IDS = new Set(MECHANISMS.map(m => m.id));
const THEME_IDS = new Set<ThemeId>(['adiabatic', 'isothermal', 'isochoric', 'polytropic']);

interface Theme {
  id: ThemeId;
  name: string;
  equation: string;
  tagline: string;
  summary: string;
  freefall: string;
  flameNote: string;
  takeaway: string;
}

const THEMES: Theme[] = [
  {
    id: 'adiabatic',
    name: 'Adiabatic',
    equation: 'Q = 0 · PV^γ = const · T V^{γ−1} = const',
    tagline: 'No heat crosses the gas parcel boundary',
    summary:
      'An adiabatic process exchanges no heat with the surroundings (Q = 0). As a freefall flame’s hot products expand into the cabin, the gas does work and cools along the adiabatic curve—faster than if walls kept feeding heat back in.',
    freefall:
      'In microgravity there is no buoyant plume (rising hot air) to pull cool air through the flame. Heat and gases move mainly by diffusion and weak ventilation. Adiabatic cooling of the expanding product gas therefore competes with chemical heat release, which is why many droplet flames (FLEX) self-extinguish once the mixture cools and oxygen runs low.',
    flameNote: 'Expand the parcel: temperature and luminosity drop while the spherical diffusion flame shrinks.',
    takeaway: 'Adiabatic expansion in freefall cools the reaction zone without buoyant mixing—raising the chance of radiative extinction (going out by heat glow).',
  },
  {
    id: 'isothermal',
    name: 'Isothermal',
    equation: 'T = const · PV = const · ΔU = 0 (ideal gas)',
    tagline: 'Temperature held fixed by heat exchange',
    summary:
      'An isothermal process keeps temperature constant. Any expansion must absorb heat; any compression must reject it. For an ideal gas, internal energy stays fixed, so work and heat balance each other.',
    freefall:
      'Nearly steady freefall flame models often treat the far-field cabin gas as isothermal. Heat leaving the flame ball is soaked up by the module’s large thermal mass, so flame size is set by oxygen diffusion and stoichiometry (fuel–oxygen balance) rather than bulk cooling of the atmosphere.',
    flameNote: 'Hold T fixed while pressure falls with expansion: the spherical flame stays luminous but grows as density drops.',
    takeaway: 'Isothermal freefall flames track oxygen transport; cabin heat capacity “anchors” temperature so size follows diffusion.',
  },
  {
    id: 'isochoric',
    name: 'Isochoric',
    equation: 'V = const · P/T = const · W = 0',
    tagline: 'Fixed volume—pressure rides temperature',
    summary:
      'An isochoric (constant-volume) process keeps volume fixed. No expansion work is done; heat added goes entirely into raising temperature and pressure of the sealed gas.',
    freefall:
      'Spacecraft cabins and sealed experiment chambers are nearly constant volume. A freefall fire dumps heat into a fixed air mass: pressure and temperature climb together. That can raise oxygen partial pressure early on, then starve or suppress the flame once oxidizer is used up and radiative losses grow.',
    flameNote: 'Add heat at fixed volume: pressure and flame intensity rise together inside the sealed module.',
    takeaway: 'Isochoric freefall fires couple heat release to cabin overpressure—critical for closed-habitat safety.',
  },
  {
    id: 'polytropic',
    name: 'Polytropic',
    equation: 'PV^n = const · T V^{n−1} = const',
    tagline: 'General heat-loss path between extremes',
    summary:
      'A polytropic process follows PV^n = constant. The index n bridges limiting cases: n = 0 (isobaric), n = 1 (isothermal), n = γ (adiabatic), n → ∞ (isochoric). Real freefall flame gas pockets sit somewhere in between.',
    freefall:
      'Product gas around a microgravity flame neither expands perfectly adiabatically nor stays perfectly isothermal—walls, radiation, and weak airflow exchange some heat. Tuning n lets you explore how partial heat loss reshapes temperature, density, and the spherical flame’s oxygen supply.',
    flameNote: 'Sweep the polytropic index n and watch temperature, pressure, and the freefall flame morph between the classic limits.',
    takeaway: 'Polytropic paths capture real freefall heat loss; n near γ cools fast, n near 1 keeps the flame warmer.',
  },
];

const GAMMA = 1.4;
const R = 1;
const P0 = 1;
const V0 = 1;
const T0 = P0 * V0 / R;

function clamp(x: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, x));
}

function stateAt(theme: ThemeId, expansion: number, heat: number, nPoly: number) {
  const V = theme === 'isochoric' ? V0 : V0 * expansion;
  let P: number;
  let T: number;
  if (theme === 'adiabatic') {
    P = P0 * Math.pow(V0 / V, GAMMA);
    T = T0 * Math.pow(V0 / V, GAMMA - 1);
  } else if (theme === 'isothermal') {
    T = T0;
    P = P0 * (V0 / V);
  } else if (theme === 'isochoric') {
    T = T0 * (1 + 1.8 * heat);
    P = P0 * (T / T0);
  } else {
    const n = nPoly;
    P = P0 * Math.pow(V0 / V, n);
    T = T0 * Math.pow(V0 / V, n - 1);
  }
  return { P, V, T };
}

function curvePoints(theme: ThemeId, expansion: number, heat: number, nPoly: number) {
  const pts: { v: number; p: number; t: number }[] = [];
  if (theme === 'isochoric') {
    for (let i = 0; i <= 40; i++) {
      const h = (i / 40) * heat;
      const s = stateAt('isochoric', 1, h, nPoly);
      pts.push({ v: s.V, p: s.P, t: s.T });
    }
    return pts;
  }
  const vmax = Math.max(expansion, 1.05);
  for (let i = 0; i <= 48; i++) {
    const vRatio = 1 + (vmax - 1) * (i / 48);
    const s = stateAt(theme, vRatio, heat, nPoly);
    pts.push({ v: +s.V.toFixed(3), p: +s.P.toFixed(3), t: +s.T.toFixed(3) });
  }
  return pts;
}

function flameFromState(theme: ThemeId, s: { P: number; V: number; T: number }, nPoly: number) {
  const tNorm = clamp(s.T / T0 / 2.2);
  const pNorm = clamp(s.P / P0 / 2.2);
  if (theme === 'adiabatic') {
    return { gravity: 0, o2: clamp(0.25 + 0.55 * tNorm), flow: 0.05, dilution: clamp(1 - tNorm) };
  }
  if (theme === 'isothermal') {
    const dens = clamp(s.P / P0);
    return { gravity: 0, o2: clamp(0.35 + 0.4 * dens), flow: 0.08 + 0.15 * (1 - dens), dilution: 0.15 };
  }
  if (theme === 'isochoric') {
    return { gravity: 0, o2: clamp(0.3 + 0.65 * tNorm), flow: 0.04, dilution: clamp(0.55 - 0.45 * pNorm) };
  }
  const cool = clamp((nPoly - 1) / (GAMMA - 1));
  return {
    gravity: 0,
    o2: clamp(0.28 + 0.5 * tNorm),
    flow: 0.06,
    dilution: clamp(0.1 + 0.7 * cool * (1 - tNorm)),
  };
}

function ThermoPanel({ initialTheme }: { initialTheme?: ThemeId }) {
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme && THEME_IDS.has(initialTheme) ? initialTheme : 'adiabatic');
  const [expansion, setExpansion] = useState(1.6);
  const [heat, setHeat] = useState(0.55);
  const [nPoly, setNPoly] = useState(1.3);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    if (initialTheme && THEME_IDS.has(initialTheme)) setThemeId(initialTheme);
  }, [initialTheme]);

  const theme = THEMES.find(t => t.id === themeId)!;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let t0 = performance.now();
    let alive = true;
    const tick = (now: number) => {
      if (!alive || !playingRef.current) return;
      raf = requestAnimationFrame(tick);
      const t = (now - t0) / 1000;
      const wave = 0.5 + 0.5 * Math.sin(t * 0.7);
      if (themeId === 'isochoric') setHeat(0.25 + wave * 0.7);
      else if (themeId === 'polytropic') setExpansion(1.15 + wave * 1.1);
      else setExpansion(1.15 + wave * 1.1);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [playing, themeId]);

  const scrubExpansion = (v: number) => {
    playingRef.current = false;
    setPlaying(false);
    setExpansion(v);
  };
  const scrubHeat = (v: number) => {
    playingRef.current = false;
    setPlaying(false);
    setHeat(v);
  };

  const state = useMemo(() => stateAt(themeId, expansion, heat, nPoly), [themeId, expansion, heat, nPoly]);
  const path = useMemo(() => curvePoints(themeId, expansion, heat, nPoly), [themeId, expansion, heat, nPoly]);
  const flame = useMemo(() => flameFromState(themeId, state, nPoly), [themeId, state, nPoly]);
  const marker = [{ v: +state.V.toFixed(3), p: +state.P.toFixed(3), t: +state.T.toFixed(3) }];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Thermodynamic themes">
        {THEMES.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={themeId === t.id}
            onClick={() => { setThemeId(t.id); setPlaying(true); }}
            className={`rounded-lg px-3 py-2 text-sm ${themeId === t.id ? 'bg-flame-500/25 text-white ring-1 ring-flame-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card glow="flame">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">{theme.name}</h2>
              <p className="font-mono text-xs text-flame-300">{theme.equation}</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="micro">Freefall · 0 g</Pill>
              <button
                type="button"
                onClick={() => setPlaying(p => !p)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/20"
              >
                {playing ? 'Pause live sim' : 'Play live sim'}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-space-950/80 ring-1 ring-white/10">
            <Flame
              gravity={flame.gravity}
              o2={flame.o2}
              flow={flame.flow}
              dilution={flame.dilution}
              className="h-64 w-full sm:h-72"
              label={`${theme.name} freefall flame simulation`}
              paused={false}
            />
          </div>
          <p className="mt-2 text-sm text-slate-300">{theme.flameNote}</p>

          <div className="mt-4 space-y-3">
            {themeId === 'isochoric' ? (
              <Slider
                label="Heat added (sealed volume)"
                value={heat}
                min={0}
                max={1}
                step={0.01}
                onChange={scrubHeat}
                format={v => `${Math.round(v * 100)}%`}
                hint="Scrub heat release — the freefall flame updates with you"
              />
            ) : (
              <Slider
                label="Volume ratio V / V₀"
                value={expansion}
                min={1}
                max={2.5}
                step={0.01}
                onChange={scrubExpansion}
                format={v => v.toFixed(2)}
                hint="Scrub expansion — the freefall flame updates with you"
              />
            )}
            {themeId === 'polytropic' && (
              <Slider
                label="Polytropic index n"
                value={nPoly}
                min={0.2}
                max={2.2}
                step={0.05}
                onChange={setNPoly}
                format={v => v.toFixed(2)}
                hint={`n=1 isothermal · n=${GAMMA} adiabatic · large n → isochoric`}
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 px-2 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">P / P₀</p>
              <p className="font-mono text-lg text-white">{state.P.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-white/5 px-2 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">V / V₀</p>
              <p className="font-mono text-lg text-white">{state.V.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-white/5 px-2 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">T / T₀</p>
              <p className="font-mono text-lg text-white">{state.T.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Live process path</h2>
            <p className="mt-1 text-xs text-slate-400">
              {themeId === 'isochoric' ? 'Pressure vs temperature at fixed volume' : 'Pressure vs volume along the process path'}
            </p>
            <div className="mt-3 h-52 w-full">
              <ResponsiveContainer>
                <LineChart data={path} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <XAxis
                    dataKey={themeId === 'isochoric' ? 't' : 'v'}
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{ value: themeId === 'isochoric' ? 'T / T₀' : 'V / V₀', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="p"
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={40}
                    label={{ value: 'P / P₀', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0b1224', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                  <Line type="monotone" dataKey="p" stroke="#ff9f43" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line data={marker} type="monotone" dataKey="p" stroke="#5cb8ff" strokeWidth={0} dot={{ r: 5, fill: '#5cb8ff' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">{theme.tagline}</h2>
            <p className="mt-2 text-sm text-slate-300">{theme.summary}</p>
            <h3 className="mt-4 text-sm font-semibold text-micro-300">In freefall</h3>
            <p className="mt-1 text-sm text-slate-300">{theme.freefall}</p>
            <Takeaway>{theme.takeaway}</Takeaway>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Compare all four</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {THEMES.map(t => (
                <li key={t.id} className="flex gap-2">
                  <button type="button" onClick={() => setThemeId(t.id)} className={`shrink-0 font-medium ${themeId === t.id ? 'text-flame-300' : 'text-micro-300 hover:underline'}`}>
                    {t.name}
                  </button>
                  <span className="text-slate-400">— {t.tagline}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Charts and the flame are illustrative teaching models, not a certified fire simulation. Units are normalized so starting pressure, volume, and temperature equal 1. γ = {GAMMA} for air-like gas.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function MechanismsPanel({ initialMech }: { initialMech?: MechId }) {
  const startId = initialMech && MECH_IDS.has(initialMech) ? initialMech : 'no-buoyancy';
  const [mechId, setMechId] = useState<MechId>(startId);
  const mech = mechById(mechId);
  const [a, setA] = useState(mech.defaults.a);
  const [b, setB] = useState(mech.defaults.b);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const selectMech = (id: MechId) => {
    const m = mechById(id);
    setMechId(id);
    setA(m.defaults.a);
    setB(m.defaults.b);
    setPlaying(true);
  };

  useEffect(() => {
    if (initialMech && MECH_IDS.has(initialMech) && initialMech !== mechId) selectMech(initialMech);
    // Only react to URL-driven preset changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMech]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let t0 = performance.now();
    let alive = true;
    const tick = (now: number) => {
      if (!alive || !playingRef.current) return;
      raf = requestAnimationFrame(tick);
      const t = (now - t0) / 1000;
      const wave = 0.5 + 0.5 * Math.sin(t * 0.65);
      const m = mechById(mechId);
      const spanA = m.paramA.max - m.paramA.min;
      setA(m.paramA.min + spanA * (0.15 + 0.7 * wave));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [playing, mechId]);

  const scrubA = (v: number) => {
    playingRef.current = false;
    setPlaying(false);
    setA(v);
  };
  const scrubB = (v: number) => {
    playingRef.current = false;
    setPlaying(false);
    setB(v);
  };

  const state = useMemo(() => evaluateMechanism(mechId, a, b), [mechId, a, b]);
  const intensityPct = Math.round(state.intensity * 100);

  return (
    <>
      <div className="mb-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Primary transport</p>
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Primary transport mechanisms">
          {PRIMARY.map(m => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mechId === m.id}
              onClick={() => selectMech(m.id)}
              className={`rounded-lg px-3 py-2 text-sm ${mechId === m.id ? 'bg-micro-500/25 text-white ring-1 ring-micro-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Secondary thermal / surface</p>
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Secondary thermal mechanisms">
          {SECONDARY.map(m => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mechId === m.id}
              onClick={() => selectMech(m.id)}
              className={`rounded-lg px-3 py-2 text-sm ${mechId === m.id ? 'bg-flame-500/25 text-white ring-1 ring-flame-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card glow={mech.group === 'primary' ? 'micro' : 'flame'}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">{mech.name}</h2>
              <p className="font-mono text-xs text-flame-300">{mech.equation}</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={mech.group === 'primary' ? 'micro' : 'flame'}>
                {mech.group === 'primary' ? 'Primary transport' : 'Thermal / surface'}
              </Pill>
              <Pill tone="slate">Intensity {intensityPct}</Pill>
              <button
                type="button"
                onClick={() => setPlaying(p => !p)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/20"
              >
                {playing ? 'Pause live sim' : 'Play live sim'}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-space-950/80 ring-1 ring-white/10">
            <Flame
              gravity={state.flame.gravity}
              o2={state.flame.o2}
              flow={state.flame.flow}
              dilution={state.flame.dilution}
              className="h-64 w-full sm:h-72"
              label={`${mech.name} microgravity flame simulation`}
              paused={false}
            />
          </div>
          <p className="mt-2 text-sm text-slate-300">{mech.flameNote}</p>

          <div className="mt-4 space-y-3">
            <Slider
              label={mech.paramA.label}
              value={a}
              min={mech.paramA.min}
              max={mech.paramA.max}
              step={mech.paramA.step}
              onChange={scrubA}
              format={mech.paramA.format}
              hint={mech.paramA.hint}
            />
            <Slider
              label={mech.paramB.label}
              value={b}
              min={mech.paramB.min}
              max={mech.paramB.max}
              step={mech.paramB.step}
              onChange={scrubB}
              format={mech.paramB.format}
              hint={mech.paramB.hint}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 px-2 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">{state.metricLabel}</p>
              <p className="font-mono text-lg text-white">{state.metric.toFixed(2)}</p>
            </div>
            {state.extras.map(e => (
              <div key={e.label} className="rounded-lg bg-white/5 px-2 py-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">{e.label}</p>
                <p className="font-mono text-lg text-white">{e.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">{mech.chart.title}</h2>
            <p className="mt-1 text-xs text-slate-400">Model response with your live setting marked</p>
            <div className="mt-3 h-52 w-full">
              <ResponsiveContainer>
                <LineChart data={state.series} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <XAxis
                    dataKey="x"
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{ value: mech.chart.xLabel, position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="y"
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={48}
                    label={{ value: mech.chart.yLabel, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0b1224', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                  <Line type="monotone" dataKey="y" stroke="#5cb8ff" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line data={state.marker} type="monotone" dataKey="y" stroke="#ff9f43" strokeWidth={0} dot={{ r: 5, fill: '#ff9f43' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">{mech.tagline}</h2>
            <p className="mt-2 text-sm text-slate-300">{mech.summary}</p>
            <h3 className="mt-4 text-sm font-semibold text-micro-300">In freefall</h3>
            <p className="mt-1 text-sm text-slate-300">{mech.freefall}</p>
            <Takeaway>{mech.takeaway}</Takeaway>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">All seven mechanisms</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {MECHANISMS.map(m => (
                <li key={m.id} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectMech(m.id)}
                    className={`shrink-0 font-medium ${mechId === m.id ? 'text-flame-300' : 'text-micro-300 hover:underline'}`}
                  >
                    {m.name}
                  </button>
                  <span className="text-slate-400">— {m.tagline}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Educational models drive the live flame intensity. Equations stay visible for depth. Built for freefall-fire intuition—not a certified safety simulator.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function FluidPhysics() {
  const [sp, setSp] = useSearchParams();
  const modeParam = sp.get('mode');
  const mechParam = sp.get('mech');
  const themeParam = sp.get('theme');
  const initialMode: Mode = modeParam === 'thermo' ? 'thermo' : 'mechanisms';
  const [mode, setMode] = useState<Mode>(initialMode);
  const initialMech = mechParam && MECH_IDS.has(mechParam as MechId) ? (mechParam as MechId) : undefined;
  const initialTheme = themeParam && THEME_IDS.has(themeParam as ThemeId) ? (themeParam as ThemeId) : undefined;

  useEffect(() => {
    if (modeParam === 'thermo' || modeParam === 'mechanisms') setMode(modeParam);
  }, [modeParam]);

  const switchMode = (next: Mode) => {
    setMode(next);
    const nextSp = new URLSearchParams(sp);
    nextSp.set('mode', next);
    if (next === 'mechanisms' && !nextSp.get('mech')) nextSp.delete('theme');
    setSp(nextSp, { replace: true });
  };

  return (
    <div>
      <PageHeader
        kicker="Fluid physics"
        title={mode === 'thermo' ? 'How thermodynamic themes reshape flames in freefall' : 'Transport & thermal mechanisms that reshape freefall flames'}
      >
        {mode === 'thermo'
          ? 'Live teaching sims of adiabatic, isothermal, isochoric, and polytropic paths—and what each means for spherical microgravity flames when buoyancy is gone.'
          : 'Primary fluid transport (no buoyancy, diffusion, ventilation, Stefan flow) and secondary thermal/surface effects (Lewis number, radiation, Marangoni)—each with a live flame sim, explanation, and mathematical model.'}
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Fluid physics mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'mechanisms'}
          onClick={() => switchMode('mechanisms')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'mechanisms' ? 'bg-micro-500/30 text-white ring-1 ring-micro-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
        >
          Transport & thermal mechanisms
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'thermo'}
          onClick={() => switchMode('thermo')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'thermo' ? 'bg-flame-500/30 text-white ring-1 ring-flame-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
        >
          Thermodynamic paths
        </button>
      </div>

      {mode === 'mechanisms' ? <MechanismsPanel initialMech={initialMech} /> : <ThermoPanel initialTheme={initialTheme} />}
    </div>
  );
}
