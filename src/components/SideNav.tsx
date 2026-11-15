import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useDemo } from '../demo/Demo';
import DbSearch from './DbSearch';

type NavItem = {
  to: string;
  label: string;
  hint: string;
  end?: boolean;
  icon: ReactNode;
};

const iconCls = 'h-4 w-4 shrink-0';

const Icons = {
  overview: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6" />
    </svg>
  ),
  dashboard: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  ),
  burn: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4-2.5 6-5.5 6-9.2C18 7 15.5 4.5 12 3c-3.5 1.5-6 4-6 8.8 0 3.7 2 6.7 6 9.2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17c1.8-1.2 2.7-2.6 2.7-4.4 0-1.8-1.2-3.1-2.7-3.8-1.5.7-2.7 2-2.7 3.8 0 1.8.9 3.2 2.7 4.4Z" />
    </svg>
  ),
  insights: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m4 14V9m4 10V7m4 12v-6m4 6V4" />
    </svg>
  ),
  physics: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="2.25" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
    </svg>
  ),
  risks: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 3.5 19h17L12 3Z" />
      <path strokeLinecap="round" d="M12 10v4.5M12 17.5h.01" />
    </svg>
  ),
  browse: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v14.5A1.5 1.5 0 0 1 17.5 20H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path strokeLinecap="round" d="M8 8h8M8 12h6" />
    </svg>
  ),
  ask: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19a7 7 0 1 0-6.3-4L4 20l5.2-1.4A7 7 0 0 0 12 19Z" />
      <path strokeLinecap="round" d="M9.8 11.2c0-1.3 1-2.2 2.2-2.2s2.2.9 2.2 2.1c0 1.1-.7 1.6-1.5 2.1-.5.3-.7.6-.7 1.2M12 16.2h.01" />
    </svg>
  ),
  about: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" d="M12 11v5.5M12 8h.01" />
    </svg>
  ),
  ui: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h7" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="14" cy="17" r="2" />
    </svg>
  ),
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Story',
    items: [
      { to: '/overview', label: 'Overview', hint: 'Mission brief', icon: Icons.overview },
      { to: '/', label: 'Dashboard', end: true, hint: 'Live workspace', icon: Icons.dashboard },
    ],
  },
  {
    label: 'Lab',
    items: [
      { to: '/simulator', label: 'Will it burn?', hint: 'Run a flame test', icon: Icons.burn },
      { to: '/insights', label: 'What NASA found', hint: 'Charts & findings', icon: Icons.insights },
      { to: '/fluid-physics', label: 'How flames work', hint: 'Microgravity physics', icon: Icons.physics },
      { to: '/scenarios', label: 'Rank risks', hint: 'Score every study', icon: Icons.risks },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/explorer', label: 'Browse tests', hint: 'All investigations', icon: Icons.browse },
      { to: '/analyst', label: 'Ask a question', hint: 'NASA-grounded Q&A', icon: Icons.ask },
      { to: '/about', label: 'About', hint: 'Method & sources', icon: Icons.about },
      { to: '/ui-variations', label: 'UI variations', hint: 'Design skins', icon: Icons.ui },
    ],
  },
];

export default function SideNav() {
  const { running, start, stop } = useDemo();
  return (
    <nav className="workspace-nav flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 px-3 py-2.5 lg:w-64 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-3 lg:py-5" aria-label="Workspace">
      <NavLink to="/overview" className="nav-brand mb-5 hidden items-center gap-3 rounded-xl px-2 py-1.5 lg:flex" aria-label="FlameSight overview">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-flame-400 via-flame-500 to-micro-600 text-sm font-bold text-white shadow-glow">FS</span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold tracking-[0.04em] text-white">FlameSight</span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Mission workspace</span>
        </span>
      </NavLink>

      <div className="flex min-w-0 flex-1 items-stretch gap-2 lg:flex-col lg:gap-0">
        {GROUPS.map((group, gi) => (
          <div
            key={group.label}
            className={`contents lg:mb-4 lg:block ${gi > 0 ? 'lg:border-t lg:border-white/10 lg:pt-4' : ''}`}
          >
            <p className="mb-2 hidden px-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:block">{group.label}</p>
            <div className="contents lg:space-y-1 lg:block">
              {group.items.map(n => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  title={n.hint}
                  className={({ isActive }) =>
                    `nav-item group relative flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors duration-150 lg:w-full lg:whitespace-normal ${
                      isActive
                        ? 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_0_rgba(255,159,67,0.95)]'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`grid h-7 w-7 place-items-center rounded-lg border transition-colors ${
                        isActive
                          ? 'border-flame-400/40 bg-flame-500/15 text-flame-300'
                          : 'border-white/10 bg-white/5 text-slate-400 group-hover:border-white/20 group-hover:text-slate-200'
                      }`}>
                        {n.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block leading-tight">{n.label}</span>
                        <span className={`mt-0.5 hidden text-[11px] leading-tight lg:block ${isActive ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'}`}>
                          {n.hint}
                        </span>
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-2 lg:border-t lg:border-white/10 lg:pt-4">
        <DbSearch className="w-44 lg:w-full" />
        <button
          type="button"
          onClick={running ? stop : start}
          className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors lg:w-full ${
            running
              ? 'border border-white/15 bg-white/10 text-white'
              : 'border border-flame-500/30 bg-flame-500/10 text-flame-300 hover:border-flame-400/50 hover:bg-flame-500/15 hover:text-flame-200'
          }`}
        >
          {running ? 'Stop demo' : 'Guided demo'}
        </button>
      </div>
    </nav>
  );
}
