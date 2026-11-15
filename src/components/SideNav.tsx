import { NavLink } from 'react-router-dom';
import { useDemo } from '../demo/Demo';
import DbSearch from './DbSearch';

const NAV = [
  { to: '/overview', label: 'Overview' },
  { to: '/', label: 'Will It Burn?', end: true },
  { to: '/insights', label: 'Insights' },
  { to: '/fluid-physics', label: 'Fluid Physics' },
  { to: '/explorer', label: 'Experiments' },
  { to: '/scenarios', label: 'Rank risks' },
  { to: '/analyst', label: 'Analyst' },
  { to: '/new-features', label: 'New Features' },
  { to: '/about', label: 'About' },
];

export default function SideNav() {
  const { running, start, stop } = useDemo();
  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 bg-space-950/90 px-3 py-2 lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-4 lg:py-5" aria-label="Menu">
      <NavLink to="/overview" className="mb-3 hidden items-center gap-2 lg:flex" aria-label="FlameSight overview">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-flame-500 to-micro-600 text-sm font-bold text-white">FS</span>
        <span>
          <span className="block text-sm font-semibold tracking-wide text-white">FlameSight</span>
          <span className="block text-xs text-slate-400">Fire in space</span>
        </span>
      </NavLink>
      {NAV.map(n => (
        <NavLink key={n.to} to={n.to} end={n.end}
          className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm lg:whitespace-normal ${isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>{n.label}</NavLink>
      ))}
      <DbSearch className="mt-2 w-48 shrink-0 lg:mt-4 lg:w-full" />
      <button type="button" onClick={running ? stop : start} className={`mt-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm lg:mt-auto ${running ? 'bg-white/10 text-white' : 'text-flame-300 hover:bg-flame-500/10'}`}>
        {running ? 'Stop demo' : 'Guided demo'}
      </button>
    </nav>
  );
}
