import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { SourceChip } from '../components/ui';
import { insightFocus, useBurn, type InsightId } from '../lib/burnSession';
import { insights } from '../lib/data';
import { briefFor } from '../lib/insightBrief';
import { GRAVITY, psiToAtm } from '../lib/scenarios';

const axis = { stroke: '#475569', tick: { fill: '#94a3b8', fontSize: 11 } };
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const FLAME = '#ff9f43';
const FLAME_DIM = '#fb923c';
const MICRO = '#5cb8ff';
const COOL = '#67e8f9';
const EMERALD = '#34d399';
const ROSE = '#fb7185';
const AMBER = '#facc15';
const VIOLET = '#a78bfa';
const BASS_COLORS = [FLAME, MICRO, EMERALD, ROSE, AMBER, VIOLET, '#2dd4bf', '#f472b6'];

const SECTIONS: { id: InsightId; label: string }[] = [
  { id: 'flex', label: 'FLEX Suppression' },
  { id: 'cfig', label: 'CFI-G High Oxygen' },
  { id: 'bass', label: 'SAFFIRE / BASS Solids' },
  { id: 'psi117', label: 'PSI-117 Pressure' },
];

/** Parse SAFFIRE burn-length strings into cm. "Complete" = full ~29 cm SIBAL sample. */
function burnCm(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = String(raw).trim();
  if (/^complete$/i.test(t)) return 29;
  const cm = t.match(/(\d+\.?\d*)\s*cm/i);
  if (cm) return +cm[1];
  if (/^~\s*0\b|^0\b/i.test(t)) return 0;
  return null;
}

function avgAt(rows: { p: number; d: number }[], p: number): number | undefined {
  const vals = rows.filter(r => r.p === p).map(r => r.d);
  if (!vals.length) return undefined;
  return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3);
}

function Chart({ title, children, tall }: { title: string; children: ReactElement; tall?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-white">{title}</h3>
      <div className={`${tall ? 'h-52' : 'h-44'} w-full`}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
  );
}

export default function Insights() {
  const { input, result } = useBurn();
  const focus = insightFocus(input);
  const sig = [input.fuel, input.o2, input.psi, input.flow, input.gravity, input.diluent].join('|');
  const [section, setSection] = useState<InsightId>(focus.id);
  const [seen, setSeen] = useState(sig);
  if (seen !== sig) {
    setSeen(sig);
    setSection(focus.id);
  }
  const brief = briefFor(section, input, result);
  const o2 = Math.round(input.o2 * 100);
  const f = insights.flex;

  // FLEX: diluent suppression + oxygen-bin outcomes (from insights.json / build-data)
  const dilPct = f.byDiluent.map(d => ({
    group: d.group.replace(' (O2 + N2)', ''),
    wentOut: pct(d.Extinction, d.total),
    disruption: pct(d.Disruption, d.total),
    burnedOut: pct(d.Completion, d.total),
    n: d.total,
  }));
  const yourGas = input.diluent === 'CO2' ? 'CO2' : input.diluent === 'He' ? 'Helium' : 'No';
  const flexO2 = f.byO2.map(d => ({
    bin: d.bin,
    wentOut: pct(d.Extinction, d.total),
    disruption: pct(d.Disruption, d.total),
    burnedOut: pct(d.Completion, d.total),
    n: d.total,
  }));
  const yourFlexO2 = o2 <= 15 ? '≤15%' : o2 <= 18 ? '16–18%' : o2 <= 21 ? '19–21%' : '>21%';

  // CFI-G: ignition % only where that flame type was tested (null → omit as 0 with n=0 tooltip)
  const cf = insights.cfig.byO2.map(r => {
    const bin = String(r.bin);
    const nN = Number(r.Normal_n) || 0;
    const nI = Number(r.Inverse_n) || 0;
    return {
      bin,
      Normal: nN ? Number(r.Normal_ign) || 0 : null,
      Inverse: nI ? Number(r.Inverse_ign) || 0 : null,
      nN,
      nI,
    };
  });
  const yourCfig = o2 < 20 ? '<20%' : o2 <= 25 ? '20–25%' : o2 <= 35 ? '25–35%' : o2 <= 45 ? '35–45%' : o2 <= 60 ? '45–60%' : '>60%';

  // BASS-II stacked counts by O₂ bin + material
  const bassBins = insights.bass.o2Bins;
  const bassMats = Array.from(new Set(bassBins.flatMap(r => Object.keys(r).filter(k => k !== 'bin' && k !== 'total'))));
  const yourBassBin = o2 < 15 ? '<15%' : o2 < 17 ? '15–17%' : o2 < 19 ? '17–19%' : o2 < 21 ? '19–21%' : '≥21%';

  // SAFFIRE-II orbit vs Earth burn length (cm)
  const saff = insights.saffire2.map((s, i) => {
    const label = (s.material && !/not listed/i.test(s.material) ? s.material : s.id.replace('SAFFIRE-II ', '')).replace('Cotton-Fiberglass (SIBAL)', 'SIBAL');
    const short = label.length > 14 ? `${label.slice(0, 13)}…` : label;
    return {
      id: short,
      full: `${s.id}: ${s.material}`,
      orbit: burnCm(s.ug),
      earth: burnCm(s.oneG),
      i,
    };
  }).filter(s => s.orbit !== null || s.earth !== null);

  // PSI-117: average duplicate cool-flame points at the same pressure
  const k = insights.psi117;
  const pressures = Array.from(new Set([...k.hotExpt, ...k.coolExpt].map(p => p.p))).sort((a, b) => a - b);
  const kData = pressures.map(p => ({ p, hot: avgAt(k.hotExpt, p), cool: avgAt(k.coolExpt, p) }));
  const kRatePs = Array.from(new Set(k.kavgExpt.map(x => x.p))).sort((a, b) => a - b);
  const kRate = kRatePs.map(p => {
    const vals = k.kavgExpt.filter(x => x.p === p).map(x => x.k);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const model = k.kbModel.find(m => m.p === p)?.k;
    return { p, expt: +avg.toFixed(3), model: model != null ? +model.toFixed(3) : undefined };
  });
  const atm = +psiToAtm(input.psi).toFixed(2);

  return (
    <Deck
      experimentsTitle="For this test"
      graphsTitle="The NASA measurement"
      outcomeTitle="What to do"
      stage={(
        <FlameStage title="Insights" caption={brief.headline}>
          <Flame gravity={GRAVITY[input.gravity].flame} o2={Math.max(0, Math.min(1, (input.o2 - 0.12) / 0.6))} flow={Math.max(0, Math.min(1, input.flow / 40))} dilution={input.diluent === 'none' ? 0 : 0.55} className="h-full w-full" label="Insights flame for the current Will It Burn settings" />
        </FlameStage>
      )}
      experiments={(
        <div>
          <p className="text-sm text-white">{o2}% oxygen · {input.psi.toFixed(1)} psi · {input.flow} cm/s · {GRAVITY[input.gravity].label}</p>
          <p className="mt-1 text-xs text-slate-400">{input.fuel === 'any' ? 'Any fuel' : input.fuel} · {input.diluent === 'none' ? 'no suppressant gas' : input.diluent === 'CO2' ? 'CO₂ added' : 'helium added'}</p>
          <div className="mt-3 flex flex-col gap-1" role="tablist" aria-label="Which question">
            {SECTIONS.map(s => (
              <button key={s.id} type="button" role="tab" aria-selected={section === s.id} onClick={() => setSection(s.id)} className={`rounded-lg px-2 py-1.5 text-left text-sm ${section === s.id ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>
                {s.label}{s.id === focus.id ? ' · best match' : ''}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            {brief.points.slice(0, 3).map(p => <li key={p}>{p}</li>)}
          </ul>
          <Link to="/" className="mt-3 inline-block text-xs text-cyan-200 hover:text-white">Change the test in Will It Burn</Link>
        </div>
      )}
      graphs={(
        <div className="space-y-5">
          {section === 'flex' && (
            <>
              <Chart title={`FLEX: share of droplet fires that self-extinguished. Your gas is ${yourGas === 'No' ? 'neither CO₂ nor He' : yourGas}.`}>
                <BarChart data={dilPct}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="group" {...axis} interval={0} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis {...axis} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number, _n, item) => [`${v}% of ${(item?.payload as { n: number }).n} tests`, 'Self-extinguished']} />
                  <Bar dataKey="wentOut" name="Self-extinguished" radius={[4, 4, 0, 0]}>
                    {dilPct.map(d => <Cell key={d.group} fill={d.group.startsWith(yourGas) ? FLAME : MICRO} />)}
                  </Bar>
                </BarChart>
              </Chart>
              <Chart title={`FLEX: outcomes by starting oxygen. Your ${o2}% is in ${yourFlexO2}.`}>
                <BarChart data={flexO2}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="bin" {...axis} />
                  <YAxis {...axis} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number, name: string, item) => [`${v}% of ${(item?.payload as { n: number }).n}`, name]} />
                  <Legend />
                  <Bar dataKey="wentOut" name="Self-extinguished" stackId="o" fill={MICRO} />
                  <Bar dataKey="disruption" name="Disruption" stackId="o" fill={FLAME} />
                  <Bar dataKey="burnedOut" name="Burned out" stackId="o" fill={ROSE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </Chart>
            </>
          )}
          {section === 'cfig' && (
            <Chart title={`CFI-G: hot-ignition rate by oxygen. Your ${o2}% is in the ${yourCfig} bin.`}>
              <BarChart data={cf}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="bin" {...axis} />
                <YAxis {...axis} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v, name, item) => {
                  const p = item?.payload as { nN: number; nI: number };
                  if (v == null || Number.isNaN(Number(v))) return ['no tests', String(name)];
                  const n = String(name).startsWith('Normal') ? p.nN : p.nI;
                  return [`${v}% of ${n} tests`, String(name)];
                }} />
                <Legend />
                <Bar dataKey="Normal" name="Normal flame" radius={[4, 4, 0, 0]}>
                  {cf.map(d => <Cell key={`n-${d.bin}`} fill={d.Normal == null ? 'transparent' : d.bin === yourCfig ? FLAME : FLAME_DIM} />)}
                </Bar>
                <Bar dataKey="Inverse" name="Inverse flame" radius={[4, 4, 0, 0]}>
                  {cf.map(d => <Cell key={`i-${d.bin}`} fill={d.Inverse == null ? 'transparent' : d.bin === yourCfig ? COOL : MICRO} />)}
                </Bar>
              </BarChart>
            </Chart>
          )}
          {section === 'bass' && (
            <>
              <Chart tall title={`BASS-II: solid-material tests by starting O₂. Your ${o2}% is in ${yourBassBin} (range ${insights.bass.o2Range[0]}–${insights.bass.o2Range[1]}%).`}>
                <BarChart data={bassBins}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="bin" {...axis} />
                  <YAxis {...axis} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {bassMats.map((m, i) => <Bar key={m} dataKey={m} stackId="o" fill={BASS_COLORS[i % BASS_COLORS.length]} />)}
                </BarChart>
              </Chart>
              <Chart tall title="SAFFIRE-II: burn length in orbit vs on Earth (cm). Complete → 29 cm full sample.">
                <BarChart data={saff} margin={{ bottom: 8 }}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="id" {...axis} interval={0} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis {...axis} unit=" cm" domain={[0, 32]} />
                  <Tooltip labelFormatter={(_, payload) => (payload?.[0]?.payload as { full?: string })?.full || ''} formatter={(v, name) => [v == null || Number.isNaN(Number(v)) ? 'not listed' : `${v} cm`, String(name)]} />
                  <Legend />
                  <Bar dataKey="orbit" name="Orbit (µg)" fill={MICRO} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="earth" name="Earth (1-g)" fill={FLAME} radius={[4, 4, 0, 0]} />
                </BarChart>
              </Chart>
            </>
          )}
          {section === 'psi117' && (
            <>
              <Chart title={`PSI-117: droplet extinction diameter vs pressure. Your cabin is ${atm} atm.`}>
                <LineChart data={kData}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="p" type="number" domain={[0.4, 3.1]} {...axis} unit=" atm" />
                  <YAxis {...axis} unit=" mm" domain={[0, 'auto']} />
                  <Tooltip formatter={(v: number) => [`${v} mm`, '']} />
                  <Legend />
                  <ReferenceLine x={atm} stroke={FLAME} strokeDasharray="4 3" label={{ value: 'you', fill: FLAME, fontSize: 10 }} />
                  <Line dataKey="hot" name="Hot flame (expt)" stroke={FLAME} strokeWidth={2.5} connectNulls dot />
                  <Line dataKey="cool" name="Cool flame (expt)" stroke={MICRO} strokeWidth={2.5} connectNulls dot />
                </LineChart>
              </Chart>
              <Chart title="PSI-117: average burning-rate constant K vs pressure (experiment vs model).">
                <LineChart data={kRate}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="p" type="number" domain={[0.4, 5.2]} {...axis} unit=" atm" />
                  <YAxis {...axis} domain={[0, 'auto']} />
                  <Tooltip formatter={(v: number) => [v, '']} />
                  <Legend />
                  <ReferenceLine x={atm} stroke={FLAME} strokeDasharray="4 3" label={{ value: 'you', fill: FLAME, fontSize: 10 }} />
                  <Line dataKey="expt" name="K experiment" stroke={FLAME} strokeWidth={2.5} connectNulls dot />
                  <Line dataKey="model" name="K model" stroke={MICRO} strokeWidth={2} strokeDasharray="5 4" connectNulls dot />
                </LineChart>
              </Chart>
            </>
          )}
          <p className="text-[11px] text-slate-500">Orange marks your setting where relevant. Charts read from the built NASA insights JSON (regenerated from PSI CSVs in git).</p>
        </div>
      )}
      outcome={(
        <>
          <p className="text-base font-semibold text-white">{brief.headline}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{brief.action}</p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            {brief.points.slice(3).map(p => <li key={p}>{p}</li>)}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1">
            {(section === 'flex' ? ['PSI-69'] : section === 'cfig' ? ['PSI-159'] : section === 'bass' ? ['PSI-25', 'PSI-99'] : ['PSI-117']).map(acc => <SourceChip key={acc} acc={acc} compact />)}
          </div>
        </>
      )}
    />
  );
}
