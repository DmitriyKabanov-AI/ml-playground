"use client";

import { Compass, Layers3, Mountain, Sprout } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClassDistributionPanel, ClassPerformancePanel, ConfusionMatrixPanel, ModelComparisonPanel, ModelMetricsTable, RareClassPanel } from "./Charts";
import { DashboardHero, InsightNote, KpiCard, ModelSwitcher, SectionHeading } from "./Shared";
import { DatasetReport, ModelResult, fmt, fmtInt, fmtPct, metric } from "./types";

export function ForestCoverDashboard({ report, selected, onSelect }: { report: DatasetReport; selected: ModelResult; onSelect: (name: string) => void }) {
  const stats = report.meta.dataset_stats;
  const macro = metric(selected, "f1_macro");
  const weighted = metric(selected, "f1_weighted");
  const gap = macro !== null && weighted !== null ? weighted - macro : null;

  return (
    <div className="space-y-5">
      <DashboardHero task="cover_type" report={report} selected={selected} />
      <ModelSwitcher report={report} selected={selected} onSelect={onSelect} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Macro-F1" value={fmt(macro)} note="Равный вес всем семи типам леса" tone="indigo" icon={<Compass size={17} />} />
        <KpiCard label="Weighted-F1" value={fmt(weighted)} note="Качество с весами по support классов" tone="cyan" icon={<Sprout size={17} />} />
        <KpiCard label="Balanced accuracy" value={fmtPct(metric(selected, "balanced_accuracy"))} note="Среднее значение recall по классам" tone="emerald" icon={<Mountain size={17} />} />
        <KpiCard label="Feature space" value={fmtInt(stats.n_features)} note={`${fmtInt(stats.n_samples)} наблюдений · ${fmtInt(stats.n_classes)} классов`} tone="amber" icon={<Layers3 size={17} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <ClassDistributionPanel report={report} title="Структура лесного покрова" description="Исходное распределение UCI Covertype. Все семь классов сохранены без искусственного балансирования." />
        <RareClassPanel report={report} model={selected} limit={Math.min(4, stats.n_classes)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ModelComparisonPanel report={report} selected={selected} />
        <ClassPerformancePanel report={report} model={selected} title="Разложение качества по типам леса" description="Recall выявляет типы покрова, которые модель пропускает; F1 объединяет precision и recall." />
      </div>

      <ConfusionMatrixPanel report={report} model={selected} title="Матрица похожести классов" description="Диагональ — верные классификации. Внедиагональные значения показывают типы леса, которые модель путает между собой." />
      <ModelMetricsTable report={report} selected={selected} />
      <Card className="!p-4 md:!p-5">
        <SectionHeading eyebrow="EXPERIMENT NOTES" title="Ограничения оценки" trailing={<Badge tone="warning">Holdout split</Badge>} />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Данные</p><p className="text-xs text-slate-700 dark:text-slate-200 mt-1.5">54 картографических признака описывают рельеф, почвы и локальный контекст наблюдения.</p></div>
          <div className="rounded-xl border border-border/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Классы</p><p className="text-xs text-slate-700 dark:text-slate-200 mt-1.5">Несбалансированность — свойство исходного набора; искусственное прореживание или генерация строк не применялись.</p></div>
          <div className="rounded-xl border border-border/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Интерпретация</p><p className="text-xs text-slate-700 dark:text-slate-200 mt-1.5">Случайный holdout может завышать переносимость качества из-за пространственной близости соседних ячеек.</p></div>
        </div>
        {gap !== null && <div className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.045] px-3.5 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Разница Weighted-F1 − Macro-F1: <b className="text-indigo-500">{fmt(gap, 3)}</b>. Положительный разрыв означает, что качество на частых классах лучше, чем среднее по всем классам.</div>}
      </Card>
      <InsightNote label="Рекомендация по чтению" tone="emerald">Для семи типов лесного покрова начните с Macro-F1 и balanced accuracy, затем изучите строки матрицы ошибок и recall каждого класса. Одна Accuracy может скрывать слабое распознавание редких категорий.</InsightNote>
    </div>
  );
}
