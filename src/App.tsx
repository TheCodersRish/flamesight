import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import SideNav from './components/SideNav';
import { DemoProvider } from './demo/Demo';
import { BurnProvider } from './lib/burnSession';
import Command from './pages/Command';
import Home from './pages/Home';

const Explorer = lazy(() => import('./pages/Explorer'));
const ExperimentDetail = lazy(() => import('./pages/ExperimentDetail'));
const Scenarios = lazy(() => import('./pages/Scenarios'));
const Insights = lazy(() => import('./pages/Insights'));
const FluidPhysics = lazy(() => import('./pages/FluidPhysics'));
const Analyst = lazy(() => import('./pages/Analyst'));
const About = lazy(() => import('./pages/About'));
const NewFeatures = lazy(() => import('./pages/NewFeatures'));
const FlameLab = lazy(() => import('./pages/FlameLab'));

const DECK = new Set(['/', '/insights', '/analyst', '/simulator']);

function Shell() {
  const { pathname } = useLocation();
  const deck = DECK.has(pathname);
  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:text-black">Skip to content</a>
      <SideNav />
      <main id="main" className={deck ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' : 'min-h-0 min-w-0 flex-1 overflow-y-auto'}>
        <div className={deck ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-7xl px-4 py-8'}>
          <Suspense fallback={<p className="py-20 text-center text-slate-400">Loading…</p>}>
            <Routes>
              <Route path="/" element={<Command />} />
              <Route path="/overview" element={<Home />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/explorer/:acc" element={<ExperimentDetail />} />
              <Route path="/scenarios" element={<Scenarios />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/fluid-physics" element={<FluidPhysics />} />
              <Route path="/simulator" element={<Command />} />
              <Route path="/analyst" element={<Analyst />} />
              <Route path="/about" element={<About />} />
              <Route path="/new-features" element={<NewFeatures />} />
              <Route path="/flame-lab" element={<FlameLab />} />
              <Route path="*" element={<Command />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DemoProvider>
      <BurnProvider>
        <Shell />
      </BurnProvider>
    </DemoProvider>
  );
}
