import { lazy, Suspense } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import FloatingChat from './components/FloatingChat';
import SideNav from './components/SideNav';
import { DemoProvider } from './demo/Demo';
import { BurnProvider } from './lib/burnSession';
import { fadeUp, snap } from './lib/motion';
import Command from './pages/Command';
import Home from './pages/Home';
import Overview from './pages/Overview';

const Explorer = lazy(() => import('./pages/Explorer'));
const ExperimentDetail = lazy(() => import('./pages/ExperimentDetail'));
const Scenarios = lazy(() => import('./pages/Scenarios'));
const Insights = lazy(() => import('./pages/Insights'));
const FluidPhysics = lazy(() => import('./pages/FluidPhysics'));
const Analyst = lazy(() => import('./pages/Analyst'));
const About = lazy(() => import('./pages/About'));
const FlameLab = lazy(() => import('./pages/FlameLab'));

const DECK = new Set(['/simulator', '/insights', '/analyst']);

function Shell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const deck = DECK.has(location.pathname);
  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:text-black">Skip to content</a>
      <SideNav />
      <main id="main" className={deck ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' : 'min-h-0 min-w-0 flex-1 overflow-y-auto'}>
        <div className={deck ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:py-8'}>
          <Suspense fallback={<p className="py-20 text-center text-slate-400">Loading…</p>}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className={deck ? 'flex min-h-0 flex-1 flex-col' : undefined}
                {...(reduceMotion ? {} : fadeUp)}
                transition={snap}
              >
                <Routes location={location}>
                  <Route path="/" element={<Home />} />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/explorer" element={<Explorer />} />
                  <Route path="/explorer/:acc" element={<ExperimentDetail />} />
                  <Route path="/scenarios" element={<Scenarios />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/fluid-physics" element={<FluidPhysics />} />
                  <Route path="/simulator" element={<Command />} />
                  <Route path="/analyst" element={<Analyst />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/new-features" element={<Navigate to="/" replace />} />
                  <Route path="/flame-lab" element={<FlameLab />} />
                  <Route path="*" element={<Home />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>
      <FloatingChat />
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
