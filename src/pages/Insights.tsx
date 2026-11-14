import type { ReactElement, ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { insights, stats } from '../lib/data';
import { Card, PageHeader, SourceChip, Takeaway } from '../components/ui';

const axis = { stroke: '#475569', tick: { fill: '#94a3b8', fontSize: 11 } };
const OUT_COLORS = { Extinction: '#5cb8ff', Disruption: '#facc15', Completion: '#ff7a1a' };
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

function Chart({ title, h = 'h-72', children }: { title: string; h?: string; children: ReactElement }) {
  return (<div><h3 className="mb-2 text-sm font-medium text-slate-200">{title}</h3><div className={`${h} w-full`}><ResponsiveContainer>{children}</ResponsiveContainer></div></div>);
}
function Section({ id, kicker, title, cites, children }: { id: string; kicker: string; title: string; cites: string[]; children: ReactNode }) {
  return (
    <Card className="scroll-mt-24">
      <section id={id} aria-labelledby={`${id}-h`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-mono text-xs uppercase tracking-widest text-flame-400">{kicker}</p><h2 id={`${id}-h`} className="text-xl font-semibold text-white">{title}</h2></div>
          <div className="flex flex-wrap gap-1">{cites.map(c => <SourceChip key={c} acc={c} compact />)}</div>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </Card>
  );
}

export default function Insights() {
  const f = insights.flex;
  const dilPct = f.byDiluent.map(d => ({ group: d.group, Extinction: pct(d.Extinction, d.total), Disruption: pct(d.Disruption, d.total), Completion: pct(d.Completion, d.total), n: d.total }));
  const o2Pct = f.byO2.map(d => ({ bin: d.bin, Extinction: pct(d.Extinction, d.total), Disruption: pct(d.Disruption, d.total), Completion: pct(d.Completion, d.total), n: d.total }));
  const none = f.byDiluent.find(d => d.group.startsWith('No'))!, co2 = f.byDiluent.find(d => d.group.startsWith('CO2'))!, he = f.byDiluent.find(d => d.group.startsWith('Helium'))!;
  const lowO2 = f.byO2[0], hiO2 = f.byO2[f.byO2.length - 1];

  const cf = insights.cfig.byO2.map(r => ({ ...r, Normal: r.Normal_ign, Inverse: r.Inverse_ign }));
  const cfHi = insights.cfig.byO2.find(r => r.bin === '>60%');
  const cfLo = insights.cfig.byO2.find(r => r.bin === '20–25%');
  const cfNm = insights.cfig.byO2.find(r => r.bin === '35–45%');

  const k = insights.psi117;
  const ps = Array.from(new Set([...k.hotExpt, ...k.hotModel, ...k.coolExpt, ...k.coolModel].map(x => x.p))).sort((a, b) => a - b);
  const avg = (a: { p: number; d: number }[], p: number) => { const v = a.filter(x => x.p === p).map(x => x.d); return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : undefined; };
  const kData = ps.map(p => ({ p, hotExpt: avg(k.hotExpt, p), hotModel: avg(k.hotModel, p), coolExpt: avg(k.coolExpt, p), coolModel: avg(k.coolModel, p) }));
  const cool05 = avg(k.coolExpt, 0.5), cool1 = avg(k.coolExpt, 1), hot05 = avg(k.hotExpt, 0.5), hot3 = avg(k.hotExpt, 3);

  const b = insights.bass;
  const bMats = Array.from(new Set(b.o2Bins.flatMap(r => Object.keys(r).filter(k => k !== 'bin' && k !== 'total'))));
  const sibal = insights.saffire2.filter(s => /SIBAL/i.test(s.material));
  const sil = insights.saffire2.filter(s => /Silicone/i.test(s.material));

  return (
    <div className="space-y-6">
      <PageHeader kicker="Insights" title="What the NASA data actually shows">
        Four charts straight from the test tables. Each takeaway is computed from the same rows you see in the Explorer.
      </PageHeader>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Insight sections">
        {[['flex', 'FLEX suppression'], ['bass', 'BASS / SAFFIRE solids'], ['cfig', 'CFI-G high oxygen'], ['psi117', 'PSI-117 pressure']].map(([id, l]) => <a key={id} href={`#/insights`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }} className="glass rounded-lg px-3 py-1 text-slate-300 hover:text-white">{l}</a>)}
      </nav>

      <Section id="flex" kicker="Suppression" title={`FLEX: how ${stats.flex.tests} droplet fires ended`} cites={['PSI-69']}>
        <div className="grid gap-6 lg:grid-cols-3">
          <Chart title="All FLEX outcomes">
            <PieChart><Pie data={f.outcomes} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} label={(e: { name: string; value: number }) => `${e.value}`}>
              {f.outcomes.map((o, i) => <Cell key={o.name} fill={[OUT_COLORS.Extinction, OUT_COLORS.Disruption, OUT_COLORS.Completion][i]} />)}</Pie><Tooltip /><Legend /></PieChart>
          </Chart>
          <Chart title="Outcome share by diluent gas (%)">
            <BarChart data={dilPct}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="group" {...axis} interval={0} tick={{ fill: '#94a3b8', fontSize: 10 }} /><YAxis {...axis} unit="%" domain={[0, 100]} allowDataOverflow /><Tooltip formatter={(v: number) => `${v}%`} /><Legend />
              <Bar dataKey="Extinction" name="Self-extinguished" stackId="a" fill={OUT_COLORS.Extinction} /><Bar dataKey="Disruption" stackId="a" fill={OUT_COLORS.Disruption} /><Bar dataKey="Completion" name="Burned out" stackId="a" fill={OUT_COLORS.Completion} /></BarChart>
          </Chart>
          <Chart title="Outcome share by starting O₂ (%)">
            <BarChart data={o2Pct}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="bin" {...axis} /><YAxis {...axis} unit="%" domain={[0, 100]} allowDataOverflow /><Tooltip formatter={(v: number) => `${v}%`} /><Legend />
              <Bar dataKey="Extinction" name="Self-extinguished" stackId="a" fill={OUT_COLORS.Extinction} /><Bar dataKey="Disruption" stackId="a" fill={OUT_COLORS.Disruption} /><Bar dataKey="Completion" name="Burned out" stackId="a" fill={OUT_COLORS.Completion} /></BarChart>
          </Chart>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Groups: {f.byDiluent.map(d => `${d.group} n=${d.total}`).join(' · ')} · O₂ bins: {f.byO2.map(d => `${d.bin} n=${d.total}`).join(' · ')}</p>
        <Takeaway>Flames self-extinguished in {pct(co2.Extinction, co2.total)}% of FLEX tests with CO₂ added and {pct(he.Extinction, he.total)}% with helium, versus {pct(none.Extinction, none.total)}% with neither; at {lowO2.bin} O₂, {pct(lowO2.Extinction, lowO2.total)}% self-extinguished compared with {pct(hiO2.Extinction, hiO2.total)}% above 21%.</Takeaway>
      </Section>

      <Section id="bass" kicker="Prevention · solids" title="BASS / BASS-II: what was burned, and at what oxygen" cites={['PSI-26', 'PSI-25', 'PSI-99']}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart title="Tests by material family">
            <BarChart data={b.materials} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke="#1e293b" /><XAxis type="number" {...axis} /><YAxis type="category" dataKey="material" width={120} {...axis} /><Tooltip /><Legend />
              <Bar dataKey="BASS" stackId="a" fill="#5cb8ff" /><Bar dataKey="BASS-II" stackId="a" fill="#ff9f43" radius={[0, 4, 4, 0]} /></BarChart>
          </Chart>
          <Chart title="BASS-II: tests by starting O₂ level and material">
            <BarChart data={b.o2Bins}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="bin" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip /><Legend />
              {bMats.map((m, i) => <Bar key={m} dataKey={m} stackId="o" fill={['#ff9f43', '#5cb8ff', '#34d399', '#f472b6', '#facc15', '#a78bfa'][i % 6]} />)}
            </BarChart>
          </Chart>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">The BASS and BASS-II tables in the data pack list materials, O₂ and fan settings (the fan column mixes notes and units, so we do not chart it) but not flame-spread rates, so we show test coverage; SAFFIRE-II (below) is where microgravity spread is listed.</p>
        <h3 className="mt-5 text-sm font-medium text-slate-200">SAFFIRE-II (Cygnus): microgravity burn vs the 1-g screening test</h3>
        <div className="scrollbar-thin mt-2 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-xs"><thead className="bg-space-800 text-slate-300"><tr><th className="px-3 py-2">Sample</th><th className="px-3 py-2">Material</th><th className="px-3 py-2">Thickness</th><th className="px-3 py-2">µg burn length</th><th className="px-3 py-2">µg spread</th><th className="px-3 py-2">1-g burn</th><th className="px-3 py-2">1-g spread</th></tr></thead>
            <tbody>{insights.saffire2.map(s => <tr key={s.id} className="border-t border-white/5"><td className="px-3 py-1.5 font-mono">{s.id.replace('SAFFIRE-II ', '')}</td><td className="px-3 py-1.5">{s.material}</td><td className="px-3 py-1.5">{s.thickness}</td><td className="px-3 py-1.5">{s.ug}</td><td className="px-3 py-1.5">{s.ugSpread}</td><td className="px-3 py-1.5">{s.oneG}</td><td className="px-3 py-1.5">{s.oneGSpread}</td></tr>)}</tbody></table>
        </div>
        <Takeaway>BASS-II ran {b.belowAir} of its {b.withO2} tests below normal air oxygen (range {b.o2Range[0]}–{b.o2Range[1]}%) to find where flames go out, but never above {b.o2Range[1]}%; and in SAFFIRE-II all {sil.length} silicone samples showed ~0 burn length in microgravity even though some burned completely in the 1-g test, while SIBAL fabric burned the full 29 cm ({sibal.map(s => s.ugSpread).join(', ')}) — Earth screening and orbit do not always agree.</Takeaway>
      </Section>

      <Section id="cfig" kicker="High oxygen (Moon base, suits)" title="ACME CFI-G: normal vs inverse flames across O₂" cites={['PSI-159']}>
        <Chart title="Share of tests reaching hot ignition (%), by O₂ bin">
          <BarChart data={cf}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="bin" {...axis} /><YAxis {...axis} unit="%" domain={[0, 100]} /><Tooltip formatter={(v: number, n: string, p) => [`${v}% (n=${(p.payload as Record<string, number>)[`${n}_n`]})`, `${n} flames`]} /><Legend />
            <Bar dataKey="Normal" name="Normal" fill="#ff9f43" radius={[4, 4, 0, 0]} /><Bar dataKey="Inverse" name="Inverse" fill="#5cb8ff" radius={[4, 4, 0, 0]} /></BarChart>
        </Chart>
        <p className="mt-2 text-[11px] text-slate-500">n per bin — normal: {insights.cfig.byO2.map(r => `${r.bin} ${r.Normal_n}`).join(', ')} · inverse: {insights.cfig.byO2.map(r => `${r.bin} ${r.Inverse_n}`).join(', ')}. Normal flames were not tested above 45% O₂. Small bins (n &lt; 10) are noisy.</p>
        <Takeaway>Hot ignition rose with oxygen: normal flames ignited in {cfLo?.Normal_ign}% of {cfLo?.Normal_n} tests at 20–25% O₂ but {cfNm?.Normal_ign}% of {cfNm?.Normal_n} at 35–45%, and inverse flames ignited in {cfHi?.Inverse_ign}% of {cfHi?.Inverse_n} tests above 60% O₂.</Takeaway>
      </Section>

      <Section id="psi117" kicker="Low pressure" title="PSI-117: droplet extinction diameter vs pressure (n-dodecane)" cites={['PSI-117', 'PSI-69']}>
        <Chart title="Flame-out droplet diameter (mm) vs pressure (atm); experiment = solid, model = dashed">
          <LineChart data={kData}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="p" type="number" domain={[0.4, 3.1]} {...axis} unit=" atm" /><YAxis {...axis} unit=" mm" /><Tooltip /><Legend />
            <Line dataKey="hotExpt" name="Hot flame (expt)" stroke="#ff7a1a" strokeWidth={2.5} connectNulls dot /><Line dataKey="hotModel" name="Hot flame (model)" stroke="#ff7a1a" strokeDasharray="5 4" connectNulls dot={false} />
            <Line dataKey="coolExpt" name="Cool flame (expt)" stroke="#5cb8ff" strokeWidth={2.5} connectNulls dot /><Line dataKey="coolModel" name="Cool flame (model)" stroke="#5cb8ff" strokeDasharray="5 4" connectNulls dot={false} /></LineChart>
        </Chart>
        <p className="mt-2 text-[11px] text-slate-500">Source file: {k.source.split(';')[0]}. Where two experimental points share a pressure, the chart shows their average.</p>
        <Takeaway>The hot flame went out at about the same droplet size at every pressure ({hot05} mm at 0.5 atm, {hot3} mm at 3 atm), but cool flames lasted to much smaller droplets as pressure rose ({cool05} mm at 0.5 atm vs {cool1} mm at 1 atm), so low-pressure habitats change how fuel fires end.</Takeaway>
      </Section>
    </div>
  );
}
