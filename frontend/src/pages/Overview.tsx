import { Sparkles, TrendingUp, BarChart3, LayoutGrid, Boxes, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTasks } from '../data/hooks'
import { Loader } from '../components/ui/Loader'
import { ErrorState } from '../components/ui/ErrorState'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { categoryFromTask, CATEGORY_LABELS, taskLabel } from '../lib/category'
import type { Category, TaskSummary } from '../types'

const CATEGORY_ORDER: Category[] = ['classification', 'regression', 'forecasting']

const CATEGORY_ICON_MAP: Record<Category, LucideIcon> = {
  classification: Sparkles,
  regression: TrendingUp,
  forecasting: BarChart3,
}

export default function Overview() {
  const { data, isLoading, isError, refetch } = useTasks()

  if (isLoading) return <Loader text="Загрузка задач..." />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const totalModels = data.reduce((sum, t) => sum + t.n_models, 0)
  const totalActive = data.reduce((sum, t) => sum + t.n_active, 0)

  return (
    <div>
      <PageHeader title="Обзор" subtitle="Состояние всех задач и моделей ML-платформы" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Всего задач" value={data.length} icon={LayoutGrid} />
        <StatCard label="Всего моделей" value={totalModels} icon={Boxes} />
        <StatCard label="Активных моделей" value={totalActive} icon={CheckCircle2} />
      </div>

      {CATEGORY_ORDER.map((category) => {
        const items = data.filter((t) => categoryFromTask(t.task) === category)
        if (items.length === 0) return null
        const Icon = CATEGORY_ICON_MAP[category]
        return (
          <section key={category} className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Icon size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
              <Badge tone="neutral">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((task) => (
                <TaskCard key={task.task} task={task} icon={Icon} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TaskCard({ task, icon: Icon }: { task: TaskSummary; icon: LucideIcon }) {
  const ok = task.n_active > 0
  return (
    <Link to={`/tasks/${task.task}`}>
      <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon size={18} />
          </div>
          <Badge tone={ok ? 'success' : 'warning'}>{ok ? 'ok' : 'check'}</Badge>
        </div>
        <h3 className="mt-4 text-sm font-semibold capitalize text-fg">{taskLabel(task.task)}</h3>
        <p className="mt-1 text-xs text-muted">{task.task}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted">
          <span>
            Моделей: <span className="font-semibold text-fg">{task.n_models}</span>
          </span>
          <span>
            Активных: <span className="font-semibold text-fg">{task.n_active}</span>
          </span>
        </div>
      </Card>
    </Link>
  )
}