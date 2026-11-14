import { useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Deck, { FlameStage } from '../components/Deck';
import Flame from '../components/Flame';
import { Pill, SourceChip } from '../components/ui';
import { insightFocus, useBurn, type InsightId } from '../lib/burnSession';
import { insights } from '../lib/data';
import { briefFor } from '../lib/insightBrief';
import { predict } from '../lib/knn';
import { feedingMode, physicsBrief } from '../lib/physicsBridge';
import { plainInsight } from '../lib/plainEnglish';
import { downloadReport, stamp } from '../lib/report';
import { GRAVITY, psiToAtm, scenarioById } from '../lib/scenarios';
import { rankForScenario } from '../lib/scoring';

const COMPARE_PRESETS: [string, string][] = [
  ['lunar', 'mars'],
  ['iss', 'suit'],
  ['lunar', 'iss'],
];

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
  { id: 'flex', label: 'FLEX · putting droplet fires out' },
  { id: 'cfig', label: 'CFI-G · high oxygen' },
  { id: 'bass', label: 'SAFFIRE / BASS · solid materials' },
  { id: 'psi117', label: 'PSI-117 · cabin pressure' },
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
  const [plain, setPlain] = useState(true);
  const [comparePair, setComparePair] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  if (seen !== sig) {
    setSeen(sig);
    setSection(focus.id);
  }
  const rawBrief = briefFor(section, input, result);
  const brief = plain ? plainInsight(rawBrief) : rawBrief;
  const phys = useMemo(() => physicsBrief(input), [input]);
  const feed = useMemo(() => feedingMode(input), [input]);
  const compare = useMemo(() => {
    const [aId, bId] = COMPARE_PRESETS[comparePair];
    const left = scenarioById(aId);
    const right = scenarioById(bId);
    const side = (sc: typeof left) => {
      const burn = predict({ fuel: input.fuel, o2: sc.o2, psi: sc.psi, flow: sc.flow, gravity: sc.gravity, diluent: input.diluent });
      const top = rankForScenario(sc).slice(0, 3);
      const feedMode = feedingMode({ gravity: sc.gravity, o2: sc.o2, flow: sc.flow });
      return { sc, burn, top, feedMode };
    };
    return { left: side(left), right: side(right) };
  }, [comparePair, input.fuel, input.diluent]);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-2 border-b border-white/10 px-3 py-2 lg:px-4">
        <div className="rounded-xl bg-micro-500/10 px-3 py-2 ring-1 ring-micro-500/25">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="micro">Physics brief</Pill>
            <Pill tone="slate">{feed.label}</Pill>
            <p className="text-xs text-slate-200">{phys.headline}</p>
          </div>
          <ul className="mt-1.5 hidden space-y-0.5 text-[11px] text-slate-400 sm:block">
            {phys.bullets.slice(0, 2).map(b => <li key={b}>• {b}</li>)}
          </ul>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
            {phys.links.map(l => (
              <Link key={l.to} to={l.to} className="text-micro-300 hover:underline">{l.label} →</Link>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={showCompare}
            onClick={() => setShowCompare(v => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs ${showCompare ? 'bg-flame-500/30 text-white ring-1 ring-flame-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            Compare habitats
          </button>
          {showCompare && COMPARE_PRESETS.map((pair, i) => (
            <button
              key={pair.join('-')}
              type="button"
              onClick={() => setComparePair(i)}
              className={`rounded-lg px-2.5 py-1 text-[11px] ${comparePair === i ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {scenarioById(pair[0]).short} vs {scenarioById(pair[1]).short}
            </button>
          ))}
        </div>
        {showCompare && (
          <div className="grid gap-2 sm:grid-cols-2">
            {[compare.left, compare.right].map(side => (
              <div key={side.sc.id} className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <p className="font-semibold text-white">{side.sc.name}</p>
                <p className="font-mono text-[11px] text-flame-300">{Math.round(side.sc.o2 * 100)}% O₂ · {side.sc.psi} psi · {side.sc.flow} cm/s</p>
                <p className="mt-1 text-xs text-slate-300">
                  Chance of burning: <span className="text-white">{Math.round(side.burn.p * 100)}</span>/100 · {side.burn.verdict}
                </p>
                <p className="text-[11px] text-micro-300">Feeding: {side.feedMode.label}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Top: {side.top.map(t => t.inv.acronym).join(' · ')}
                </p>
                <Link to={`/scenarios?s=${side.sc.id}`} className="mt-1 inline-block text-[11px] text-cyan-200 hover:underline">Rank this habitat →</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    <Deck
      experimentsTitle="For this test"
      graphsTitle="The NASA measurement"
      outcomeTitle="What to do"
      stage={(
        <FlameStage title="Insights" caption={brief.headline || 'What NASA’s charts say about your settings—in plain English'}>
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
              <Chart title={`FLEX: share of droplet fires that went out on their own. Your gas is ${yourGas === 'No' ? 'neither carbon dioxide nor helium' : yourGas}.`}>
                <BarChart data={dilPct}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="group" {...axis} interval={0} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis {...axis} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number, _n, item) => [`${v}% of ${(item?.payload as { n: number }).n} tests`, 'Went out alone']} />
                  <Bar dataKey="wentOut" name="Went out alone" radius={[4, 4, 0, 0]}>
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
                  <Bar dataKey="wentOut" name="Went out alone" stackId="o" fill={MICRO} />
                  <Bar dataKey="disruption" name="Disrupted" stackId="o" fill={FLAME} />
                  <Bar dataKey="burnedOut" name="Burned out" stackId="o" fill={ROSE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </Chart>
            </>
          )}
          {section === 'cfig' && (
            <Chart title={`CFI-G: how often a hot flame started, by oxygen. Your ${o2}% is in the ${yourCfig} bin.`}>
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
              <Chart tall title={`BASS-II: solid-material tests by starting oxygen. Your ${o2}% is in ${yourBassBin} (range ${insights.bass.o2Range[0]}–${insights.bass.o2Range[1]}%).`}>
                <BarChart data={bassBins}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="bin" {...axis} />
                  <YAxis {...axis} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {bassMats.map((m, i) => <Bar key={m} dataKey={m} stackId="o" fill={BASS_COLORS[i % BASS_COLORS.length]} />)}
                </BarChart>
              </Chart>
              <Chart tall title="SAFFIRE-II: how far the sample burned in orbit vs on Earth (cm). “Complete” means the full ~29 cm sample.">
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
              <Chart title={`PSI-117: droplet size when the flame went out vs pressure. Your cabin is ${atm} atmospheres.`}>
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
              <Chart title="PSI-117: average burn-speed number K vs pressure (lab data vs model).">
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
          <p className="text-[11px] text-slate-500">Orange marks your setting where relevant. Charts come from NASA insights built from PSI tables. Educational tool—not a safety certificate.</p>
        </div>
      )}
      outcome={(
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setPlain(p => !p)} className={`rounded-lg px-2.5 py-1 text-xs ${plain ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/5 text-slate-300'}`} aria-pressed={plain}>
              {plain ? 'Plain English on' : 'Plain English off'}
            </button>
            <button
              type="button"
              onClick={() => {
                const body = [
                  'FlameSight — Insights report',
                  `Generated: ${new Date().toLocaleString()}`,
                  `Section: ${SECTIONS.find(s => s.id === section)?.label || section}`,
                  `Settings: ${o2}% oxygen · ${input.psi.toFixed(1)} psi · ${input.flow} cm/s · ${GRAVITY[input.gravity].label}`,
                  '',
                  brief.headline,
                  '',
                  brief.action,
                  '',
                  ...brief.points.map(p => `• ${p}`),
                  '',
                  'Data: NASA Physical Sciences Informatics. Educational tool, not a safety certification.',
                ].join('\n');
                downloadReport(`flamesight-insights-${stamp()}.txt`, body);
              }}
              className="rounded-lg bg-flame-500/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-flame-500"
            >
              Download report
            </button>
          </div>
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
    </div>
  );
}
