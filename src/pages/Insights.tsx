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
const SECTIONS: { id: InsightId; label: string }[] = [
  { id: 'flex', label: 'Will a gas put it out?' },
  { id: 'cfig', label: 'Does more oxygen light it?' },
  { id: 'bass', label: 'Will a solid keep burning?' },
  { id: 'psi117', label: 'Does pressure change the end?' },
];

function Chart({ title, children }: { title: string; children: ReactElement }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-white">{title}</h3>
      <div className="h-44 w-full"><ResponsiveContainer>{children}</ResponsiveContainer></div>
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
  const dilPct = f.byDiluent.map(d => ({
    group: d.group.replace(' (O2 + N2)', ''),
    wentOut: pct(d.Extinction, d.total),
    n: d.total,
  }));
  const yourGas = input.diluent === 'CO2' ? 'CO2' : input.diluent === 'He' ? 'Helium' : 'No';
  const cf = insights.cfig.byO2.map(r => ({ bin: String(r.bin), Normal: Number(r.Normal_ign) || 0, Inverse: Number(r.Inverse_ign) || 0 }));
  const yourCfig = o2 < 20 ? '<20%' : o2 <= 25 ? '20–25%' : o2 <= 35 ? '25–35%' : o2 <= 45 ? '35–45%' : o2 <= 60 ? '45–60%' : '>60%';
  const k = insights.psi117;
  const pressures = Array.from(new Set([...k.hotExpt, ...k.coolExpt].map(p => p.p))).sort((a, b) => a - b);
  const at = (rows: { p: number; d: number }[], p: number) => rows.find(r => r.p === p)?.d;
  const kData = pressures.map(p => ({ p, hot: at(k.hotExpt, p), cool: at(k.coolExpt, p) }));
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
        <div className="space-y-2">
          {section === 'flex' && (
            <Chart title={`Share of FLEX droplet fires that went out. Your gas is ${yourGas === 'No' ? 'neither' : yourGas}.`}>
              <BarChart data={dilPct}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="group" {...axis} interval={0} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis {...axis} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number, _n, item) => [`${v}% of ${(item?.payload as { n: number }).n} tests`, 'Went out']} />
                <Bar dataKey="wentOut" name="Went out" radius={[4, 4, 0, 0]}>
                  {dilPct.map(d => <Cell key={d.group} fill={d.group.startsWith(yourGas) ? '#ff9f43' : '#5cb8ff'} />)}
                </Bar>
              </BarChart>
            </Chart>
          )}
          {section === 'cfig' && (
            <Chart title={`Hot ignition by oxygen. Your ${o2}% is in the ${yourCfig} bin.`}>
              <BarChart data={cf}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="bin" {...axis} />
                <YAxis {...axis} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Ignited']} />
                <Legend />
                <Bar dataKey="Normal" name="Normal flame" radius={[4, 4, 0, 0]}>
                  {cf.map(d => <Cell key={`n-${d.bin}`} fill={d.bin === yourCfig ? '#ff9f43' : '#fb923c'} />)}
                </Bar>
                <Bar dataKey="Inverse" name="Inverse flame" radius={[4, 4, 0, 0]}>
                  {cf.map(d => <Cell key={`i-${d.bin}`} fill={d.bin === yourCfig ? '#67e8f9' : '#5cb8ff'} />)}
                </Bar>
              </BarChart>
            </Chart>
          )}
          {section === 'bass' && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-white">SAFFIRE-II: the same material in orbit and on Earth</h3>
              <div className="scrollbar-thin overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-400"><tr><th className="py-1 pr-2">Material</th><th className="py-1 pr-2">Orbit burn</th><th className="py-1">Earth burn</th></tr></thead>
                  <tbody>
                    {insights.saffire2.map(s => (
                      <tr key={s.id} className="border-t border-white/5">
                        <td className="py-1 pr-2 text-slate-200">{s.material}</td>
                        <td className="py-1 pr-2">{s.ug}</td>
                        <td className="py-1">{s.oneG}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {section === 'psi117' && (
            <Chart title={`Droplet size at flame-out. Your pressure is ${atm} atm.`}>
              <LineChart data={kData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="p" type="number" domain={[0.4, 3.1]} {...axis} unit=" atm" />
                <YAxis {...axis} unit=" mm" />
                <Tooltip />
                <Legend />
                <ReferenceLine x={atm} stroke="#ff9f43" strokeDasharray="4 3" label={{ value: 'you', fill: '#ff9f43', fontSize: 10 }} />
                <Line dataKey="hot" name="Hot flame" stroke="#ff7a1a" strokeWidth={2.5} connectNulls dot />
                <Line dataKey="cool" name="Cool flame" stroke="#5cb8ff" strokeWidth={2.5} connectNulls dot />
              </LineChart>
            </Chart>
          )}
          <p className="text-[11px] text-slate-500">Orange marks your setting. Numbers are counted from the NASA test tables.</p>
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
