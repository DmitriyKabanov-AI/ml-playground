import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Sparkline } from './charts/Sparkline';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

export function Card({
  title, subtitle, actions, children, className,
}: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-2xl border border-line bg-card shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5 pt-3">{children}</div>
    </section>
  );
}

export function KpiCard({
  label, value, hint, icon: Icon, spark, color = '#818cf8',
}: { label: string; value: string; hint?: string; icon?: LucideIcon; spark?: number[]; color?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        {Icon && <Icon size={16} />}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
      {spark && <div className="-mx-1 mt-3"><Sparkline data={spark} color={color} /></div>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition',
            o.value === value ? 'bg-accent text-white shadow' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SelectField<T extends string | number>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value)!;
          onChange(o.value);
        }}
        className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/40"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function SliderField({
  label, min, max, step = 0.1, value, onChange,
}: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-muted">
      <div className="mb-1 flex justify-between">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-fg">{value.toFixed(1)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[rgb(var(--accent))]" />
    </label>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}
export function DataTable<T>({
  columns, rows, rowKey, highlight,
}: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; highlight?: (r: T) => boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {columns.map((c) => (
              <th key={c.key} className={clsx('px-3 py-2 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className={clsx('border-b border-line/60 last:border-0', highlight?.(r) && 'bg-accent/10')}>
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-3 py-2 tabular-nums', c.align === 'right' && 'text-right')}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const PageLoader = () => (
  <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted">
    <Loader2 className="animate-spin" size={18} /> Загрузка и расчёт моделей…
  </div>
);

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm">
      <AlertTriangle className="mt-0.5 text-red-400" size={18} />
      <div>
        <div className="font-semibold">Не удалось загрузить данные</div>
        <div className="mt-1 text-muted">{error instanceof Error ? error.message : String(error)}</div>
      </div>
    </div>
  );
}

export function Await<T>({ q, children }: { q: UseQueryResult<T>; children: (d: T) => ReactNode }) {
  if (q.isPending) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} />;
  return <>{children(q.data)}</>;
}