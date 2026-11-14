import { useEffect, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Flame from '../components/Flame';
import { Card, PageHeader, Pill, Slider, Takeaway } from '../components/ui';

type ThemeId = 'adiabatic' | 'isothermal' | 'isochoric' | 'polytropic';

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
      'An adiabatic process exchanges no heat with the surroundings. As a freefall flame’s hot products expand into the cabin, the parcel does work and its temperature falls along the adiabatic curve—faster than if heat were replenished from the walls.',
    freefall:
      'In microgravity there is no buoyant plume to pull fresh cool air through the flame. Heat and species move mainly by diffusion and weak ventilation. Adiabatic cooling of the expanding product gas therefore competes directly with chemical heat release, which is why many droplet flames (FLEX) self-extinguish once the local mixture cools and oxygen is depleted.',
    flameNote: 'Expand the parcel: temperature and luminosity drop while the spherical diffusion flame shrinks.',
    takeaway: 'Adiabatic expansion in freefall cools the reaction zone without buoyant mixing—raising the chance of radiative extinction.',
  },
  {
    id: 'isothermal',
    name: 'Isothermal',
    equation: 'T = const · PV = const · ΔU = 0 (ideal gas)',
    tagline: 'Temperature held fixed by heat exchange',
    summary:
      'An isothermal process keeps temperature constant. Any expansion must absorb heat; any compression must reject it. Ideal-gas internal energy stays fixed, so work and heat balance each other.',
    freefall:
      'Quasi-steady freefall flame models often treat the far-field cabin gas as isothermal. Heat lost from the flame ball is assumed to be soaked up by the large thermal mass of the module, so flame size is set by oxygen diffusion and stoichiometry rather than bulk cooling of the atmosphere.',
    flameNote: 'Hold T fixed while pressure falls with expansion: the spherical flame stays luminous but grows as density drops.',
    takeaway: 'Isothermal freefall flames track oxygen transport; cabin heat capacity “anchors” temperature so size follows diffusion.',
  },
  {
    id: 'isochoric',
    name: 'Isochoric',
    equation: 'V = const · P/T = const · W = 0',
    tagline: 'Fixed volume—pressure rides temperature',
    summary:
      'An isochoric (isometric) process keeps volume fixed. No expansion work is done; heat added goes entirely into raising temperature and pressure of the sealed gas.',
    freefall:
      'Spacecraft cabins and sealed experiment chambers are nearly constant volume. A freefall fire dumps heat into a fixed air mass: pressure and temperature climb together. That raises oxygen partial pressure early on, then can starve or suppress the flame once oxidizer is consumed and radiative losses grow.',
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
const R = 1; // normalized gas constant for ideal-gas charts
const P0 = 1;
const V0 = 1;
const T0 = P0 * V0 / R;

function clamp(x: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, x));
}

function stateAt(theme: ThemeId, expansion: number, heat: number, nPoly: number) {
  // expansion: V/V0 for adiabatic/isothermal/polytropic; unused for isochoric
  // heat: added heat factor for isochoric (0..1 → mild..hot)
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
  // Always freefall (microgravity). Map thermo state → illustrative shader inputs.
  const tNorm = clamp(s.T / T0 / 2.2);
  const pNorm = clamp(s.P / P0 / 2.2);
  if (theme === 'adiabatic') {
    return { gravity: 0, o2: clamp(0.25 + 0.55 * tNorm), flow: 0.05, dilution: clamp(1 - tNorm) };
  }
  if (theme === 'isothermal') {
    // Lower density at large V → slightly larger, softer flame fed by diffusion
    const dens = clamp(s.P / P0);
    return { gravity: 0, o2: clamp(0.35 + 0.4 * dens), flow: 0.08 + 0.15 * (1 - dens), dilution: 0.15 };
  }
  if (theme === 'isochoric') {
    return { gravity: 0, o2: clamp(0.3 + 0.65 * tNorm), flow: 0.04, dilution: clamp(0.55 - 0.45 * pNorm) };
  }
  // polytropic: n near γ cools like adiabatic; n near 1 stays warmer
  const cool = clamp((nPoly - 1) / (GAMMA - 1));
  return {
    gravity: 0,
    o2: clamp(0.28 + 0.5 * tNorm),
    flow: 0.06,
    dilution: clamp(0.1 + 0.7 * cool * (1 - tNorm)),
  };
}

export default function FluidPhysics() {
  const [themeId, setThemeId] = useState<ThemeId>('adiabatic');
  const [expansion, setExpansion] = useState(1.6);
  const [heat, setHeat] = useState(0.55);
  const [nPoly, setNPoly] = useState(1.3);
  const [playing, setPlaying] = useState(true);

  const theme = THEMES.find(t => t.id === themeId)!;

  // Live “simulation clock”: gently oscillate the driven parameter so the flame breathes
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const t = (now - t0) / 1000;
      const wave = 0.5 + 0.5 * Math.sin(t * 0.7);
      if (themeId === 'isochoric') setHeat(0.25 + wave * 0.7);
      else if (themeId === 'polytropic') {
        setExpansion(1.15 + wave * 1.1);
        // keep n user-set; optional subtle drift disabled to avoid fighting the slider
      } else setExpansion(1.15 + wave * 1.1);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, themeId]);

  const state = useMemo(() => stateAt(themeId, expansion, heat, nPoly), [themeId, expansion, heat, nPoly]);
  const path = useMemo(() => curvePoints(themeId, expansion, heat, nPoly), [themeId, expansion, heat, nPoly]);
  const flame = useMemo(() => flameFromState(themeId, state, nPoly), [themeId, state, nPoly]);
  const marker = [{ v: +state.V.toFixed(3), p: +state.P.toFixed(3), t: +state.T.toFixed(3) }];

  return (
    <div>
      <PageHeader kicker="Fluid physics" title="How thermodynamic themes reshape flames in freefall">
        Live, illustrative simulations of adiabatic, isothermal, isochoric, and polytropic paths—and what each means for spherical microgravity flames when buoyancy is gone.
      </PageHeader>

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
              paused={!playing}
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
                onChange={v => { setPlaying(false); setHeat(v); }}
                format={v => `${Math.round(v * 100)}%`}
                hint="Pause to scrub heat release at constant volume"
              />
            ) : (
              <Slider
                label="Volume ratio V / V₀"
                value={expansion}
                min={1}
                max={2.5}
                step={0.01}
                onChange={v => { setPlaying(false); setExpansion(v); }}
                format={v => v.toFixed(2)}
                hint="Pause to scrub expansion of the hot product parcel"
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
              {themeId === 'isochoric' ? 'Pressure vs temperature at fixed volume' : 'Pressure–volume path for the selected theme'}
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
              Charts and the flame shader are educational illustrations, not a certified combustion CFD. Ideal-gas normalized units (P₀, V₀, T₀). γ = {GAMMA} for diatomic air-like gas.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
