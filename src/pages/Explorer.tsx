import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { investigations } from '../lib/data';
import { fadeUp, stagger } from '../lib/motion';
import { fluidPresetsFor } from '../lib/physicsBridge';
import { PageHeader, TierBadge, Pill } from '../components/ui';

type Sort = 'tier' | 'tests' | 'newest' | 'size' | 'az';

function cardTitle(i: (typeof investigations)[number]): string {
  if (i.hasAcronym) return i.acronym;
  const trimmed = i.title
    .replace(/^Utilization of the /i, '')
    .replace(/^Effect of External /i, '')
    .replace(/^Quantitative Studies of /i, '')
    .replace(/^Computational and Experimental Analysis of /i, '')
    .replace(/^Concurrent Flame Spread Modeling using /i, '');
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 46).trim()}…`;
}

export default function Explorer() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('All');
  const [sort, setSort] = useState<Sort>('tier');
  const roles = useMemo(() => ['All', ...Array.from(new Set(investigations.map(i => i.roleGroup))).sort()], []);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const r = investigations.filter(i => (role === 'All' || i.roleGroup === role) &&
      (!ql || [i.acronym, i.accession, i.title, i.role, i.summary, i.keywords.join(' '), i.platform].join(' ').toLowerCase().includes(ql)));
    const tc = (i: typeof r[number]) => (i.count && !i.count.notTests ? i.count.count : 0);
    const sorters: Record<Sort, (a: typeof r[number], b: typeof r[number]) => number> = {
      tier: (a, b) => (a.tier ?? 9) - (b.tier ?? 9) || tc(b) - tc(a),
      tests: (a, b) => tc(b) - tc(a),
      newest: (a, b) => (b.endYear ?? b.startYear ?? 0) - (a.endYear ?? a.startYear ?? 0),
      size: (a, b) => (b.sizeGB ?? 0) - (a.sizeGB ?? 0),
      az: (a, b) => a.acronym.localeCompare(b.acronym),
    };
    return [...r].sort(sorters[sort]);
  }, [q, role, sort]);

  return (
    <div>
      <PageHeader kicker="Experiment Explorer" title="24 NASA combustion investigations">
        Every card is one investigation in NASA's Physical Sciences Informatics (PSI) repository. Tiers are our team's fire-safety ranking (1 Core = named in the challenge), not NASA's.
      </PageHeader>
      <div className="glass mb-6 flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center">
        <label className="sr-only" htmlFor="search">Search</label>
        <input id="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search: smoke, PMMA, CO2, droplet, Cygnus…"
          className="flex-1 rounded-xl border border-white/10 bg-space-900 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-micro-500 focus:outline-none" />
        <label className="sr-only" htmlFor="role">Filter by role</label>
        <select id="role" value={role} onChange={e => setRole(e.target.value)} className="rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white">
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
        <label className="sr-only" htmlFor="sort">Sort</label>
        <select id="sort" value={sort} onChange={e => setSort(e.target.value as Sort)} className="rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm text-white">
          <option value="tier">Sort: fire-safety tier</option>
          <option value="tests">Sort: most tests</option>
          <option value="newest">Sort: most recent</option>
          <option value="size">Sort: most data (GB)</option>
          <option value="az">Sort: A–Z</option>
        </select>
      </div>
      <p className="mb-3 text-sm text-slate-400">{list.length} investigation{list.length === 1 ? '' : 's'}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((i, k) => (
          <motion.article key={i.accession} layout {...fadeUp} transition={stagger(k, 0.02)}
            className="glass lift flex flex-col rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-slate-500">{i.accession}</p>
                <h2 className="text-lg font-semibold text-white">{cardTitle(i)}</h2>
              </div>
              <TierBadge tier={i.tier} label={i.tierLabel} />
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-300">{i.title}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              <Pill tone="flame">{i.roleGroup}</Pill>
              <Pill>{i.platform === 'Not Applicable' ? 'Ground-based' : i.platform.replace(' (ISS)', '')}</Pill>
              {i.startYear && <Pill>{i.startYear}{i.endYear && i.endYear !== i.startYear ? `–${i.endYear}` : ''}</Pill>}
            </div>
            <p className="mt-3 text-xs text-slate-400">{i.role}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {fluidPresetsFor(i).slice(0, 2).map(p => (
                <Link key={p.to + p.label} to={p.to} className="rounded bg-micro-500/15 px-1.5 py-0.5 text-[10px] text-micro-200 hover:bg-micro-500/25" title={p.why}>
                  {p.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-sm">
              <span className="font-mono text-micro-300">{i.count ? `${i.count.count.toLocaleString()} ${i.count.unit}` : 'no test table'}</span>
              <span className="flex gap-2">
                <a href={i.psiPage} target="_blank" rel="noreferrer" className="rounded-lg px-2 py-1 text-xs text-slate-400 ring-1 ring-white/10 hover:text-white">PSI ↗</a>
                <Link to={`/explorer/${i.accession}`} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20">Details →</Link>
              </span>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
