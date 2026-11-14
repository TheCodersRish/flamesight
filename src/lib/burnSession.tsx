import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { predict, type SimInput, type SimResult } from './knn';

const DEFAULT: SimInput = { fuel: 'any', o2: 0.21, psi: 14.7, flow: 20, gravity: 'micro', diluent: 'none' };

interface BurnSession {
  input: SimInput;
  result: SimResult;
  setInput: (next: SimInput | ((prev: SimInput) => SimInput)) => void;
}

const Ctx = createContext<BurnSession | null>(null);

export function BurnProvider({ children }: { children: ReactNode }) {
  const [input, setState] = useState<SimInput>(DEFAULT);
  const setInput = useCallback((next: SimInput | ((prev: SimInput) => SimInput)) => setState(next), []);
  const result = useMemo(() => predict(input), [input]);
  const value = useMemo(() => ({ input, result, setInput }), [input, result, setInput]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBurn(): BurnSession {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBurn must be used inside BurnProvider');
  return ctx;
}

export type InsightId = 'flex' | 'bass' | 'cfig' | 'psi117';

/** Which NASA chart answers the conditions currently set in Will It Burn. */
export function insightFocus(x: SimInput): { id: InsightId; why: string } {
  const o2 = Math.round(x.o2 * 100);
  if (/sibal|silicone|pmma|cotton|nomex|fabric/i.test(x.fuel)) {
    return { id: 'bass', why: `${x.fuel} is a solid. BASS and SAFFIRE are the NASA tests of solid materials.` };
  }
  if (x.o2 >= 0.28) {
    return { id: 'cfig', why: `You set ${o2}% oxygen. ACME CFI-G is the NASA set that reaches oxygen that high.` };
  }
  if (x.psi < 10 || x.psi > 20) {
    return { id: 'psi117', why: `You set ${x.psi.toFixed(1)} psi. PSI-117 shows how pressure changes the size at which a droplet flame goes out.` };
  }
  if (x.diluent !== 'none') {
    return { id: 'flex', why: `You added ${x.diluent === 'CO2' ? 'CO₂' : 'helium'}. FLEX compared those gases on droplet fires.` };
  }
  return { id: 'flex', why: `You are testing ${o2}% oxygen at ${x.psi.toFixed(1)} psi. FLEX is the record of how droplet fires ended in conditions like these.` };
}
