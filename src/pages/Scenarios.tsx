import { useEffect, useMemo, useState } from 'react';
import ScenarioIcon from '../components/ScenarioIcon';
import CabinStrip from '../components/CabinStrip';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useBurn } from '../lib/burnSession';
import { fadeUp, snap, stagger } from '../lib/motion';
import { physicsTagsFor, fluidPhysicsHref } from '../lib/physicsBridge';
import {
  SCENARIOS, GRAVITY, scenarioById, scenarioGravityLabel, psiToAtm, makeAtmosphere, loadCustomScenarios, saveCustomScenarios,
  ROLE_BOOST_OPTIONS, type Scenario,
} from '../lib/scenarios';
import { buildMissionReport } from '../lib/missionReport';
import { downloadReport, stamp } from '../lib/report';
import { rankForScenario, weightsFor, recommendations, SCALES, UNKNOWN, type Weights, type Scored } from '../lib/scoring';
import { Card, PageHeader, Pill, Slider, SourceChip, TierBadge } from '../components/ui';
import type { Gravity } from '../lib/types';

const PART_COLORS: Record<keyof Weights, string> = { o2: '#ff9f43', pressure: '#facc15', flow: '#5cb8ff', role: '#a78bfa', data: '#34d399' };
const PART_LABEL: Record<keyof Weights, string> = { o2: 'O₂ match', pressure: 'Pressure match', flow: 'Flow match', role: 'Fire-safety role', data: 'Data richness' };
const PART_SHORT: Record<keyof Weights, string> = { o2: 'O₂', pressure: 'P', flow: 'Flow', role: 'Role', data: 'Data' };

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

function matchTone(v: number, known: boolean): { label: string; cls: string; bar: string } {
  if (!known) return { label: 'not in table', cls: 'text-slate-500', bar: 'bg-slate-600' };
  if (v >= 0.99) return { label: 'in range', cls: 'text-emerald-300', bar: 'bg-emerald-400' };
  if (v >= 0.5) return { label: 'near', cls: 'text-amber-300', bar: 'bg-amber-400' };
  return { label: 'outside', cls: 'text-rose-300', bar: 'bg-rose-400' };
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const tone = score >= 75 ? '#34d399' : score >= 55 ? '#facc15' : score >= 40 ? '#ff9f43' : '#94a3b8';
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-mono text-xl font-semibold text-white">{score.toFixed(0)}</span>
    </div>
  );
}

function MatchMeters({ parts }: { parts: Scored['parts'] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(['o2', 'pressure', 'flow'] as const).map(k => {
        const tone = matchTone(parts[k], parts.known[k]);
        return (
          <div key={k} className="rounded-lg bg-black/20 px-2 py-1.5">
            <div className="flex items-center justify-between gap-1 text-[10px] uppercase tracking-wide text-slate-400">
              <span>{PART_SHORT[k]}</span>
              <span className={tone.cls}>{tone.label}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-all duration-500 ${tone.bar}`} style={{ width: `${Math.round(parts[k] * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PartBars({ scored, weights, tot }: { scored: Scored; weights: Weights; tot: number }) {
  const keys = Object.keys(PART_LABEL) as (keyof Weights)[];
  return (
    <div className="mt-3 space-y-2">
      {keys.map(k => {
        const contrib = (100 * weights[k] * scored.parts[k]) / tot;
        const known = k in scored.parts.known ? scored.parts.known[k as 'o2' | 'pressure' | 'flow'] : true;
        return (
          <div key={k}>
            <div className="mb-0.5 flex justify-between text-[11px]">
              <span className="text-slate-400">{PART_LABEL[k]}{!known ? ' · unknown' : ''}</span>
              <span className="font-mono text-slate-200">{contrib.toFixed(1)} pts</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, contrib * 1.2)}%`, background: PART_COLORS[k] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}


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
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
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
  const displayName = rankLive ? 'shared cabin' : sc.name;

  const roles = useMemo(() => {
    const set = new Set(ranked.map(r => r.inv.roleGroup).filter(Boolean));
    return Array.from(set).sort();
  }, [ranked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter(r => {
      if (tierFilter !== 'all' && String(r.inv.tier) !== tierFilter) return false;
      if (roleFilter !== 'all' && r.inv.roleGroup !== roleFilter) return false;
      if (!q) return true;
      return (
        r.inv.acronym.toLowerCase().includes(q) ||
        r.inv.title.toLowerCase().includes(q) ||
        r.inv.role.toLowerCase().includes(q) ||
        r.inv.accession.toLowerCase().includes(q)
      );
    });
  }, [ranked, query, tierFilter, roleFilter]);

  const stats = useMemo(() => {
    const top = ranked[0]?.score ?? 0;
    const core = ranked.filter(r => r.inv.tier === 1).length;
    const strong = ranked.filter(r => r.score >= 70).length;
    const avg = ranked.length ? ranked.reduce((s, r) => s + r.score, 0) / ranked.length : 0;
    return { top, core, strong, avg };
  }, [ranked]);

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

  const visible = showAll ? filtered : filtered.slice(0, 12);
  const allMissions = [...SCENARIOS, ...custom];

  return (
    <div className="workspace-shell">
      <motion.div {...fadeUp} transition={snap}>
        <PageHeader kicker="Scenario Risk Ranking" title="Which NASA experiments matter most for your mission?">
          Pick a habitat — or create your own — and every investigation gets a transparent 0–100 relevance score from oxygen, pressure, airflow match, fire-safety role, and data richness.
        </PageHeader>
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...snap, delay: 0.02 }} className="mb-5 space-y-2">
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
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="ml-auto rounded-lg px-3 py-1.5 text-xs text-micro-300 ring-1 ring-micro-500/40 hover:bg-micro-500/10"
          >
            ⚙ Score weights
          </button>
        </div>
      </motion.div>

      {/* Mission picker */}
      <motion.section {...fadeUp} transition={{ ...snap, delay: 0.04 }} className="mb-6" aria-label="Choose mission habitat">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">1 · Choose habitat</h2>
          <button
            type="button"
            onClick={() => { setDraft(blankDraft()); setCreating(true); }}
            className="rounded-lg px-3 py-1.5 text-xs text-flame-300 ring-1 ring-flame-500/40 hover:bg-flame-500/10"
          >
            + Create scenario
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Scenario">
          {allMissions.map(s => {
            const active = s.id === sc.id && !rankLive;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => { setSp({ s: s.id }); applyScenarioCabin(s); }}
                className={`group relative overflow-hidden rounded-2xl p-3 text-left transition ${
                  active
                    ? 'bg-gradient-to-br from-flame-500/25 to-flame-600/10 ring-2 ring-flame-400/70 shadow-glow'
                    : 'glass text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ScenarioIcon id={s.id} className={`h-7 w-7 ${active ? 'text-flame-300' : 'text-slate-400 group-hover:text-white'}`} />
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${active ? 'text-white' : ''}`}>{s.short || s.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{Math.round(s.o2 * 100)}% · {s.psi} psi</p>
                  </div>
                </div>
                {active && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-flame-400" aria-hidden />}
              </button>
            );
          })}
        </div>
      </motion.section>

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

      {/* Briefing + readout */}
      <motion.section {...fadeUp} transition={{ ...snap, delay: 0.06 }} className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card glow="flame" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-flame-500/10 blur-3xl" aria-hidden />
          <div className="flex flex-wrap items-start gap-4">
            <ScenarioIcon id={sc.id} className="h-14 w-14 text-flame-300" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-flame-400">Mission briefing</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{rankLive ? 'Shared cabin' : sc.name}</h2>
              {isCustom && !rankLive && <p className="mt-1 text-xs text-flame-300/90">Your scientific scenario</p>}
              <p className="mt-2 text-sm text-slate-300">{rankLive ? rankScenario.blurb : sc.blurb}</p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Oxygen', value: `${Math.round(rankScenario.o2 * 100)}%`, accent: 'text-flame-300' },
              { label: 'Pressure', value: `${Number(rankScenario.psi.toFixed(1))} psi`, sub: `${psiToAtm(rankScenario.psi).toFixed(2)} atm`, accent: 'text-flame-300' },
              { label: 'Airflow', value: `${rankScenario.flow} cm/s*`, accent: 'text-micro-300' },
              { label: 'Gravity', value: scenarioGravityLabel(rankScenario), accent: 'text-micro-300' },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-black/25 p-3 ring-1 ring-white/5">
                <dt className="text-[10px] uppercase tracking-widest text-slate-500">{item.label}</dt>
                <dd className={`mt-1 font-mono text-lg font-semibold ${item.accent}`}>{item.value}</dd>
                {'sub' in item && item.sub && <dd className="text-[10px] text-slate-500">{item.sub}</dd>}
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {sc.roleBoost.map(r => <Pill key={r} tone="flame">{r} priority</Pill>)}
            {GRAVITY[rankScenario.gravity].extrapolated && <Pill tone="amber">Partial-g extrapolated</Pill>}
            {rankLive && <Pill tone="micro">Live cabin ranking</Pill>}
          </div>

          <ul className="mt-4 space-y-1 text-xs text-slate-400">
            {(rankLive ? rankScenario.facts : sc.facts).map(f => <li key={f}>• {f}</li>)}
          </ul>
          <ul className="mt-2 space-y-1 text-xs text-amber-300/90">
            {(rankLive ? rankScenario.assumptions : sc.assumptions).map(f => <li key={f}>* {f}</li>)}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadReport(`flamesight-mission-${rankScenario.id}-${stamp()}.pdf`, buildMissionReport(rankScenario))}
              className="rounded-lg bg-flame-500/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-flame-500"
            >
              Download fire-safety PDF
            </button>
            {isCustom && !rankLive && (
              <button
                type="button"
                onClick={() => removeScenario(sc.id)}
                className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/20"
              >
                Delete this scenario
              </button>
            )}
          </div>
        </Card>

        <Card glow="micro">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-micro-300">Ranking snapshot</h2>
          <p className="mt-1 text-sm text-slate-400">Live scores for <span className="text-white">{displayName}</span></p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/25 p-3 ring-1 ring-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Top score</p>
              <p className="mt-1 font-mono text-3xl font-semibold text-white">{stats.top.toFixed(0)}</p>
              <p className="text-xs text-slate-400">{ranked[0]?.inv.acronym ?? '—'}</p>
            </div>
            <div className="rounded-xl bg-black/25 p-3 ring-1 ring-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Avg relevance</p>
              <p className="mt-1 font-mono text-3xl font-semibold text-micro-300">{stats.avg.toFixed(0)}</p>
              <p className="text-xs text-slate-400">across {ranked.length} studies</p>
            </div>
            <div className="rounded-xl bg-black/25 p-3 ring-1 ring-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">High relevance</p>
              <p className="mt-1 font-mono text-3xl font-semibold text-emerald-300">{stats.strong}</p>
              <p className="text-xs text-slate-400">score ≥ 70</p>
            </div>
            <div className="rounded-xl bg-black/25 p-3 ring-1 ring-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Core tier</p>
              <p className="mt-1 font-mono text-3xl font-semibold text-flame-300">{stats.core}</p>
              <p className="text-xs text-slate-400">challenge-named</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-slate-500">Weight mix</p>
              <button type="button" onClick={() => setDrawer(true)} className="text-xs text-micro-300 hover:underline">Adjust</button>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label="Score weight distribution">
              {keys.map(k => (
                <div
                  key={k}
                  title={`${PART_LABEL[k]}: ${w[k]} (${Math.round((100 * w[k]) / tot)}%)`}
                  style={{ width: `${(100 * w[k]) / tot}%`, background: PART_COLORS[k] }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
              {keys.map(k => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm" style={{ background: PART_COLORS[k] }} />
                  {PART_SHORT[k]} {Math.round((100 * w[k]) / tot)}%
                </span>
              ))}
            </div>
          </div>
        </Card>
      </motion.section>

      {/* Top 3 podium */}
      <motion.section {...fadeUp} transition={{ ...snap, delay: 0.08 }} className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-flame-300">2 · Top 3 must-reads</h2>
            <p className="mt-1 text-sm text-slate-400">Highest relevance for {displayName}</p>
          </div>
          <Link to="/explorer" className="text-xs text-micro-300 hover:underline">Browse all experiments →</Link>
        </div>
        <ol className="grid gap-3 lg:grid-cols-3">
          {ranked.slice(0, 3).map((r, i) => {
            const tags = physicsTagsFor(r.inv);
            const podium = i === 0 ? 'lg:order-2 ring-flame-400/50 shadow-glow' : i === 1 ? 'lg:order-1' : 'lg:order-3';
            const height = i === 0 ? 'lg:mt-0' : 'lg:mt-6';
            return (
              <motion.li
                key={r.inv.accession}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(i)}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 ring-1 ring-white/10 ${podium} ${height}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-semibold ${i === 0 ? 'bg-flame-500/30 text-flame-200' : 'bg-white/10 text-slate-300'}`}>
                      #{i + 1}
                    </span>
                    <Link to={`/explorer/${r.inv.accession}`} className="mt-3 block text-xl font-semibold text-white hover:underline">
                      {r.inv.acronym}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">{r.inv.role}</p>
                  </div>
                  <ScoreRing score={r.score} size={i === 0 ? 84 : 68} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  <TierBadge tier={r.inv.tier} label={r.inv.tierLabel} />
                  {tags.slice(0, 3).map(t => (
                    <Link key={t.id} to={fluidPhysicsHref(t.id)} title={t.story} className="rounded-md bg-micro-500/15 px-1.5 py-0.5 text-[10px] text-micro-200 ring-1 ring-micro-500/30 hover:bg-micro-500/25">
                      {t.short}
                    </Link>
                  ))}
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-slate-300">{tags[0]?.story || r.inv.why}</p>
                <div className="mt-4">
                  <MatchMeters parts={r.parts} />
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  {r.inv.count ? `${r.inv.count.count.toLocaleString()} ${r.inv.count.unit}` : 'No test count'} · open for full score breakdown
                </p>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === r.inv.accession ? null : r.inv.accession)}
                  className="mt-2 text-xs text-micro-300 hover:underline"
                >
                  {expanded === r.inv.accession ? 'Hide breakdown' : 'Why this score'}
                </button>
                <AnimatePresence>
                  {expanded === r.inv.accession && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <PartBars scored={r} weights={w} tot={tot} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ol>
      </motion.section>

      {/* Recommendations */}
      <motion.section {...fadeUp} transition={{ ...snap, delay: 0.1 }} className="mb-6">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-micro-300">3 · Recommendations</h2>
          <p className="mt-1 text-sm text-slate-400">Data-cited guidance for this atmosphere</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {recs.map((r, i) => (
              <motion.li
                key={r.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(i)}
                className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-micro-500/20 font-mono text-[11px] text-micro-300">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-white">{r.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">{r.text}</p>
                    <div className="mt-2 flex flex-wrap gap-1">{r.cites.map(c => <SourceChip key={c} acc={c} compact />)}</div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </Card>
      </motion.section>

      {/* Full ranking */}
      <motion.section {...fadeUp} transition={{ ...snap, delay: 0.12 }}>
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">4 · Full ranking</h2>
              <p className="mt-1 text-sm text-slate-400">
                Showing {visible.length} of {filtered.length}
                {filtered.length !== ranked.length ? ` (filtered from ${ranked.length})` : ''} investigations
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {keys.map(k => (
                <span key={k} className="flex items-center gap-1 text-slate-400">
                  <span className="h-2 w-3 rounded-sm" style={{ background: PART_COLORS[k] }} />
                  {PART_LABEL[k]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <label className="min-w-[12rem] flex-1">
              <span className="sr-only">Search investigations</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search acronym, title, role…"
                className="w-full rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
              />
            </label>
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as typeof tierFilter)}
              className="rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white"
              aria-label="Filter by tier"
            >
              <option value="all">All tiers</option>
              <option value="1">Tier 1 Core</option>
              <option value="2">Tier 2 Strong</option>
              <option value="3">Tier 3 Background</option>
            </select>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white"
              aria-label="Filter by role"
            >
              <option value="all">All roles</option>
              {roles.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
            {(query || tierFilter !== 'all' || roleFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setQuery(''); setTierFilter('all'); setRoleFilter('all'); }}
                className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Clear filters
              </button>
            )}
          </div>

          <ol className="mt-4 space-y-1.5">
            {visible.map(r => {
              const open = expanded === `full-${r.inv.accession}`;
              const rankIndex = ranked.findIndex(x => x.inv.accession === r.inv.accession);
              return (
                <motion.li
                  layout
                  key={r.inv.accession}
                  className={`rounded-xl px-2 py-2 transition hover:bg-white/[0.04] ${open ? 'bg-white/[0.04] ring-1 ring-white/10' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : `full-${r.inv.accession}`)}
                    className="grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 text-left md:grid-cols-[2.25rem_13rem_1fr_3.5rem]"
                    aria-expanded={open}
                  >
                    <span className="font-mono text-sm text-slate-500">{rankIndex + 1}</span>
                    <div className="min-w-0">
                      <Link
                        to={`/explorer/${r.inv.accession}`}
                        onClick={e => e.stopPropagation()}
                        className="block truncate font-medium text-white hover:underline"
                      >
                        {r.inv.acronym}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <TierBadge tier={r.inv.tier} label={r.inv.tierLabel} />
                        {physicsTagsFor(r.inv).slice(0, 2).map(t => (
                          <Link key={t.id} to={fluidPhysicsHref(t.id)} onClick={e => e.stopPropagation()} className="rounded bg-white/5 px-1 text-[10px] text-micro-300 hover:text-white">{t.short}</Link>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-3 hidden h-3 overflow-hidden rounded-full bg-white/5 md:col-span-1 md:flex" role="img" aria-label={`Score ${r.score.toFixed(0)} of 100`}>
                      {keys.map(k => (
                        <div
                          key={k}
                          title={`${PART_LABEL[k]}: ${(r.parts[k] * 100).toFixed(0)}% × weight ${w[k]}${k in r.parts.known && !r.parts.known[k as 'o2' | 'pressure' | 'flow'] ? ' (not in table → 0.25)' : ''}`}
                          style={{ width: `${(100 * w[k] * r.parts[k]) / tot}%`, background: PART_COLORS[k] }}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-lg text-white">{r.score.toFixed(0)}</span>
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 border-t border-white/5 px-2 pb-2 pt-3 md:pl-[3.25rem]">
                          <p className="text-sm text-slate-300">{r.inv.why}</p>
                          <div className="mt-3 md:max-w-xl">
                            <MatchMeters parts={r.parts} />
                            <PartBars scored={r} weights={w} tot={tot} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link to={`/explorer/${r.inv.accession}`} className="rounded-lg bg-flame-500/15 px-3 py-1.5 text-xs text-flame-300 ring-1 ring-flame-500/30 hover:bg-flame-500/25">
                              Open experiment
                            </Link>
                            <a href={r.inv.psiPage} target="_blank" rel="noreferrer" className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
                              NASA PSI ↗
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ol>

          {filtered.length === 0 && (
            <p className="mt-4 rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-400">No investigations match these filters.</p>
          )}

          {filtered.length > 12 && (
            <button onClick={() => setShowAll(s => !s)} className="mt-4 text-sm text-micro-300 hover:underline">
              {showAll ? 'Show top 12' : `Show all ${filtered.length}`}
            </button>
          )}
        </Card>
      </motion.section>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="How we scored this"
              className="fixed right-0 top-0 z-50 h-full w-[min(100vw,440px)] overflow-y-auto border-l border-white/10 bg-space-900 p-6"
              initial={{ x: 480 }}
              animate={{ x: 0 }}
              exit={{ x: 480 }}
              transition={{ type: 'spring', damping: 32, stiffness: 420, mass: 0.7 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">How we scored this</h2>
                <button onClick={() => setDrawer(false)} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="Close">✕</button>
              </div>
              <p className="mt-3 rounded-lg bg-white/5 p-3 font-mono text-xs text-slate-200">score = 100 × Σ(weight × part) ÷ Σ weights</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li><b className="text-flame-300">O₂ / pressure / flow match</b>: 1.0 if the habitat value is inside the range the experiment actually tested; otherwise e^(−distance/scale), scale = the larger of {SCALES.o2 * 100} O₂ points / {SCALES.pAtm} atm / {SCALES.flow} cm/s and 25% of the habitat value. If the experiment's table doesn't list that variable, the part is {UNKNOWN} (unknown).</li>
                <li><b className="text-violet-300">Fire-safety role</b>: tier 1 Core = 1.0, 2 Strong = 0.7, 3 Background = 0.4, +0.2 if its role is a priority for this habitat ({sc.roleBoost.join(', ')}).</li>
                <li><b className="text-emerald-300">Data richness</b>: 0.7 × log₁₀(1+tests)/log₁₀(701) + 0.15 if it has a test table + 0.15 if it has analyzed data.</li>
              </ul>
              <div className="mt-5 space-y-4">
                {keys.map(k => (
                  <Slider
                    key={k}
                    label={PART_LABEL[k]}
                    value={w[k]}
                    min={0}
                    max={50}
                    step={1}
                    onChange={v => setW(x => ({ ...x, [k]: v }))}
                    format={v => `${v} (${Math.round((100 * v) / tot)}%)`}
                  />
                ))}
              </div>
              <button onClick={() => setW(weightsFor(sc))} className="mt-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Reset to defaults</button>
              <p className="mt-4 text-[11px] text-slate-500">Tiers are the team's judgment, not NASA's. Airflow values for habitats are assumptions (marked *). Moon/Mars have no partial-gravity data in PSI.</p>
              <div className="mt-3"><Pill tone="amber">Ranking updates live as you move the sliders</Pill></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
