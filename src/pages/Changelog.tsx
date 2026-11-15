import { Card, PageHeader, Pill } from '../components/ui';
import { CHANGELOG } from '../lib/changelog';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function Changelog() {
  return (
    <div className="space-y-4">
      <PageHeader kicker="Updates" title="Changelog">
        <p>What changed in each FlameSight update — newest first.</p>
      </PageHeader>

      <ol className="relative space-y-4 border-l border-white/10 pl-5 sm:pl-6">
        {CHANGELOG.map((entry, i) => (
          <li key={`${entry.date}-${entry.title}`} className="relative">
            <span
              className="absolute -left-[1.4rem] top-5 h-2.5 w-2.5 rounded-full bg-flame-400 ring-4 ring-[#0b1220] sm:-left-[1.65rem]"
              aria-hidden
            />
            <Card className={i === 0 ? 'shadow-glow' : ''}>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={i === 0 ? 'flame' : 'slate'}>{formatDate(entry.date)}</Pill>
                {i === 0 && <Pill tone="micro">Latest</Pill>}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-white">{entry.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {entry.items.map(item => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-flame-400/80" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
