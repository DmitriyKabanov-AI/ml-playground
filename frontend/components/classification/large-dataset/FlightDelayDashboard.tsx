"use client";

import { AlertTriangle, CheckCircle2, Clock3, Target, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClassDistributionPanel, ClassPerformancePanel, ConfusionMatrixPanel, ModelComparisonPanel, ModelMetricsTable } from "./Charts";
import { DashboardHero, InsightNote, KpiCard, ModelSwitcher, SectionHeading } from "./Shared";
import { DatasetReport, ModelResult, fmtInt, fmtPct, getClassDistribution, getMatrixStats, getPositiveClassIndex, metric } from "./types";

export function FlightDelayDashboard({ report, selected, onSelect }: { report: DatasetReport; selected: ModelResult; onSelect: (name: string) => void }) {
  const positiveIndex = getPositiveClassIndex(report);
  const positiveLabel = report.meta.classes[positiveIndex] ?? "Delayed ≥15 min";
  const otherLabel = report.meta.classes.find((_, index) => index !== positiveIndex) ?? "Other";
  const stats = getMatrixStats(selected.confusion_matrix ?? [], positiveIndex);
  const distribution = getClassDistribution(report);
  const total = distribution.reduce((sum, row) => sum + row.count, 0) || report.meta.dataset_stats.n_samples || 1;
  const delayShare = distribution.find((row) => row.label === positiveLabel)?.count ?? 0;
  const delayRecall = selected.per_class?.[positiveLabel]?.recall ?? selected.per_class_recall?.[positiveLabel] ?? metric(selected, "recall_macro");
  const delayPrecision = selected.per_class?.[positiveLabel]?.precision ?? metric(selected, "precision_macro");
  const specificity = stats.tn + stats.fp > 0 ? stats.tn / (stats.tn + stats.fp) : null;
  const missRate = stats.positiveSupport > 0 ? stats.fn / stats.positiveSupport : null;

  return (
    <div className="space-y-5">
      <DashboardHero task="flight_delay" report={report} selected={selected} />
      <ModelSwitcher report={report} selected={selected} onSelect={onSelect} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Recall · delayed flights" value={fmtPct(delayRecall)} note="Доля задержек ≥ 15 мин, найденных моделью" tone="cyan" icon={<Target size={17} />} />
        <KpiCard label="Precision · delay alert" value={fmtPct(delayPrecision)} note="Доля реальных задержек среди тревог" tone="indigo" icon={<CheckCircle2 size={17} />} />
        <KpiCard label="Delay prevalence" value={fmtPct(delayShare / total, 2)} note={`${fmtInt(delayShare)} задержанных рейсов в данных`} tone="amber" icon={<Clock3 size={17} />} />
        <KpiCard label="Missed delays · test" value={fmtInt(stats.fn)} note={missRate === null ? "False negatives" : `${fmtPct(missRate)} от всех фактических задержек`} tone="rose" icon={<AlertTriangle size={17} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.04fr_.96fr]">
        <ClassDistributionPanel report={report} title="Состав полётного потока" description="Исходный баланс рейсов без применения oversampling или прореживания классов." />
        <Card className="!p-4 md:!p-5">
          <SectionHeading eyebrow="OPERATIONAL IMPACT" title="Что означают ошибки модели" description="Счётчики построены из confusion matrix выбранной модели на тестовой выборке." trailing={<Badge tone="info">Test split</Badge>} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.045] p-3.5"><div className="flex items-center gap-2 text-emerald-500"><CheckCircle2 size={15} /><span className="text-[10px] font-bold uppercase tracking-wider">Correct delay alerts</span></div><p className="text-2xl font-black mt-3 tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(stats.tp)}</p><p className="text-[10px] text-slate-500 mt-1">Верно найденные задержки</p></div>
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.045] p-3.5"><div className="flex items-center gap-2 text-rose-500"><AlertTriangle size={15} /><span className="text-[10px] font-bold uppercase tracking-wider">Missed delays</span></div><p className="text-2xl font-black mt-3 tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(stats.fn)}</p><p className="text-[10px] text-slate-500 mt-1">Задержки, которые пропущены</p></div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.045] p-3.5"><div className="flex items-center gap-2 text-amber-500"><XCircle size={15} /><span className="text-[10px] font-bold uppercase tracking-wider">False alarms</span></div><p className="text-2xl font-black mt-3 tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(stats.fp)}</p><p className="text-[10px] text-slate-500 mt-1">Рейсы без задержки, отмеченные как риск</p></div>
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.045] p-3.5"><div className="flex items-center gap-2 text-sky-500"><Target size={15} /><span className="text-[10px] font-bold uppercase tracking-wider">On-time specificity</span></div><p className="text-2xl font-black mt-3 tabular-nums text-slate-800 dark:text-slate-100">{fmtPct(specificity)}</p><p className="text-[10px] text-slate-500 mt-1">Доля вовремя прибывающих без ложной тревоги</p></div>
          </div>
          <div className="mt-4 rounded-xl border border-border/70 bg-slate-500/[0.025] p-3.5"><p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Positive class</p><p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">{positiveLabel}</p><p className="text-[10px] text-slate-500 mt-1">Negative class: {otherLabel}. Порог решения не меняется из интерфейса; отображаются сохранённые прогнозы модели.</p></div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ModelComparisonPanel report={report} selected={selected} />
        <ClassPerformancePanel report={report} model={selected} title="Recall vs precision: on-time и delayed" description="Для операционного сценария особенно важен recall класса задержек: пропущенный риск не попадёт в оповещение." />
      </div>

      <ConfusionMatrixPanel report={report} model={selected} title="Матрица ошибок задержки рейса" description="Отдельно показывает найденные задержки, пропуски и ложные срабатывания на тестовой выборке." />
      <ModelMetricsTable report={report} selected={selected} />
      <InsightNote label="Как читать этот экран" tone="indigo">Модель использует только сведения, доступные до вылета: календарь, плановое время, авиакомпанию и аэропорты. Значения фактической задержки и фактических времён не используются как признаки. Для эксплуатационного выбора сравнивайте recall задержек с количеством false alarms, а не только общую accuracy.</InsightNote>
    </div>
  );
}
