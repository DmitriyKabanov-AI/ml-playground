"use client";

import type { ReactNode } from "react";
import { Activity, CarFront, Database, Layers3, Plane, Trees, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DatasetReport,
  ModelResult,
  Task,
  fmt,
  fmtInt,
  fmtPct,
  metric,
} from "./types";

const TASK_STYLE: Record<Task, { eyebrow: string; accent: string; glow: string; icon: LucideIcon; note: string }> = {
  flight_delay: {
    eyebrow: "FLIGHT OPERATIONS / RISK",
    accent: "from-sky-500 to-indigo-500",
    glow: "bg-sky-500/15",
    icon: Plane,
    note: "Классификация операционного риска до вылета",
  },
  taxi_payment: {
    eyebrow: "MOBILITY / MULTICLASS",
    accent: "from-amber-500 to-orange-500",
    glow: "bg-amber-500/15",
    icon: CarFront,
    note: "Профиль платёжных классов реальных поездок",
  },
  cover_type: {
    eyebrow: "ENVIRONMENT / LAND COVER",
    accent: "from-emerald-500 to-teal-500",
    glow: "bg-emerald-500/15",
    icon: Trees,
    note: "Семиклассовая модель картографических наблюдений",
  },
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-1.5">{eyebrow}</p>}
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-3xl">{description}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

export function DashboardHero({ task, report, selected }: { task: Task; report: DatasetReport; selected: ModelResult }) {
  const style = TASK_STYLE[task];
  const Icon = style.icon;
  const heroMetric = report.meta.hero_metric ?? "f1_macro";
  const heroValue = metric(selected, heroMetric);
  const dataset = report.meta.dataset_stats;

  return (
    <Card className="relative overflow-hidden !p-0">
      <div className={`absolute -right-16 -top-20 h-72 w-72 rounded-full ${style.glow} blur-3xl pointer-events-none`} />
      <div className="absolute right-28 -bottom-28 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <div className="relative grid gap-6 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_270px] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${style.accent} text-white shadow-lg shadow-indigo-500/10`}>
              <Icon size={19} />
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.18em] text-slate-500">{style.eyebrow}</span>
            <Badge tone="info">Spark MLlib</Badge>
            {selected.is_best && <Badge tone="success">Лучшая модель</Badge>}
            {selected.is_naive && <Badge tone="warning">Baseline</Badge>}
          </div>
          <h2 className="text-2xl md:text-[28px] font-black tracking-tight text-slate-900 dark:text-white">{report.meta.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">{report.meta.subtitle}</p>
          {report.meta.description && <p className="text-xs text-slate-500 mt-3 max-w-4xl leading-relaxed">{report.meta.description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Database size={13} /> <b className="text-slate-700 dark:text-slate-200">{fmtInt(dataset.n_samples)}</b> наблюдений</span>
            <span className="inline-flex items-center gap-1.5"><Layers3 size={13} /> <b className="text-slate-700 dark:text-slate-200">{fmtInt(dataset.n_features)}</b> признаков</span>
            <span className="inline-flex items-center gap-1.5"><Activity size={13} /> <b className="text-slate-700 dark:text-slate-200">{fmtInt(dataset.n_classes)}</b> классов</span>
            <span><b className="text-slate-700 dark:text-slate-200">{fmtInt(dataset.n_train)}</b> train <span className="mx-1 text-slate-400">/</span> <b className="text-slate-700 dark:text-slate-200">{fmtInt(dataset.n_test)}</b> test</span>
          </div>
          {report.meta.source && <div className="mt-4 text-[11px] text-slate-500">Источник: {report.meta.source}{report.meta.source_url && <> · <a className="text-indigo-500 hover:text-cyan-500 hover:underline" href={report.meta.source_url} target="_blank" rel="noreferrer">источник данных ↗</a></>}</div>}
        </div>
        <div className="rounded-2xl border border-indigo-400/20 bg-slate-950/[0.025] dark:bg-slate-950/30 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.15em] font-bold text-slate-500">
            <span>Основная метрика</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.5)]" />
          </div>
          <div className="mt-4 text-5xl font-black tracking-[-0.06em] bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent tabular-nums">{fmt(heroValue, 3)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="info">{heroMetric.replaceAll("_", "-")}</Badge>
            <span className="text-xs text-slate-500">{selected.name}</span>
          </div>
          <div className="mt-5 h-px bg-slate-500/10" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><p className="text-[10px] uppercase tracking-wider text-slate-500">Weighted-F1</p><p className="text-lg font-bold mt-1 tabular-nums">{fmt(metric(selected, "f1_weighted"), 3)}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-500">Accuracy</p><p className="text-lg font-bold mt-1 tabular-nums">{fmtPct(metric(selected, "accuracy"))}</p></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ModelSwitcher({ report, selected, onSelect }: { report: DatasetReport; selected: ModelResult; onSelect: (name: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-bold">Model workspace</p><h3 className="text-sm font-bold mt-1">Сравнение кандидатов</h3></div>
        <span className="text-[10px] text-slate-500">{report.models.length} модели · кликните для переключения отчёта</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {report.models.map((model, index) => {
          const active = model.name === selected.name;
          const macro = metric(model, "f1_macro");
          return (
            <button
              type="button"
              key={model.name}
              aria-pressed={active}
              onClick={() => onSelect(model.name)}
              className={`group text-left rounded-xl border p-3.5 transition-all ${active ? "border-indigo-400/50 bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 shadow-[inset_0_0_0_1px_rgba(99,102,241,.14)]" : "border-border bg-slate-500/[0.025] hover:bg-slate-500/[0.06] hover:border-indigo-400/25"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${model.is_naive ? "bg-amber-400" : model.is_best ? "bg-emerald-400" : index === 1 ? "bg-cyan-400" : "bg-violet-400"}`} />
                    <p className={`text-xs font-bold truncate ${active ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>{model.name}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Train rows · {fmtInt(model.train_rows ?? 0)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-xl font-black tracking-tight tabular-nums ${active ? "text-indigo-500" : "text-slate-700 dark:text-slate-200"}`}>{fmt(macro, 3)}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Macro-F1</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-slate-500/10 overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${active ? "from-indigo-500 to-cyan-400" : model.is_naive ? "from-amber-400 to-orange-400" : "from-violet-500 to-indigo-400"}`} style={{ width: `${Math.max(0, Math.min(100, (macro ?? 0) * 100))}%` }} /></div>
              <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-500"><span>Weighted-F1 <b className="text-slate-700 dark:text-slate-200">{fmt(metric(model, "f1_weighted"), 3)}</b></span><span>Accuracy <b className="text-slate-700 dark:text-slate-200">{fmtPct(metric(model, "accuracy"))}</b></span></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KpiCard({ label, value, note, tone = "indigo", icon }: { label: string; value: string; note: string; tone?: "indigo" | "cyan" | "emerald" | "amber" | "rose"; icon?: ReactNode }) {
  const toneClass: Record<NonNullable<typeof tone>, { text: string; glow: string }> = {
    indigo: { text: "text-indigo-500", glow: "bg-indigo-500/10" },
    cyan: { text: "text-cyan-500", glow: "bg-cyan-500/10" },
    emerald: { text: "text-emerald-500", glow: "bg-emerald-500/10" },
    amber: { text: "text-amber-500", glow: "bg-amber-500/10" },
    rose: { text: "text-rose-500", glow: "bg-rose-500/10" },
  };
  const style = toneClass[tone];
  return (
    <Card className="relative overflow-hidden !p-4">
      <div className={`absolute -right-5 -top-7 h-20 w-20 rounded-full ${style.glow} blur-2xl pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.13em] leading-snug font-bold text-slate-500">{label}</p><p className={`text-2xl font-black tracking-tight mt-2 tabular-nums ${style.text}`}>{value}</p><p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{note}</p></div>
        {icon && <span className={`grid place-items-center h-9 w-9 rounded-xl ${style.glow} ${style.text} shrink-0`}>{icon}</span>}
      </div>
    </Card>
  );
}

export function InsightNote({ label, children, tone = "indigo" }: { label: string; children: ReactNode; tone?: "indigo" | "amber" | "emerald" }) {
  const styles = {
    indigo: "border-indigo-400/20 bg-indigo-500/[0.045]",
    amber: "border-amber-400/25 bg-amber-500/[0.045]",
    emerald: "border-emerald-400/20 bg-emerald-500/[0.045]",
  };
  return <div className={`rounded-xl border px-4 py-3.5 ${styles[tone]}`}><p className="text-[10px] uppercase tracking-[0.14em] font-extrabold text-slate-500 mb-1.5">{label}</p><div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{children}</div></div>;
}
