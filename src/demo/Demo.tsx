import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import BrandLogo from '../components/BrandLogo';
import { rankForScenario } from '../lib/scoring';
import { scenarioById } from '../lib/scenarios';
import { stats } from '../lib/data';

interface DemoState { running: boolean; step: number; start: () => void; stop: () => void }
const Ctx = createContext<DemoState>({ running: false, step: -1, start: () => {}, stop: () => {} });
export const useDemo = () => useContext(Ctx);

export const DEMO_QUESTION = 'What happens to fire safety at a lunar base with 30% oxygen?';

function buildSteps() {
  const top = rankForScenario(scenarioById('lunar'))[0];
  return [
    { path: '/', ms: 5000, caption: `Dashboard: set one cabin, then see burn risk, top NASA tests, and what those tests found — ${stats.investigations} studies, ${stats.testsTotal.toLocaleString()} records.` },
    { path: '/scenarios?s=lunar', ms: 5500, caption: 'Rank risks: Lunar Base, 30% oxygen at 10.2 psi. Every experiment gets a clear 0–100 match score.' },
    { path: `/explorer/${top.inv.accession}`, ms: 5000, caption: `Top match: ${top.inv.acronym} (${top.inv.accession}). Clear summary, real test table, link to NASA PSI.` },
    { path: '/fluid-physics?mech=no-buoyancy', ms: 5500, caption: 'How flames work: why freefall flames are round—no buoyancy, then diffusion and ventilation feed the fire.' },
    { path: '/simulator?preset=lunar&demo=1', ms: 7000, caption: 'Will it burn? Change gravity and oxygen: the flame morphs, and the nearest NASA tests are the evidence.' },
    { path: `/analyst?q=${encodeURIComponent(DEMO_QUESTION)}`, ms: 5500, caption: 'Ask a question. NASA notes match in the browser, then the AI model on Vercel writes the answer.' },
    { path: '/', ms: 2000, caption: 'FlameSight: fire-safety insights from microgravity combustion data. Built for NASA Space Apps 2026.' },
  ];
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(-1);
  const nav = useNavigate();
  const timer = useRef<number | null>(null);
  const steps = useRef(buildSteps());

  const stop = useCallback(() => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; setStep(-1); }, []);
  const start = useCallback(() => { window.scrollTo({ top: 0 }); setStep(0); }, []);

  useEffect(() => {
    if (step < 0) return;
    const s = steps.current[step];
    if (!s) { setStep(-1); return; }
    nav(s.path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    timer.current = window.setTimeout(() => setStep(x => (x + 1 >= steps.current.length ? -1 : x + 1)), s.ms);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [step, nav]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stop(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop]);

  const cur = step >= 0 ? steps.current[step] : null;
  return (
    <Ctx.Provider value={{ running: step >= 0, step, start, stop }}>
      {children}
      <AnimatePresence>
        {cur && (
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto w-[min(92vw,820px)]" role="status" aria-live="polite">
            <div className="glass flex items-center gap-4 rounded-2xl border-flame-500/40 px-5 py-4 shadow-glow">
              <BrandLogo variant="mark" imgClassName="h-9 w-9 shrink-0" />
              <span className="font-mono text-xs text-flame-300">DEMO {step + 1}/{steps.current.length}</span>
              <p className="flex-1 text-sm text-white sm:text-base">{cur.caption}</p>
              <button onClick={stop} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/20">Stop (Esc)</button>
            </div>
            <motion.div className="mt-2 h-1 rounded-full bg-flame-500" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: cur.ms / 1000, ease: 'linear' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
