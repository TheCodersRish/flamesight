import Flame from '../components/Flame';
import { PageHeader } from '../components/ui';

// Hidden page (#/flame-lab): side-by-side flame states, handy for checking the shader.
const CASES = [
  { t: 'Microgravity, air', gravity: 0, o2: 0.4, flow: 0, dilution: 0 },
  { t: 'Microgravity, high O₂', gravity: 0, o2: 1, flow: 0, dilution: 0 },
  { t: 'Microgravity + 20 cm/s flow', gravity: 0, o2: 0.5, flow: 0.5, dilution: 0 },
  { t: 'Microgravity + CO₂', gravity: 0, o2: 0.4, flow: 0, dilution: 0.65 },
  { t: 'Moon (0.17 g)', gravity: 0.4, o2: 0.5, flow: 0, dilution: 0 },
  { t: 'Mars (0.38 g)', gravity: 0.62, o2: 0.5, flow: 0.5, dilution: 0 },
  { t: 'Earth (1 g)', gravity: 1, o2: 0.4, flow: 0, dilution: 0 },
  { t: 'Earth + flow', gravity: 1, o2: 0.6, flow: 0.5, dilution: 0 },
];
export default function FlameLab() {
  return (
    <div>
      <PageHeader kicker="Flame lab" title="Flame engine states" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CASES.map(c => (
          <div key={c.t} className="glass overflow-hidden rounded-2xl">
            <Flame gravity={c.gravity} o2={c.o2} flow={c.flow} dilution={c.dilution} className="h-56 w-full" />
            <p className="px-3 py-2 text-xs text-slate-300">{c.t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
