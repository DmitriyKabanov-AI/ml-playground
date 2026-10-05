import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import { Await, PageHeader } from '@/components/ui';
import { useTasks } from '@/data/hooks';
import type { Category, TaskSummary } from '@/types';

const CATEGORY_META: Record<
  Category,
  { label: string; metric: string; accent: string; Icon: typeof Sparkles }
> = {
  classification: {
    label: 'Классификация',
    metric: 'f1_macro',
    accent: 'text-cyan-400',
    Icon: Sparkles,
  },
  regression: {
    label: 'Регрессия',
    metric: 'rmse',
    accent: 'text-amber-400',
    Icon: TrendingUp,
  },
  forecasting: {
    label: 'Прогнозирование',
    metric: 'skill_avg',
    accent: 'text-violet-400',
    Icon: BarChart3,
  },
};

function categoryOf(task: string): Category {
  const c = task.split('_', 1)[0];
  if (c === 'classification' || c === 'regression' || c === 'forecasting') return c;
  return 'classification';
}

export default function OverviewPage() {
  const q = useTasks();
  return (
    <>
      <PageHeader
        title="Все задачи"
        subtitle="Модели из PostgreSQL. Клик по задаче — метрики и сравнение моделей."
      />
      <Await q={q}>{(tasks) => <View tasks={tasks} />}</Await>
    </>
  );
}

function View({ tasks }: { tasks: TaskSummary[] }) {
  const grouped = useMemo(() => {
    const g: Record<Category, TaskSummary[]> = {
      classification: [],
      regression: [],
      forecasting: [],
    };
    tasks.forEach((t) => g[categoryOf(t.task)].push(t));
    return g;
  }, [tasks]);

  const totalModels = tasks.reduce((s, t) => s + t.n_models, 0);
  const totalActive = tasks.reduce((s, t) => s + t.n_active, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Задач" value={tasks.length} />
        <StatCard label="Моделей" value={totalModels} />
        <StatCard
          label="Активных"
          value={totalActive}
          hint={totalActive === tasks.length ? 'по одной на задачу' : 'есть расхождения'}
          tone={totalActive === tasks.length ? 'good' : 'warn'}
        />
      </div>

      {(Object.keys(grouped) as Category[]).map((cat) => {
        const list = grouped[cat];
        if (!list.length) return null;
        const meta = CATEGORY_META[cat];
        const { Icon } = meta;
        return (
          <section key={cat}>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h2 className="text-lg font-semibold">{meta.label}</h2>
              <span className="text-xs text-muted">
                {list.length} задач · метрика:{' '}
                <code className="rounded bg-line/60 px-1.5 py-0.5">{meta.metric}</code>
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => {
                const ok = t.n_active === 1;
                return (
                  <Link
                    key={t.task}
                    to={`/tasks/${t.task}`}
                    className="group rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:border-accent/60 hover:bg-card/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold" title={t.task}>
                          {t.task}
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          моделей: {t.n_models} · активных: {t.n_active}
                        </div>
                      </div>
                      <ArrowRight
                        size={16}
                        className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className={`inline-flex items-center gap-1.5 ${meta.accent}`}>
                        <Icon size={14} />
                        {meta.metric}
                      </span>
                      <span
                        className={
                          'rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                          (ok
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-500')
                        }
                      >
                        {ok ? 'ok' : 'check'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const toneCls =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-400'
        : 'text-fg';
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}