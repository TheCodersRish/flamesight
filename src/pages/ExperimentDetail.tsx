import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import Flame from '../components/Flame';
import { byAccession, fmt, insights, loadTables, loadTests } from '../lib/data';
import { extinctionWalkthrough, fluidPhysicsHref, fluidPresetsFor, walkthroughKind } from '../lib/physicsBridge';
import type { RawTable, TestRecord } from '../lib/types';
import { Card, PageHeader, Pill, TierBadge } from '../components/ui';

const COLORS = ['#ff9f43', '#5cb8ff', '#34d399', '#f472b6', '#facc15', '#a78bfa', '#fb7185', '#2dd4bf'];
const axis = { stroke: '#475569', tick: { fill: '#94a3b8', fontSize: 11 } };

function TestChart({ acc, tests, tables }: { acc: string; tests: TestRecord[]; tables: RawTable[] }) {
  const rows = tests.filter(t => t.inv === acc);
  if (acc === 'PSI-117') {
    const k = insights.psi117;
    const ps = Array.from(new Set([...k.hotExpt, ...k.coolExpt].map(x => x.p))).sort((a, b) => a - b);
    const data = ps.map(p => ({ p, hot: k.hotExpt.find(x => x.p === p)?.d, cool: k.coolExpt.filter(x => x.p === p).map(x => x.d)[0] }));
    return (
      <ChartBox title="Droplet extinction diameter vs pressure (n-dodecane, experiment)" note={`Source: ${k.source.split(';')[0]}`}>
        <LineChart data={data}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="p" {...axis} label={{ value: 'pressure (atm)', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 11 }} /><YAxis {...axis} label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} /><Tooltip /><Legend />
          <Line dataKey="hot" name="hot-flame extinction diameter" stroke="#ff9f43" strokeWidth={2} connectNulls /><Line dataKey="cool" name="cool-flame extinction diameter" stroke="#5cb8ff" strokeWidth={2} connectNulls /></LineChart>
      </ChartBox>
    );
  }
  const withO2P = rows.filter(r => r.o2 !== null && r.pAtm !== null);
  if (withO2P.length > 5) {
    const groups = groupBy(withO2P, r => (r.outcome ? simpleOutcome(r) : r.fuel));
    return (
      <ChartBox title={`Each dot is one test: oxygen vs pressure, colored by ${withO2P[0].outcome ? 'outcome' : 'fuel'}`} note={`${withO2P.length} tests with O₂ and pressure listed`}>
        <ScatterChart margin={{ bottom: 10 }}><CartesianGrid stroke="#1e293b" /><XAxis type="number" dataKey="x" name="O₂ %" unit="%" {...axis} domain={['auto', 'auto']} /><YAxis type="number" dataKey="y" name="pressure" unit=" atm" {...axis} domain={['auto', 'auto']} /><ZAxis range={[28, 28]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Legend />
          {Object.entries(groups).map(([k, v], i) => <Scatter key={k} name={k} data={v.map(r => ({ x: +(r.o2! * 100).toFixed(2), y: r.pAtm }))} fill={COLORS[i % COLORS.length]} fillOpacity={0.75} />)}
        </ScatterChart>
      </ChartBox>
    );
  }
  if (acc === 'PSI-25') {
    const d = insights.bass.o2Bins; const mats = Array.from(new Set(d.flatMap(r => Object.keys(r).filter(k => k !== 'bin' && k !== 'total'))));
    return (
      <ChartBox title="BASS-II: tests by starting O₂ level and material" note="Calibrated initial O₂ column. The table has no flame-spread column, and its fan column mixes notes and units, so it is not charted.">
        <BarChart data={d}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="bin" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip /><Legend />
          {mats.map((m, i) => <Bar key={m} dataKey={m} stackId="o" fill={COLORS[i % COLORS.length]} />)}
        </BarChart>
      </ChartBox>
    );
  }
  const daily = tables.find(t => t.kind === 'daily');
  if (daily) {
    const ci = daily.header.findIndex(h => /flames ignited/i.test(h));
    if (ci >= 0) {
      const fc = daily.header.findIndex(h => /fuel bottle/i.test(h));
      const data = daily.rows.map((r, i) => ({ day: `Day ${i + 1}`, n: parseFloat(r[ci]) || 0, fuel: fc >= 0 ? r[fc] : '' }));
      return (
        <ChartBox title="Flames ignited per test day" note={`From the "${daily.header[ci]}" column`}>
          <BarChart data={data}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="day" {...axis} interval={Math.ceil(data.length / 12)} /><YAxis {...axis} /><Tooltip formatter={(v: number, _n, p) => [`${v} flames (${(p.payload as { fuel: string }).fuel})`, 'ignited']} /><Bar dataKey="n" fill="#ff9f43" radius={[4, 4, 0, 0]} /></BarChart>
        </ChartBox>
      );
    }
  }
  if (rows.length > 1) {
    const counts = Object.entries(groupBy(rows, r => r.fuel || 'not listed')).map(([k, v]) => ({ k: k.length > 28 ? k.slice(0, 27) + '…' : k, n: v.length })).sort((a, b) => b.n - a.n).slice(0, 12);
    const flows = rows.filter(r => r.flow !== null);
    return (
      <ChartBox title="Tests by fuel / material" note={flows.length ? `Airflow listed for ${flows.length} tests: ${fmt.num(Math.min(...flows.map(r => r.flow!)), 1)}–${fmt.num(Math.max(...flows.map(r => r.flow!)), 1)} cm/s` : 'Counts of rows in the test table'}>
        <BarChart data={counts} layout="vertical" margin={{ left: 40 }}><CartesianGrid stroke="#1e293b" /><XAxis type="number" {...axis} /><YAxis type="category" dataKey="k" width={170} {...axis} /><Tooltip /><Bar dataKey="n" name="tests" fill="#5cb8ff" radius={[0, 4, 4, 0]} /></BarChart>
      </ChartBox>
    );
  }
  return <p className="text-sm text-slate-400">This investigation has no per-test table in the data pack{tables.length ? ' (see the table below)' : ''}, so there is no chart.</p>;
}

function ChartBox({ title, note, children }: { title: string; note?: string; children: ReactElement }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-white">{title}</h3>
      <div className="h-72 w-full"><ResponsiveContainer>{children}</ResponsiveContainer></div>
      {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}
function groupBy<T>(a: T[], f: (x: T) => string): Record<string, T[]> { return a.reduce((m, x) => ((m[f(x)] ||= []).push(x), m), {} as Record<string, T[]>); }
function simpleOutcome(r: TestRecord): string {
  if (r.burn === null) return r.outcome || 'unknown';
  if (r.burn >= 1) return 'kept burning / burned out';
  if (r.burn >= 0.8) return 'droplet disruption';
  if (r.burn >= 0.5) return 'ignited, self-extinguished';
  if (r.burn > 0) return 'flash only';
  return 'no ignition';
}

function DataTable({ table }: { table: RawTable }) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [asc, setAsc] = useState(true);
  const [limit, setLimit] = useState(40);
  const rows = useMemo(() => {
    if (sortCol === null) return table.rows;
    const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
    return [...table.rows].sort((a, b) => {
      const x = a[sortCol] ?? '', y = b[sortCol] ?? '';
      const nx = num(x), ny = num(y);
      const c = nx !== null && ny !== null ? nx - ny : x.localeCompare(y);
      return asc ? c : -c;
    });
  }, [table, sortCol, asc]);
  return (
    <div>
      <div className="scrollbar-thin max-h-[480px] overflow-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 bg-space-800">
            <tr>{table.header.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">
                <button onClick={() => { if (sortCol === i) setAsc(!asc); else { setSortCol(i); setAsc(true); } }} className="hover:text-white" aria-label={`Sort by ${h}`}>
                  {h || '—'} {sortCol === i ? (asc ? '▲' : '▼') : ''}
                </button>
              </th>))}</tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r, i) => (
              <tr key={i} className="border-t border-white/5 odd:bg-white/[0.02]">{r.map((c, j) => <td key={j} className="max-w-[260px] truncate whitespace-nowrap px-3 py-1.5 text-slate-300" title={c}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {Math.min(limit, rows.length)} of {rows.length} rows (original NASA table, unmodified values)</span>
        {limit < rows.length && <button className="rounded bg-white/10 px-2 py-1 text-slate-200 hover:bg-white/20" onClick={() => setLimit(l => l + 100)}>Show more</button>}
      </div>
    </div>
  );
}

export default function ExperimentDetail() {
  const { acc = '' } = useParams();
  const inv = byAccession[acc];
  const [tables, setTables] = useState<RawTable[] | null>(null);
  const [tests, setTests] = useState<TestRecord[] | null>(null);
  const [tab, setTab] = useState(0);
  const [walkStep, setWalkStep] = useState(0);
  const [walkPlaying, setWalkPlaying] = useState(true);
  const walkKind = inv ? walkthroughKind(inv.accession, inv.acronym) : null;
  const walk = useMemo(() => (walkKind ? extinctionWalkthrough(walkKind) : null), [walkKind]);
  useEffect(() => { setTab(0); setWalkStep(0); setWalkPlaying(true); loadTables().then(t => setTables(t[acc] || [])); loadTests().then(setTests); }, [acc]);
  useEffect(() => {
    if (!walk || !walkPlaying) return;
    const len = walk.length;
    const id = window.setInterval(() => setWalkStep(s => (s + 1) % len), 2200);
    return () => window.clearInterval(id);
  }, [walk, walkPlaying]);
  if (!inv) return <p>Unknown investigation. <Link className="underline" to="/explorer">Back to Explorer</Link></p>;
  const e = inv.envelope;
  const presets = fluidPresetsFor(inv);
  const step = walk?.[walkStep];

  return (
    <div>
      <Link to="/explorer" className="text-sm text-slate-400 hover:text-white">← All experiments</Link>
      <div className="mt-3">
        <PageHeader kicker={`${inv.accession} · ${inv.platform}`} title={inv.hasAcronym ? `${inv.acronym}: ${inv.title}` : inv.title}>
          <div className="flex flex-wrap gap-2"><TierBadge tier={inv.tier} label={inv.tierLabel} /><Pill tone="flame">{inv.role}</Pill>{inv.start && <Pill>{inv.start}{inv.end ? ` → ${inv.end}` : ''}</Pill>}<Pill>{fmt.num(inv.sizeGB, 1)} GB · {inv.files?.toLocaleString()} files</Pill></div>
        </PageHeader>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs text-slate-400 self-center">Open in Fluid Physics:</span>
        {presets.map(p => (
          <Link key={p.to + p.label} to={p.to} title={p.why} className="rounded-lg bg-micro-500/20 px-3 py-1.5 text-xs text-micro-100 ring-1 ring-micro-500/40 hover:bg-micro-500/30">
            {p.label} →
          </Link>
        ))}
      </div>
      {walk && step && (
        <Card className="mb-4" glow="flame">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-flame-300">Why it went out</h2>
              <p className="mt-1 text-sm text-slate-300">Guided path: oxygen & heat → glow loss, using the Fluid Physics models.</p>
            </div>
            <button type="button" onClick={() => setWalkPlaying(p => !p)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/20">
              {walkPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1.1fr]">
            <div className="overflow-hidden rounded-xl bg-space-950/80 ring-1 ring-white/10">
              <Flame {...step.flame} className="h-48 w-full" label={`Walkthrough: ${step.label}`} />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Extinction walkthrough steps">
                {walk.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    role="tab"
                    aria-selected={i === walkStep}
                    onClick={() => { setWalkPlaying(false); setWalkStep(i); }}
                    className={`rounded-lg px-2.5 py-1 text-xs ${i === walkStep ? 'bg-flame-500/30 text-white ring-1 ring-flame-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    {i + 1}. {s.label}
                  </button>
                ))}
              </div>
              <p className="text-base font-semibold text-white">{step.label}</p>
              <p className="mt-1 text-sm text-slate-300">{step.blurb}</p>
              <Link to={fluidPhysicsHref(step.mech)} className="mt-3 inline-block text-sm text-micro-300 hover:underline">
                Open {step.mech === 'radiation' ? 'glow heat loss' : step.mech} model →
              </Link>
            </div>
          </div>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-micro-300">Plain-English summary</h2>
          <p className="mt-2 text-slate-200">{inv.summary}</p>
          <h2 className="mt-5 text-sm font-semibold uppercase tracking-widest text-flame-300">Why it matters for fire safety</h2>
          <p className="mt-2 text-slate-200">{inv.why}</p>
          <p className="mt-4 text-[11px] text-slate-500">Summary written by the FlameSight team with AI assistance from the NASA PSI objectives field for {inv.accession}. <a className="underline" href={inv.psiPage} target="_blank" rel="noreferrer">Read the original on psi.nasa.gov ↗</a></p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Tested conditions</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-slate-400">Oxygen</dt><dd className="font-mono text-white">{fmt.range(e.o2, v => `${(v * 100).toFixed(1)}%`)}</dd>{e.sources.o2 && <dd className="text-[11px] text-slate-500">{e.sources.o2}</dd>}</div>
            <div><dt className="text-slate-400">Pressure</dt><dd className="font-mono text-white">{fmt.range(e.pAtm, v => `${v.toFixed(2)} atm (${(v * 14.696).toFixed(1)} psi)`)}</dd>{e.sources.pAtm && <dd className="text-[11px] text-slate-500">{e.sources.pAtm}</dd>}</div>
            <div><dt className="text-slate-400">Airflow</dt><dd className="font-mono text-white">{fmt.range(e.flow, v => `${v} cm/s`)}</dd>{e.sources.flow && <dd className="text-[11px] text-slate-500">{e.sources.flow}</dd>}</div>
            <div><dt className="text-slate-400">Test count</dt><dd className="font-mono text-white">{inv.count ? `${inv.count.count.toLocaleString()} ${inv.count.unit}` : 'no test table'}</dd>{inv.count && <dd className="text-[11px] text-slate-500">{inv.count.basis}</dd>}</div>
            <div><dt className="text-slate-400">Hardware</dt><dd className="text-slate-200">{inv.hardware || 'not listed'}</dd></div>
          </dl>
          <a href={inv.psiPage} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg bg-micro-500/20 px-3 py-1.5 text-sm text-micro-300 ring-1 ring-micro-500/40 hover:bg-micro-500/30">Source: {inv.accession} on psi.nasa.gov ↗</a>
        </Card>
      </div>
      <Card className="mt-4">
        {tests && tables ? <TestChart acc={acc} tests={tests} tables={tables} /> : <p className="text-sm text-slate-400">Loading test data…</p>}
      </Card>
      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-300">Test table</h2>
        {!tables ? <p className="text-sm text-slate-400">Loading…</p> : tables.length === 0 ? <p className="text-sm text-slate-400">No test table for this investigation in the data pack. See the PSI page for its files.</p> : (
          <>
            {tables.length > 1 && <div className="mb-3 flex flex-wrap gap-2" role="tablist">{tables.map((t, i) => <button key={t.name} role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className={`rounded-lg px-3 py-1 text-xs ${tab === i ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}>{t.name}</button>)}</div>}
            <DataTable key={`${acc}-${tab}`} table={tables[tab]} />
          </>
        )}
      </Card>
    </div>
  );
}
