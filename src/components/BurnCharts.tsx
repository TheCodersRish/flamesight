import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Neighbor } from '../lib/knn';

const axis = { stroke: '#475569', tick: { fill: '#94a3b8', fontSize: 10 } };

function shortId(id: string): string {
  const hash = id.match(/#\S+/)?.[0];
  return (hash || id).slice(0, 12);
}

export default function BurnCharts({ nearby, o2, p }: { nearby: Neighbor[]; o2: number; p: number }) {
  const rows = nearby.map(n => ({
    name: shortId(n.t.id),
    burn: Math.round(n.t.burn * 100),
    testO2: Math.round(n.t.o2 * 100),
    fuel: n.t.fuel,
    outcome: n.t.outcome || 'not listed',
  }));
  const you = Math.round(o2 * 100);
  const score = Math.round(p * 100);
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">Closest NASA tests · burn score</p>
        <div className="h-40 w-full">
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#1e293b" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} {...axis} />
              <YAxis type="category" dataKey="name" width={64} {...axis} />
              <Tooltip formatter={(v: number, _n, item) => [`${v} · ${(item?.payload as { outcome: string }).outcome}`, 'Burn score']} />
              <ReferenceLine x={score} stroke="#67e8f9" strokeDasharray="4 3" label={{ value: `you ${score}`, fill: '#67e8f9', fontSize: 10, position: 'insideTopRight' }} />
              <Bar dataKey="burn" radius={[0, 3, 3, 0]}>
                {rows.map(r => <Cell key={r.name} fill={r.burn >= 80 ? '#fb7185' : r.burn >= 50 ? '#facc15' : '#5cb8ff'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">Their oxygen vs yours ({you}%)</p>
        <div className="h-36 w-full">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="name" {...axis} interval={0} />
              <YAxis {...axis} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Test oxygen']} />
              <ReferenceLine y={you} stroke="#ff9f43" strokeDasharray="4 3" />
              <Bar dataKey="testO2" name="Test oxygen" fill="#5cb8ff" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Cyan line on the first chart is your predicted score. Orange line on the second is the oxygen you set. Scores: 100 kept burning, 60 went out on their own, 0 never caught fire.</p>
      </div>
    </div>
  );
}
