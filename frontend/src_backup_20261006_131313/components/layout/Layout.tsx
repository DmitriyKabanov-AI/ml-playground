import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Activity, Database, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { useUI } from '@/store/ui';
import { PageLoader } from '@/components/ui';

export default function Layout() {
  const { theme, toggleTheme } = useUI();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-card/60 p-4 lg:sticky lg:top-0 lg:block lg:h-screen">
        <div className="mb-8 flex items-center gap-2 px-2 pt-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white">
            <Activity size={18} />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">ML Performance</div>
            <div className="text-xs text-muted">Hub 2.0</div>
          </div>
        </div>
        <nav className="space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-line/50 hover:text-fg',
              )
            }
          >
            <LayoutDashboard size={18} /> Все задачи
          </NavLink>
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Database size={14} />
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-400">
                API: /api
              </span>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Сменить тему"
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-card text-muted transition hover:text-fg"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}