import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CabinStrip from '../components/CabinStrip';
import { Card, PageHeader, Pill, SourceChip } from '../components/ui';
import { CASE_STUDIES } from '../lib/caseStudies';
import { investigations, invLabel } from '../lib/data';
import { allMissionGaps, gapsForScenario, nextTestsToRun } from '../lib/gaps';
import { predict } from '../lib/knn';
import { buildMissionReport } from '../lib/missionReport';
import { fetchNtrsPapers, ntrsSearchUrl, queryFor, type NtrsPaper } from '../lib/ntrs';
import { downloadReport, stamp } from '../lib/report';
import { GRAVITY, SCENARIOS, scenarioById, scenarioGravityLabel, type Scenario } from '../lib/scenarios';
import { rankForScenario } from '../lib/scoring';

type Tab = 'gaps' | 'report' | 'compare' | 'papers' | 'cases';

const axis = { stroke: '#475569', tick: { fill: '#94a3b8', fontSize: 11 } };

const statusTone = (s: 'covered' | 'thin' | 'missing') =>
  s === 'covered' ? 'green' as const : s === 'thin' ? 'amber' as const : 'red' as const;

export default function Impact() {
  const [tab, setTab] = useState<Tab>('gaps');
  const [missionId, setMissionId] = useState(SCENARIOS[1]?.id || 'lunar');
  const [compareLeft, setCompareLeft] = useState('lunar');
  const [compareRight, setCompareRight] = useState('iss');
  const [mode, setMode] = useState<'habitats' | 'experiments'>('habitats');
  const [expA, setExpA] = useState('PSI-69');
  const [expB, setExpB] = useState('PSI-99');
  const [paperAcc, setPaperAcc] = useState('PSI-69');
  const [papers, setPapers] = useState<NtrsPaper[]>([]);
  const [paperStatus, setPaperStatus] = useState<'idle' | 'loading' | 'live' | 'curated'>('idle');

  const mission = scenarioById(missionId);
  const missionGaps = useMemo(() => gapsForScenario(mission), [mission]);
  const allGaps = useMemo(() => allMissionGaps(SCENARIOS), []);
  const nextTests = useMemo(() => nextTestsToRun(SCENARIOS).slice(0, 6), []);

  const habitatCompare = useMemo(() => {
    const side = (sc: Scenario) => {
      const burn = predict({ fuel: 'any', o2: sc.o2, psi: sc.psi, flow: sc.flow, gravity: sc.gravity, diluent: 'none' });
      const top = rankForScenario(sc).slice(0, 3);
      return { sc, burn, top };
    };
    return { left: side(scenarioById(compareLeft)), right: side(scenarioById(compareRight)) };
  }, [compareLeft, compareRight]);

  const chartRows = useMemo(() => {
    const L = habitatCompare.left;
    const R = habitatCompare.right;
    return [
      { metric: 'Burn score', a: Math.round(L.burn.p * 100), b: Math.round(R.burn.p * 100) },
      { metric: 'Band low', a: Math.round(L.burn.band[0] * 100), b: Math.round(R.burn.band[0] * 100) },
      { metric: 'Band high', a: Math.round(L.burn.band[1] * 100), b: Math.round(R.burn.band[1] * 100) },
      { metric: 'O₂ %', a: Math.round(L.sc.o2 * 100), b: Math.round(R.sc.o2 * 100) },
      { metric: 'Pressure psi', a: L.sc.psi, b: R.sc.psi },
      { metric: 'Flow cm/s', a: L.sc.flow, b: R.sc.flow },
    ];
  }, [habitatCompare]);

  const expCompare = useMemo(() => {
    const a = investigations.find(i => i.accession === expA);
    const b = investigations.find(i => i.accession === expB);
    if (!a || !b) return null;
    const row = (inv: typeof a) => ({
      inv,
      o2: inv.envelope.o2 ? [inv.envelope.o2[0] * 100, inv.envelope.o2[1] * 100] as [number, number] : null,
      p: inv.envelope.pAtm,
      flow: inv.envelope.flow,
      tests: inv.count?.count ?? 0,
    });
    return { left: row(a), right: row(b) };
  }, [expA, expB]);

  useEffect(() => {
    let cancelled = false;
    setPaperStatus('loading');
    const inv = investigations.find(i => i.accession === paperAcc);
    void fetchNtrsPapers(paperAcc, inv?.acronym).then(list => {
      if (cancelled) return;
      setPapers(list);
      setPaperStatus(list.some(p => p.source === 'ntrs') ? 'live' : 'curated');
    });
    return () => { cancelled = true; };
  }, [paperAcc]);

  const onPdf = () => {
    downloadReport(`flamesight-mission-${mission.id}-${stamp()}.pdf`, buildMissionReport(mission));
  };

  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: 'gaps', label: 'Gap finder', hint: 'What NASA should test next' },
    { id: 'report', label: 'Mission report', hint: 'Printable PDF' },
    { id: 'compare', label: 'Compare', hint: 'Side-by-side' },
    { id: 'papers', label: 'NASA papers', hint: 'NTRS links' },
    { id: 'cases', label: 'Case studies', hint: 'Apollo 1 & Mir' },
  ];

  return (
    <div>
      <div className="mb-4"><CabinStrip /></div>
      <PageHeader kicker="Creativity & impact" title="What NASA should test next">
        Gap finder, printable mission reports, side-by-side compare, real NTRS papers, and the fires that made these tests matter — with uncertainty on every prediction.
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Impact tools">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-2 text-left text-sm ${tab === t.id ? 'bg-flame-500/25 text-white ring-1 ring-flame-400/60' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            <span className="block font-medium">{t.label}</span>
            <span className="block text-[11px] text-slate-400">{t.hint}</span>
          </button>
        ))}
      </div>

      {tab === 'gaps' && (
        <div className="space-y-6">
          <Card glow="flame">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Mission gap finder</h2>
                <p className="mt-1 text-sm text-slate-400">For each habitat, which O₂, pressure, and gravity cells have no (or thin) NASA tests — and the experiment that would fill them.</p>
              </div>
              <label className="text-sm text-slate-300">
                Focus mission
                <select
                  value={missionId}
                  onChange={e => setMissionId(e.target.value)}
                  className="ml-2 rounded-lg border border-white/10 bg-space-900 px-2 py-1.5 text-sm text-white"
                >
                  {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {missionGaps.gaps.map(g => (
                <div key={g.axis} className="rounded-xl bg-black/25 p-4 ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{g.label}</p>
                    <Pill tone={statusTone(g.status)}>{g.status}</Pill>
                  </div>
                  <p className="mt-1 font-mono text-xs text-flame-300">{g.missionValue}</p>
                  <p className="mt-2 text-sm text-slate-300">{g.detail}</p>
                  <p className="mt-2 text-[11px] text-slate-500">Nearest outcome tests: {g.nearestTests}</p>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Experiment that fills the gap</p>
                    <p className="mt-1 text-sm font-medium text-micro-200">{g.fillExperiment.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{g.fillExperiment.why}</p>
                    {g.fillExperiment.accession && (
                      <Link to={`/explorer/${g.fillExperiment.accession}`} className="mt-2 inline-block text-xs text-cyan-200 hover:underline">
                        Open {g.fillExperiment.accession} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">Highest-impact next tests</h2>
            <p className="mt-1 text-sm text-slate-400">Ranked by how many mission presets they unlock.</p>
            <ol className="mt-4 space-y-3">
              {nextTests.map((t, i) => (
                <li key={t.name} className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-sm font-medium text-white">{i + 1}. {t.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{t.why}</p>
                  <p className="mt-2 text-[11px] text-slate-500">Helps: {t.missions.join(' · ')}</p>
                  {t.accession && <SourceChip acc={t.accession} compact />}
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-white">All missions at a glance</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3">Mission</th>
                    <th className="pb-2 pr-3">O₂</th>
                    <th className="pb-2 pr-3">Pressure</th>
                    <th className="pb-2 pr-3">Gravity</th>
                    <th className="pb-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {allGaps.map(mg => (
                    <tr key={mg.scenario.id} className="border-t border-white/10">
                      <td className="py-2 pr-3 text-white">{mg.scenario.short}</td>
                      {mg.gaps.map(g => (
                        <td key={g.axis} className="py-2 pr-3">
                          <Pill tone={statusTone(g.status)}>{g.status}</Pill>
                        </td>
                      ))}
                      <td className="py-2"><Pill tone={mg.priority === 'high' ? 'flame' : mg.priority === 'medium' ? 'amber' : 'slate'}>{mg.priority}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'report' && (
        <Card glow="flame">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Mission fire-safety report</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-400">One click turns the selected habitat into a printable PDF: top risks, recommended O₂ and pressure limits, suppressant choice, gap list, and citations.</p>
            </div>
            <button type="button" onClick={onPdf} className="rounded-xl bg-gradient-to-r from-flame-500 to-flame-600 px-4 py-2.5 text-sm font-medium text-white shadow-glow">
              Download PDF
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setMissionId(s.id)}
                aria-pressed={missionId === s.id}
                className={`rounded-lg px-3 py-1.5 text-xs ${missionId === s.id ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: 'Oxygen', v: `${Math.round(mission.o2 * 100)}%` },
              { k: 'Pressure', v: `${mission.psi} psi` },
              { k: 'Airflow', v: `${mission.flow} cm/s` },
              { k: 'Gravity', v: scenarioGravityLabel(mission) },
            ].map(x => (
              <div key={x.k} className="rounded-xl bg-black/25 p-3 ring-1 ring-white/5">
                <dt className="text-[10px] uppercase tracking-widest text-slate-500">{x.k}</dt>
                <dd className="mt-1 font-mono text-lg text-flame-300">{x.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-slate-300">
            Preview includes the live burn model for this cabin, FLEX-informed suppressant pick, gap-finder rows, PSI citations, and NTRS paper links.
          </p>
          <button type="button" onClick={onPdf} className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
            Generate report for {mission.name}
          </button>
        </Card>
      )}

      {tab === 'compare' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMode('habitats')} className={`rounded-lg px-3 py-1.5 text-xs ${mode === 'habitats' ? 'bg-micro-500/30 text-white' : 'bg-white/5 text-slate-300'}`}>Habitats</button>
              <button type="button" onClick={() => setMode('experiments')} className={`rounded-lg px-3 py-1.5 text-xs ${mode === 'experiments' ? 'bg-micro-500/30 text-white' : 'bg-white/5 text-slate-300'}`}>Experiments</button>
            </div>

            {mode === 'habitats' ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">Left
                    <select value={compareLeft} onChange={e => setCompareLeft(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-space-900 px-2 py-2 text-sm text-white">
                      {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">Right
                    <select value={compareRight} onChange={e => setCompareRight(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-space-900 px-2 py-2 text-sm text-white">
                      {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[habitatCompare.left, habitatCompare.right].map(side => (
                    <div key={side.sc.id} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="font-semibold text-white">{side.sc.name}</p>
                      <p className="font-mono text-xs text-flame-300">{Math.round(side.sc.o2 * 100)}% O₂ · {side.sc.psi} psi · {scenarioGravityLabel(side.sc)}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{Math.round(side.burn.p * 100)}<span className="text-sm font-normal text-slate-400">/100</span></p>
                      <p className="text-sm text-slate-300">{side.burn.verdict} · based on {side.burn.nTests} tests</p>
                      <p className="mt-1 text-xs text-slate-400">Uncertainty band {Math.round(side.burn.band[0] * 100)}–{Math.round(side.burn.band[1] * 100)}</p>
                      {side.burn.beyondTested && <p className="mt-2 text-xs text-amber-300">⚠ Beyond what NASA tested in PSI outcome tables.</p>}
                      <p className="mt-2 text-[11px] text-slate-500">Top: {side.top.map(t => t.inv.acronym || t.inv.accession).join(' · ')}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={chartRows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid stroke="#1e293b" />
                      <XAxis dataKey="metric" {...axis} />
                      <YAxis {...axis} />
                      <Tooltip />
                      <Bar dataKey="a" name={habitatCompare.left.sc.short} fill="#ff9f43" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="b" name={habitatCompare.right.sc.short} fill="#5cb8ff" radius={[3, 3, 0, 0]} />
                      <ReferenceLine y={50} stroke="#64748b" strokeDasharray="3 3" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">Experiment A
                    <select value={expA} onChange={e => setExpA(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-space-900 px-2 py-2 text-sm text-white">
                      {investigations.map(i => <option key={i.accession} value={i.accession}>{invLabel(i.accession)}</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">Experiment B
                    <select value={expB} onChange={e => setExpB(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-space-900 px-2 py-2 text-sm text-white">
                      {investigations.map(i => <option key={i.accession} value={i.accession}>{invLabel(i.accession)}</option>)}
                    </select>
                  </label>
                </div>
                {expCompare && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[expCompare.left, expCompare.right].map(side => (
                      <div key={side.inv.accession} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                        <Link to={`/explorer/${side.inv.accession}`} className="font-semibold text-white hover:underline">{invLabel(side.inv.accession)}</Link>
                        <p className="mt-1 text-xs text-slate-400">{side.inv.role}</p>
                        <dl className="mt-3 space-y-1 text-sm text-slate-300">
                          <div className="flex justify-between gap-2"><dt>O₂ envelope</dt><dd className="font-mono text-flame-300">{side.o2 ? `${side.o2[0].toFixed(0)}–${side.o2[1].toFixed(0)}%` : 'not in table'}</dd></div>
                          <div className="flex justify-between gap-2"><dt>Pressure</dt><dd className="font-mono text-flame-300">{side.p ? `${side.p[0].toFixed(2)}–${side.p[1].toFixed(2)} atm` : 'not in table'}</dd></div>
                          <div className="flex justify-between gap-2"><dt>Flow</dt><dd className="font-mono text-micro-300">{side.flow ? `${side.flow[0]}–${side.flow[1]} cm/s` : 'not in table'}</dd></div>
                          <div className="flex justify-between gap-2"><dt>Listed tests</dt><dd className="font-mono">{side.tests}</dd></div>
                        </dl>
                        <Link to={`/impact?tab=papers&acc=${side.inv.accession}`} onClick={() => { setTab('papers'); setPaperAcc(side.inv.accession); }} className="mt-3 inline-block text-xs text-cyan-200 hover:underline">NTRS papers →</Link>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'papers' && (
        <Card glow="micro">
          <h2 className="text-lg font-semibold text-white">Linked NASA papers (NTRS)</h2>
          <p className="mt-1 text-sm text-slate-400">
            Live search against the free{' '}
            <a href="https://ntrs.nasa.gov/api/citations/search" className="text-cyan-200 hover:underline" target="_blank" rel="noreferrer">NASA Technical Reports API</a>
            , with curated fallbacks so every study still has a paper trail offline.
          </p>
          <label className="mt-4 block text-sm text-slate-300">
            Investigation
            <select
              value={paperAcc}
              onChange={e => setPaperAcc(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-white/10 bg-space-900 px-2 py-2 text-sm text-white"
            >
              {investigations.map(i => <option key={i.accession} value={i.accession}>{invLabel(i.accession)}</option>)}
            </select>
          </label>
          <p className="mt-2 text-[11px] text-slate-500">
            Status: {paperStatus === 'loading' ? 'searching NTRS…' : paperStatus === 'live' ? 'live NTRS hits' : 'curated / search links'}
            {' · '}
            <a href={ntrsSearchUrl(queryFor(paperAcc, investigations.find(i => i.accession === paperAcc)?.acronym))} target="_blank" rel="noreferrer" className="text-cyan-200 hover:underline">Open full NTRS search</a>
          </p>
          <ul className="mt-4 space-y-2">
            {papers.map(p => (
              <li key={p.id} className="rounded-xl bg-white/5 px-4 py-3">
                <a href={p.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-white hover:underline">{p.title}</a>
                <p className="mt-1 text-[11px] text-slate-500">{p.source === 'ntrs' ? 'NTRS' : 'Curated link'}{p.published ? ` · ${p.published.slice(0, 10)}` : ''}</p>
                {p.abstract && <p className="mt-1 text-xs text-slate-400">{p.abstract}…</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'cases' && (
        <div className="space-y-4">
          {CASE_STUDIES.map(c => (
            <Card key={c.id} glow={c.id === 'apollo1' ? 'flame' : 'micro'}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold text-white">{c.title}</h2>
                <Pill tone="amber">{c.year} · {c.place}</Pill>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{c.summary}</p>
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {c.conditions.map(x => (
                  <div key={x.label} className="rounded-lg bg-black/20 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-widest text-slate-500">{x.label}</dt>
                    <dd className="text-sm text-slate-200">{x.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-l-2 border-flame-500 pl-3 text-sm italic text-slate-200">{c.storytelling}</p>
              <h3 className="mt-5 text-sm font-semibold text-white">Experiments that explain it</h3>
              <ul className="mt-2 space-y-2">
                {c.experiments.map(e => (
                  <li key={e.accession} className="flex flex-wrap items-start gap-2 text-sm text-slate-300">
                    <SourceChip acc={e.accession} compact />
                    <span className="min-w-0 flex-1">{e.link}</span>
                  </li>
                ))}
              </ul>
              <ul className="mt-4 space-y-1 text-xs text-slate-400">
                {c.lessons.map(l => <li key={l}>• {l}</li>)}
              </ul>
            </Card>
          ))}
          <p className="text-xs text-slate-500">
            Partial-g warning: Moon and Mars predictions always sit beyond PSI gravity coverage ({GRAVITY.moon.label} / {GRAVITY.mars.label}).
          </p>
        </div>
      )}
    </div>
  );
}
