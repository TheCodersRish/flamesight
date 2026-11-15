import { useEffect, useState, type ReactNode } from 'react';
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
const NAV_KEY = 'flamesight-nav-collapsed';

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
  impact: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="3.5" />
      <path strokeLinecap="round" d="M7.5 7.5l2 2M14.5 14.5l2 2M16.5 7.5l-2 2M9.5 14.5l-2 2" />
    </svg>
  ),
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Start here',
    items: [
      { to: '/overview', label: 'Overview', hint: 'The big picture', icon: Icons.overview },
      { to: '/', label: 'Dashboard', end: true, hint: 'Try a cabin setup', icon: Icons.dashboard },
    ],
  },
  {
    label: 'Explore',
    items: [
      { to: '/simulator', label: 'Will it burn?', hint: 'Yes / maybe / no', icon: Icons.burn },
      { to: '/insights', label: 'What NASA found', hint: 'Simple takeaways', icon: Icons.insights },
      { to: '/fluid-physics', label: 'How flames work', hint: 'Why space fire looks odd', icon: Icons.physics },
      { to: '/scenarios', label: 'Rank risks', hint: 'Pick a mission', icon: Icons.risks },
      { to: '/impact', label: 'Test next', hint: 'Gaps, reports, cases', icon: Icons.impact },
    ],
  },
  {
    label: 'More',
    items: [
      { to: '/explorer', label: 'Browse tests', hint: 'All NASA studies', icon: Icons.browse },
      { to: '/analyst', label: 'Ask a question', hint: 'Plain-language answers', icon: Icons.ask },
      { to: '/about', label: 'About', hint: 'Where numbers come from', icon: Icons.about },
    ],
  },
];

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_KEY) === '1';
  } catch {
    return false;
  }
}

export default function SideNav() {
  const { running, start, stop } = useDemo();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c;
      try {
        localStorage.setItem(NAV_KEY, next ? '1' : '0');
      } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <>
      {/* Mobile top bar with menu toggle */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(o => !o)}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
          aria-expanded={mobileOpen}
          aria-controls="workspace-nav"
        >
          {mobileOpen ? 'Hide menu' : 'Menu'}
        </button>
        <NavLink to="/overview" className="flex min-w-0 items-center gap-2" aria-label="FlameSight overview">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-flame-400 via-flame-500 to-micro-600 text-xs font-bold text-white">FS</span>
          <span className="truncate text-sm font-semibold text-white">FlameSight</span>
        </NavLink>
      </div>

      <nav
        id="workspace-nav"
        className={`workspace-nav shrink-0 border-white/10 ${
          mobileOpen ? 'flex' : 'hidden'
        } flex-col gap-0 overflow-y-auto border-b px-3 py-3 lg:flex lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-2 lg:py-4 ${
          collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'
        }`}
        aria-label="Workspace"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div className={`mb-3 hidden items-center gap-2 lg:flex ${collapsed ? 'flex-col' : ''}`}>
          <NavLink
            to="/overview"
            className={`nav-brand flex items-center gap-3 rounded-xl px-1.5 py-1.5 ${collapsed ? 'justify-center' : 'flex-1'}`}
            aria-label="FlameSight overview"
            title="FlameSight"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-flame-400 via-flame-500 to-micro-600 text-sm font-bold text-white shadow-glow">FS</span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold tracking-[0.04em] text-white">FlameSight</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">Fire safety, made clear</span>
              </span>
            )}
          </NavLink>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
              )}
            </svg>
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {GROUPS.map((group, gi) => (
            <div
              key={group.label}
              className={`${gi > 0 ? 'mt-3 border-t border-white/10 pt-3' : ''}`}
            >
              {!collapsed && (
                <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">{group.label}</p>
              )}
              <div className="space-y-1">
                {group.items.map(n => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    title={collapsed ? `${n.label} — ${n.hint}` : n.hint}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `nav-item group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm will-change-transform ${
                        collapsed ? 'justify-center lg:px-2' : ''
                      } ${
                        isActive
                          ? 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_0_rgba(255,159,67,0.95)]'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`grid h-7 w-7 place-items-center rounded-lg border ${
                          isActive
                            ? 'border-flame-400/40 bg-flame-500/15 text-flame-300 scale-105'
                            : 'border-white/10 bg-white/5 text-slate-400 group-hover:border-white/20 group-hover:text-slate-200 group-hover:scale-105'
                        }`}>
                          {n.icon}
                        </span>
                        {!collapsed && (
                          <span className="min-w-0 flex-1">
                            <span className="block leading-tight">{n.label}</span>
                            <span className={`mt-0.5 block text-[11px] leading-tight ${isActive ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'}`}>
                              {n.hint}
                            </span>
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 ${collapsed ? 'items-stretch' : ''}`}>
          {!collapsed && <DbSearch className="w-full" />}
          <button
            type="button"
            onClick={running ? stop : start}
            title={running ? 'Stop demo' : 'Guided demo'}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              collapsed ? 'px-2 text-center text-xs' : 'text-left'
            } ${
              running
                ? 'border border-white/15 bg-white/10 text-white'
                : 'border border-flame-500/30 bg-flame-500/10 text-flame-300 hover:border-flame-400/50 hover:bg-flame-500/15 hover:text-flame-200'
            }`}
          >
            {collapsed ? (running ? 'Stop' : 'Demo') : (running ? 'Stop demo' : 'Guided demo')}
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white lg:block"
          >
            {collapsed ? 'Show labels' : 'Collapse menu'}
          </button>
        </div>
      </nav>
    </>
  );
}
