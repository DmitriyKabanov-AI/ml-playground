import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { CloudSun, Database, Flower2, LayoutDashboard, Moon, ShoppingCart, Sun, TrendingUp, Activity } from 'lucide-react';
import { useUI } from '../store/ui';
import { isRemote } from '../data/source';
import { PageLoader } from './ui';

const NAV = [
  { to: '/', label: 'Обзор', icon: LayoutDashboard },
  { to: '/classification', label: 'Классификация', icon: Flower2 },
  { to: '/regression', label: 'Регрессия', icon: TrendingUp },
  { to: '/walmart', label: 'Walmart', icon: ShoppingCart },
  { to: '/weather', label: 'Погода', icon: CloudSun },
];

export default function Layout() {
  const { theme, toggleTheme } = useUI();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-card/60 p-4 lg:sticky lg:top-0 lg:block lg:h-screen">
        <div className="mb-8 flex items-center gap-2 px-2 pt-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white"><Activity size={18} /></div>
          <div>
            <div className="text-sm font-bold leading-tight">ML Performance</div>
            <div className="text-xs text-muted">Hub 2.0</div>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-line/50 hover:text-fg')
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Database size={14} />
              <span className={clsx('rounded-full px-2 py-0.5 font-medium', isRemote ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-500')}>
                {isRemote ? 'API подключён' : 'Демо-данные'}
              </span>
            </div>
            <button onClick={toggleTheme} aria-label="Сменить тему" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-card text-muted transition hover:text-fg">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx('flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium',
                    isActive ? 'bg-accent text-white' : 'text-muted')
                }
              >
                <Icon size={14} /> {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}