import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import DbSearch from './components/DbSearch';
import { DemoProvider, useDemo } from './demo/Demo';
import Command from './pages/Command';
import Home from './pages/Home';

const Explorer = lazy(() => import('./pages/Explorer'));
const ExperimentDetail = lazy(() => import('./pages/ExperimentDetail'));
const Scenarios = lazy(() => import('./pages/Scenarios'));
const Insights = lazy(() => import('./pages/Insights'));
const Simulator = lazy(() => import('./pages/Simulator'));
const Analyst = lazy(() => import('./pages/Analyst'));
const About = lazy(() => import('./pages/About'));
const FlameLab = lazy(() => import('./pages/FlameLab'));

const NAV = [
  { to: '/', label: 'Will It Burn?', end: true },
  { to: '/overview', label: 'Overview' },
  { to: '/explorer', label: 'Experiments' },
  { to: '/scenarios', label: 'Risk Ranking' },
  { to: '/insights', label: 'Insights' },
  { to: '/simulator', label: 'Will It Burn?' },
  { to: '/analyst', label: 'Analyst' },
  { to: '/about', label: 'About' },
];

function DemoButton() {
  const { running, start, stop } = useDemo();
  return (
    <button onClick={running ? stop : start}
      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${running ? 'bg-white/10 text-white' : 'bg-gradient-to-r from-flame-500 to-flame-600 text-white shadow-glow hover:brightness-110'}`}>
      {running ? '■ Stop demo' : '▶ Guided demo'}
    </button>
  );
}

function Shell() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const deck = loc.pathname === '/';
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <div className={deck ? 'flex h-screen flex-col overflow-hidden' : 'flex min-h-screen flex-col'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:text-black">Skip to content</a>
      {!deck && <header className="z-40 border-b border-cyan-200/15 bg-space-950/85 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-2">
          <NavLink to="/" className="flex shrink-0 items-center gap-2" aria-label="FlameSight command deck">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan-200/40 bg-gradient-to-br from-flame-500 to-micro-600 font-mono text-xs font-bold text-white">FS</span>
            <span className="font-mono text-sm tracking-[0.18em] text-white">FLAME<span className="text-cyan-300">SIGHT</span></span>
          </NavLink>
          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 xl:flex" aria-label="Main">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `rounded px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition ${isActive ? 'bg-cyan-300/15 text-cyan-50' : 'text-slate-400 hover:text-white'}`}>{n.label}</NavLink>
            ))}
          </nav>
          <DbSearch className="hidden w-56 shrink-0 md:block xl:w-64" />
          <div className="ml-auto flex items-center gap-2">
            <DemoButton />
            <button className="rounded-lg p-2 text-slate-300 hover:bg-white/10 xl:hidden" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Toggle menu">☰</button>
          </div>
        </div>
        {open && (
          <div className="border-t border-cyan-200/10 px-3 py-2 xl:hidden">
            <DbSearch className="mb-2 md:hidden" />
            <nav aria-label="Mobile">
              {NAV.map(n => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `block rounded px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] ${isActive ? 'bg-cyan-300/15 text-white' : 'text-slate-300'}`}>{n.label}</NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>}
      <main id="main" className={deck ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-7xl flex-1 px-4 py-8'}>
        <Suspense fallback={<p className="py-20 text-center text-slate-400">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Command />} />
            <Route path="/overview" element={<Home />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/explorer/:acc" element={<ExperimentDetail />} />
            <Route path="/scenarios" element={<Scenarios />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/analyst" element={<Analyst />} />
            <Route path="/about" element={<About />} />
            <Route path="/flame-lab" element={<FlameLab />} />
            <Route path="*" element={<Command />} />
          </Routes>
        </Suspense>
      </main>
      {!deck && (
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          <p>Data: NASA Physical Sciences Informatics (<a className="underline hover:text-slate-300" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">psi.nasa.gov</a>). Built for NASA Space Apps 2026. Not affiliated with or endorsed by NASA.</p>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  );
}
