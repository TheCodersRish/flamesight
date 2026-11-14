import { useEffect, useMemo, useState } from 'react';
import ScenarioIcon from '../components/ScenarioIcon';
import CabinStrip from '../components/CabinStrip';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useBurn } from '../lib/burnSession';
import { physicsTagsFor, fluidPhysicsHref } from '../lib/physicsBridge';
import {
  SCENARIOS, GRAVITY, scenarioById, psiToAtm, makeAtmosphere, loadCustomScenarios, saveCustomScenarios,
  ROLE_BOOST_OPTIONS, type Scenario,
} from '../lib/scenarios';
import { rankForScenario, weightsFor, recommendations, SCALES, UNKNOWN, type Weights } from '../lib/scoring';
import { Card, PageHeader, Pill, Slider, SourceChip, TierBadge } from '../components/ui';
import type { Gravity } from '../lib/types';

const PART_COLORS: Record<keyof Weights, string> = { o2: '#ff9f43', pressure: '#facc15', flow: '#5cb8ff', role: '#a78bfa', data: '#34d399' };
const PART_LABEL: Record<keyof Weights, string> = { o2: 'O₂ match', pressure: 'Pressure match', flow: 'Flow match', role: 'Fire-safety role', data: 'Data richness' };

type Draft = {
  name: string;
  blurb: string;
  o2: number;
  psi: number;
  flow: number;
  gravity: Gravity;
  roleBoost: string[];
};

const blankDraft = (): Draft => ({
  name: '',
  blurb: '',
  o2: 0.21,
  psi: 14.7,
  flow: 20,
  gravity: 'micro',
  roleBoost: ['Prevention', 'Suppression'],
});

export default function Scenarios() {
  const [sp, setSp] = useSearchParams();
  const { input: cabin, setInput: setCabin } = useBurn();
  const [custom, setCustom] = useState<Scenario[]>(() => loadCustomScenarios());
  const sc = scenarioById(sp.get('s') || 'iss', custom);
  const [w, setW] = useState<Weights>(() => weightsFor(sc));
  useEffect(() => setW(weightsFor(sc)), [sc]);
  const [drawer, setDrawer] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [rankLive, setRankLive] = useState(false);
  const cabinDiffers = Math.abs(cabin.o2 - sc.o2) > 0.005 || Math.abs(cabin.psi - sc.psi) > 0.05 || Math.abs(cabin.flow - sc.flow) > 0.5 || cabin.gravity !== sc.gravity;

  const applyScenarioCabin = (s: Scenario) => {
    setCabin(prev => ({ ...prev, o2: s.o2, psi: s.psi, flow: s.flow, gravity: s.gravity }));
    setRankLive(false);
  };

  const rankScenario = useMemo((): Scenario => {
    if (!rankLive) return sc;
    return {
      ...sc,
      id: `${sc.id}-live`,
      name: 'Shared cabin (Will It Burn)',
      o2: cabin.o2,
      psi: cabin.psi,
      flow: cabin.flow,
      gravity: cabin.gravity,
      blurb: 'Ranked against the shared cabin from Will It Burn.',
      facts: [`Live cabin: ${Math.round(cabin.o2 * 100)}% O₂ · ${cabin.psi.toFixed(1)} psi · ${cabin.flow} cm/s`],
      assumptions: ['Oxygen, pressure, and fan speed come from the shared Will It Burn cabin.'],
    };
  }, [rankLive, sc, cabin]);
  const ranked = useMemo(() => rankForScenario(rankScenario, w), [rankScenario, w]);
  const recs = useMemo(() => recommendations(rankScenario), [rankScenario]);
  const tot = w.o2 + w.pressure + w.flow + w.role + w.data || 1;
  const keys = Object.keys(PART_LABEL) as (keyof Weights)[];
  const isCustom = sc.id.startsWith('custom');

  const persist = (next: Scenario[]) => {
    setCustom(next);
    saveCustomScenarios(next);
  };

  const createScenario = () => {
    const created = makeAtmosphere({
      name: draft.name,
      blurb: draft.blurb,
      o2: draft.o2,
      psi: draft.psi,
      flow: draft.flow,
      gravity: draft.gravity,
      roleBoost: draft.roleBoost.length ? draft.roleBoost : undefined,
    });
    persist([...custom, created]);
    setCreating(false);
    setDraft(blankDraft());
    setSp({ s: created.id });
    applyScenarioCabin(created);
  };

  const removeScenario = (id: string) => {
    const next = custom.filter(s => s.id !== id);
    persist(next);
    if (sc.id === id) setSp({ s: 'iss' });
  };

  const toggleBoost = (role: string) => {
    setDraft(d => ({
      ...d,
      roleBoost: d.roleBoost.includes(role) ? d.roleBoost.filter(r => r !== role) : [...d.roleBoost, role],
    }));
  };

  return (
    <div>
      <PageHeader kicker="Scenario Risk Ranking" title="Which NASA experiments matter most for your mission?">
        Pick a habitat—or build your own. Each NASA fire study gets a 0–100 “how relevant is this?” score from how closely its tested oxygen, pressure, and airflow match your setting, what fire-safety job it helps with, and how much data it has. Studies whose fan-push / oxygen window matches cabin ventilation rise higher. Open “How we scored this” to change the weights.
      </PageHeader>

      <div className="mb-4 space-y-2">
        <CabinStrip />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => { applyScenarioCabin(sc); }}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            Push this habitat into shared cabin
          </button>
          {(cabinDiffers || rankLive) && (
            <button
              type="button"
              onClick={() => setRankLive(v => !v)}
              aria-pressed={rankLive}
              className={`rounded-lg px-3 py-1.5 text-xs ${rankLive ? 'bg-micro-500/30 text-white ring-1 ring-micro-400' : 'bg-white/5 text-micro-300 hover:bg-white/10'}`}
            >
              {rankLive ? 'Ranking shared cabin' : 'Rank with shared Will It Burn cabin'}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Scenario">
        {SCENARIOS.map(s => (
          <button key={s.id} role="tab" aria-selected={s.id === sc.id && !rankLive} onClick={() => { setSp({ s: s.id }); applyScenarioCabin(s); }}
            className={`rounded-xl px-4 py-2 text-sm transition ${s.id === sc.id && !rankLive ? 'bg-gradient-to-r from-flame-500 to-flame-600 text-white shadow-glow' : 'glass text-slate-300 hover:text-white'}`}>
            <ScenarioIcon id={s.id} className="mr-1 inline h-5 w-5 align-[-4px]" /> {s.name}
          </button>
        ))}
        {custom.map(s => (
          <button key={s.id} role="tab" aria-selected={s.id === sc.id && !rankLive} onClick={() => { setSp({ s: s.id }); applyScenarioCabin(s); }}
            className={`rounded-xl px-4 py-2 text-sm transition ${s.id === sc.id && !rankLive ? 'bg-gradient-to-r from-flame-500 to-flame-600 text-white shadow-glow' : 'glass text-slate-300 hover:text-white'}`}>
            <ScenarioIcon id={s.id} className="mr-1 inline h-5 w-5 align-[-4px]" /> {s.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setDraft(blankDraft()); setCreating(true); }}
          className="rounded-xl px-4 py-2 text-sm text-flame-300 ring-1 ring-flame-500/40 hover:bg-flame-500/10"
        >
          + Create scenario
        </button>
        <button onClick={() => setDrawer(true)} className="ml-auto rounded-xl px-4 py-2 text-sm text-micro-300 ring-1 ring-micro-500/40 hover:bg-micro-500/10">⚙ How we scored this</button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6"
          >
            <Card glow="flame">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Create a scientific scenario</h2>
                  <p className="mt-1 text-sm text-slate-400">Set the habitat atmosphere you want to rank against. Scenarios are saved in this browser.</p>
                </div>
                <button type="button" onClick={() => setCreating(false)} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="Close create form">✕</button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-sm text-slate-300">
                    Scenario name
                    <input
                      value={draft.name}
                      onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="e.g. Deep-space transit cabin"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                    />
                  </label>
                  <label className="block text-sm text-slate-300">
                    Scientific context <span className="text-slate-500">(optional)</span>
                    <textarea
                      value={draft.blurb}
                      onChange={e => setDraft(d => ({ ...d, blurb: e.target.value }))}
                      rows={3}
                      placeholder="Why this atmosphere matters for fire risk…"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                    />
                  </label>
                  <fieldset>
                    <legend className="text-sm text-slate-300">Priority fire-safety roles</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ROLE_BOOST_OPTIONS.map(role => (
                        <button
                          key={role}
                          type="button"
                          aria-pressed={draft.roleBoost.includes(role)}
                          onClick={() => toggleBoost(role)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs ${draft.roleBoost.includes(role) ? 'bg-violet-500/30 text-white ring-1 ring-violet-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="space-y-4">
                  <Slider label="Oxygen (O₂)" value={draft.o2} min={0.1} max={1} step={0.01} onChange={v => setDraft(d => ({ ...d, o2: v }))} format={v => `${Math.round(v * 100)}%`} hint="ISS 21% · Moon base 30% · suit 100%" />
                  <Slider label="Pressure" value={draft.psi} min={2} max={45} step={0.1} onChange={v => setDraft(d => ({ ...d, psi: v }))} format={v => `${v.toFixed(1)} psi`} hint="Earth/ISS 14.7 · Moon base 10.2 · suit 4.3" />
                  <Slider label="Airflow" value={draft.flow} min={0} max={50} step={1} onChange={v => setDraft(d => ({ ...d, flow: v }))} format={v => `${v} cm/s`} hint="SAFFIRE tests: 20–30 cm/s" />
                  <fieldset>
                    <legend className="text-sm text-slate-300">Gravity</legend>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {(Object.keys(GRAVITY) as Gravity[]).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, gravity: g }))}
                          aria-pressed={draft.gravity === g}
                          className={`rounded-lg px-2 py-1.5 text-xs ${draft.gravity === g ? 'bg-micro-500/30 text-white ring-1 ring-micro-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                        >
                          {GRAVITY[g].label}{GRAVITY[g].extrapolated && g !== 'earth' ? ' *' : ''}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={createScenario}
                  disabled={!draft.name.trim()}
                  className="rounded-xl bg-gradient-to-r from-flame-500 to-flame-600 px-4 py-2 text-sm font-medium text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save & rank this scenario
                </button>
                <button type="button" onClick={() => setCreating(false)} className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1" glow="flame">
          <ScenarioIcon id={sc.id} className="h-10 w-10 text-flame-300" />
          <h2 className="mt-1 text-xl font-semibold text-white">{sc.name}</h2>
          {isCustom && <p className="mt-1 text-xs text-flame-300/90">Your scientific scenario</p>}
          {sc.blurb && <p className="mt-2 text-sm text-slate-300">{sc.blurb}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
            <div className="rounded-lg bg-white/5 p-2"><dt className="text-[10px] uppercase text-slate-400">Oxygen</dt><dd className="text-flame-300">{Math.round(sc.o2 * 100)}%</dd></div>
            <div className="rounded-lg bg-white/5 p-2"><dt className="text-[10px] uppercase text-slate-400">Pressure</dt><dd className="text-flame-300">{sc.psi} psi <span className="text-slate-500">({psiToAtm(sc.psi).toFixed(2)} atm)</span></dd></div>
            <div className="rounded-lg bg-white/5 p-2"><dt className="text-[10px] uppercase text-slate-400">Airflow</dt><dd className="text-micro-300">{sc.flow} cm/s*</dd></div>
            <div className="rounded-lg bg-white/5 p-2"><dt className="text-[10px] uppercase text-slate-400">Gravity</dt><dd className="text-micro-300">{GRAVITY[sc.gravity].label}</dd></div>
          </dl>
          <ul className="mt-3 space-y-1 text-xs text-slate-400">{sc.facts.map(f => <li key={f}>• {f}</li>)}</ul>
          <ul className="mt-2 space-y-1 text-xs text-amber-300/90">{sc.assumptions.map(f => <li key={f}>* {f}</li>)}</ul>
          {isCustom && (
            <button
              type="button"
              onClick={() => removeScenario(sc.id)}
              className="mt-4 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/20"
            >
              Delete this scenario
            </button>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-flame-300">Top 3 must-reads for {sc.name}</h2>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            {ranked.slice(0, 3).map((r, i) => {
              const tags = physicsTagsFor(r.inv);
              return (
              <li key={r.inv.accession} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between"><span className="font-mono text-2xl text-flame-300">#{i + 1}</span><span className="font-mono text-xl text-white">{r.score.toFixed(0)}</span></div>
                <Link to={`/explorer/${r.inv.accession}`} className="mt-1 block font-semibold text-white hover:underline">{r.inv.acronym}</Link>
                <p className="text-xs text-slate-400">{r.inv.role}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map(t => (
                    <Link key={t.id} to={fluidPhysicsHref(t.id)} title={t.story} className="rounded-md bg-micro-500/15 px-1.5 py-0.5 text-[10px] text-micro-200 ring-1 ring-micro-500/30 hover:bg-micro-500/25">
                      {t.short}
                    </Link>
                  ))}
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-300">{tags[0]?.story || r.inv.why}</p>
                <ul className="mt-3 space-y-1 text-[11px]">
                  {(['o2', 'pressure', 'flow'] as const).map(k => {
                    const v = r.parts[k], known = r.parts.known[k];
                    return <li key={k} className="flex justify-between gap-2"><span className="text-slate-400">{PART_LABEL[k]}</span><span className={!known ? 'text-slate-500' : v >= 0.99 ? 'text-emerald-300' : v >= 0.5 ? 'text-amber-300' : 'text-rose-300'}>{!known ? 'not in table' : v >= 0.99 ? 'in tested range' : v >= 0.5 ? 'near tested range' : 'outside tested range'}</span></li>;
                  })}
                  <li className="flex justify-between gap-2"><span className="text-slate-400">Tests</span><span className="text-slate-200">{r.inv.count ? `${r.inv.count.count.toLocaleString()} ${r.inv.count.unit}` : '—'}</span></li>
                </ul>
              </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-micro-300">Recommendations</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {recs.map(r => (
            <li key={r.title} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <h3 className="font-semibold text-white">{r.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{r.text}</p>
              <div className="mt-2 flex flex-wrap gap-1">{r.cites.map(c => <SourceChip key={c} acc={c} compact />)}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Full ranking</h2>
          <div className="flex flex-wrap gap-2 text-[11px]">{keys.map(k => <span key={k} className="flex items-center gap-1 text-slate-400"><span className="h-2 w-3 rounded-sm" style={{ background: PART_COLORS[k] }} />{PART_LABEL[k]}</span>)}</div>
        </div>
        <ol className="mt-3 space-y-2">
          {(showAll ? ranked : ranked.slice(0, 10)).map((r, i) => (
            <motion.li layout key={r.inv.accession} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 md:grid-cols-[2rem_14rem_1fr_3rem]">
              <span className="font-mono text-sm text-slate-500">{i + 1}</span>
              <div className="min-w-0">
                <Link to={`/explorer/${r.inv.accession}`} className="block truncate font-medium text-white hover:underline">{r.inv.acronym}</Link>
                <div className="flex flex-wrap items-center gap-1">
                  <TierBadge tier={r.inv.tier} label={r.inv.tierLabel} />
                  {physicsTagsFor(r.inv).slice(0, 2).map(t => (
                    <Link key={t.id} to={fluidPhysicsHref(t.id)} className="rounded bg-white/5 px-1 text-[10px] text-micro-300 hover:text-white">{t.short}</Link>
                  ))}
                </div>
              </div>
              <div className="col-span-3 flex h-3 overflow-hidden rounded-full bg-white/5 md:col-span-1" role="img" aria-label={`Score ${r.score.toFixed(0)} of 100`}>
                {keys.map(k => <div key={k} title={`${PART_LABEL[k]}: ${(r.parts[k] * 100).toFixed(0)}% × weight ${w[k]}${k in r.parts.known && !r.parts.known[k as 'o2' | 'pressure' | 'flow'] ? ' (not in table → 0.25)' : ''}`} style={{ width: `${(100 * w[k] * r.parts[k]) / tot}%`, background: PART_COLORS[k] }} />)}
              </div>
              <span className="row-start-1 text-right font-mono text-lg text-white md:row-auto">{r.score.toFixed(0)}</span>
            </motion.li>
          ))}
        </ol>
        <button onClick={() => setShowAll(s => !s)} className="mt-3 text-sm text-micro-300 hover:underline">{showAll ? 'Show top 10' : `Show all ${ranked.length}`}</button>
      </Card>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside role="dialog" aria-modal="true" aria-label="How we scored this" className="fixed right-0 top-0 z-50 h-full w-[min(100vw,440px)] overflow-y-auto border-l border-white/10 bg-space-900 p-6"
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}>
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">How we scored this</h2><button onClick={() => setDrawer(false)} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="Close">✕</button></div>
              <p className="mt-3 text-sm text-slate-300">In plain English: we blend oxygen match, pressure match, airflow match, fire-safety role, and how much data the study has into a 0–100 score. Move the sliders to change how much each ingredient matters.</p>
              <p className="mt-3 rounded-lg bg-white/5 p-3 font-mono text-xs text-slate-200">score = 100 × Σ(weight × part) ÷ Σ weights</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li><b className="text-flame-300">Oxygen / pressure / flow match</b>: full credit (1.0) if your habitat value sits inside what the experiment actually tested; otherwise the score fades with distance (scale = the larger of {SCALES.o2 * 100} oxygen points / {SCALES.pAtm} atmospheres / {SCALES.flow} cm/s and 25% of the habitat value). Missing table values use {UNKNOWN} (unknown).</li>
                <li><b className="text-violet-300">Fire-safety role</b>: tier 1 Core = 1.0, 2 Strong = 0.7, 3 Background = 0.4, plus 0.2 if its role is a priority for this habitat ({sc.roleBoost.join(', ')}).</li>
                <li><b className="text-emerald-300">Data richness</b>: more tests and richer tables score higher (0.7 × log₁₀(1+tests)/log₁₀(701) + 0.15 for a test table + 0.15 for analyzed data).</li>
              </ul>
              <div className="mt-5 space-y-4">
                {keys.map(k => <Slider key={k} label={PART_LABEL[k]} value={w[k]} min={0} max={50} step={1} onChange={v => setW(x => ({ ...x, [k]: v }))} format={v => `${v} (${Math.round((100 * v) / tot)}%)`} />)}
              </div>
              <button onClick={() => setW(weightsFor(sc))} className="mt-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Reset to defaults</button>
              <p className="mt-4 text-[11px] text-slate-500">Tiers are the team's judgment, not NASA's. Habitat airflow values are assumptions (marked *). Moon/Mars have no partial-gravity fire tables in PSI—those results are estimated beyond the measured data.</p>
              <div className="mt-3"><Pill tone="amber">Ranking updates live as you move the sliders</Pill></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
