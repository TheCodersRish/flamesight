import { NavLink } from 'react-router-dom';
import { useDemo } from '../demo/Demo';
import DbSearch from './DbSearch';

const GROUPS = [
  {
    label: 'Story',
    items: [
      { to: '/overview', label: 'Overview' },
      { to: '/', label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Lab',
    items: [
      { to: '/simulator', label: 'Will it burn?' },
      { to: '/insights', label: 'What NASA found' },
      { to: '/fluid-physics', label: 'How flames work' },
      { to: '/scenarios', label: 'Rank risks' },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/explorer', label: 'Browse tests' },
      { to: '/analyst', label: 'Ask a question' },
      { to: '/about', label: 'About' },
      { to: '/ui-variations', label: 'UI variations' },
    ],
  },
];

export default function SideNav() {
  const { running, start, stop } = useDemo();
  return (
    <nav className="workspace-nav flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 bg-space-950/90 px-3 py-2 lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-4 lg:py-5" aria-label="Workspace">
      <NavLink to="/overview" className="mb-4 hidden items-center gap-2 lg:flex" aria-label="FlameSight overview">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-flame-500 to-micro-600 text-sm font-bold text-white">FS</span>
        <span>
          <span className="block text-sm font-semibold tracking-wide text-white">FlameSight</span>
          <span className="block text-xs text-slate-400">Mission workspace</span>
        </span>
      </NavLink>

      {GROUPS.map(group => (
        <div key={group.label} className="contents lg:block lg:mb-4">
          <p className="mb-1.5 hidden px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 lg:block">{group.label}</p>
          {group.items.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm lg:whitespace-normal ${
                  isActive
                    ? 'bg-white/10 font-medium text-white lg:border-l-2 lg:border-flame-400 lg:pl-[10px]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white lg:border-l-2 lg:border-transparent lg:pl-[10px]'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      ))}

      <DbSearch className="mt-2 w-48 shrink-0 lg:mt-2 lg:w-full" />
      <button
        type="button"
        onClick={running ? stop : start}
        className={`mt-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm lg:mt-auto ${running ? 'bg-white/10 text-white' : 'text-flame-300 hover:bg-flame-500/10'}`}
      >
        {running ? 'Stop demo' : 'Guided demo'}
      </button>
    </nav>
  );
}
