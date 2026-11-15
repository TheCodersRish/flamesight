import { Link } from 'react-router-dom';
import { useBurn } from '../lib/burnSession';
import { feedingMode } from '../lib/physicsBridge';
import { GRAVITY } from '../lib/scenarios';
import { Pill } from './ui';

/** Shared cabin atmosphere readout — same o₂ / pressure / fan across Will It Burn & Risk Ranking. */
export default function CabinStrip({ compact }: { compact?: boolean }) {
  const { input } = useBurn();
  const feed = feedingMode(input);
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border border-micro-500/30 bg-micro-500/10 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <Pill tone="micro">Shared cabin</Pill>
      <span className="font-mono text-sm text-white">
        {Math.round(input.o2 * 100)}% O₂ · {input.psi.toFixed(1)} psi · {input.flow} cm/s
      </span>
      <span className="text-xs text-slate-400">{GRAVITY[input.gravity].label}</span>
      <Pill tone="slate">{feed.label}</Pill>
      {!compact && (
        <span className="ml-auto flex flex-wrap gap-2 text-xs">
          <Link to="/simulator" className="text-micro-300 hover:underline">Will It Burn?</Link>
          <Link to="/scenarios" className="text-micro-300 hover:underline">Risk Ranking</Link>
          <Link to={`/fluid-physics?mech=${feed.mechId}`} className="text-micro-300 hover:underline">Fluid Physics</Link>
        </span>
      )}
    </div>
  );
}
