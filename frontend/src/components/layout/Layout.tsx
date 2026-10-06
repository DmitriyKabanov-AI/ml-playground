import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Activity, Moon, Sun, Sparkles, TrendingUp, BarChart3, LayoutGrid } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUIStore } from '../../store/ui'
import { useTasks } from '../../data/hooks'
import { categoryFromTask, CATEGORY_LABELS, taskLabel } from '../../lib/category'
import type { Category } from '../../types'

const CATEGORY_ORDER: Category[] = ['classification', 'regression', 'forecasting']

const CATEGORY_ICON_MAP: Record<Category, LucideIcon> = {
  classification: Sparkles,
  regression: TrendingUp,
  forecasting: BarChart3,
}

export function Layout() {
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const { data: tasks } = useTasks()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    tasks: (tasks ?? []).filter((t) => categoryFromTask(t.task) === cat),
  }))

  return (
    <div className="flex min-h-screen bg-surface text-fg">
      <aside className="hidden w-64 flex-col border-r border-line bg-card/50 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2 border-b border-line px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">ML Hub</p>
            <p className="text-xs text-muted">Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-white/5 hover:text-fg'
              }`
            }
          >
            <LayoutGrid size={16} /> Обзор
          </NavLink>
          {grouped.map(({ category, tasks: items }) => (
            <div key={category} className="mb-4">
              <p className="mb-1 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {CATEGORY_LABELS[category]}
              </p>
              <div className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const Icon = CATEGORY_ICON_MAP[category]
                  return (
                    <NavLink
                      key={item.task}
                      to={`/tasks/${item.task}`}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                          isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-white/5 hover:text-fg'
                        }`
                      }
                    >
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate capitalize">{taskLabel(item.task)}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <Activity size={16} />
            </div>
            <p className="text-sm font-bold">ML Hub</p>
          </div>
          <div className="hidden text-sm text-muted lg:block">Панель мониторинга моделей</div>
          <button
            onClick={toggleTheme}
            aria-label="Переключить тему"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/5 text-fg transition hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-2 lg:hidden">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-accent text-white' : 'bg-white/5 text-muted'}`
            }
          >
            Обзор
          </NavLink>
          {(tasks ?? []).map((item) => (
            <NavLink
              key={item.task}
              to={`/tasks/${item.task}`}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-accent text-white' : 'bg-white/5 text-muted'}`
              }
            >
              {taskLabel(item.task)}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}