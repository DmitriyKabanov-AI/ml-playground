"use client";

import { CreditCard, Scale, Target } from "lucide-react";
import { BestOffDiagonalPanel, ClassDistributionPanel, ClassPerformancePanel, ConfusionMatrixPanel, ModelComparisonPanel, ModelMetricsTable, RareClassPanel } from "./Charts";
import { DashboardHero, InsightNote, KpiCard, ModelSwitcher } from "./Shared";
import { DatasetReport, ModelResult, fmt, fmtInt, fmtPct, getClassDistribution, metric } from "./types";

export function TaxiPaymentDashboard({ report, selected, onSelect }: { report: DatasetReport; selected: ModelResult; onSelect: (name: string) => void }) {
  const rows = getClassDistribution(report);
  const total = rows.reduce((sum, row) => sum + row.count, 0) || report.meta.dataset_stats.n_samples || 1;
  const largestClass = [...rows].sort((a, b) => b.count - a.count)[0];
  const rareClass = report.meta.target_stats.rare_class;
  const rareSupport = rows.find((row) => row.label === rareClass)?.count ?? 0;
  const rareRecall = rareClass ? selected.per_class?.[rareClass]?.recall ?? selected.per_class_recall?.[rareClass] : null;
  const macroWeightedGap = (metric(selected, "f1_weighted") ?? 0) - (metric(selected, "f1_macro") ?? 0);

  return (
    <div className="space-y-5">
      <DashboardHero task="taxi_payment" report={report} selected={selected} />
      <ModelSwitcher report={report} selected={selected} onSelect={onSelect} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Macro-F1" value={fmt(metric(selected, "f1_macro"))} note="Каждый тип оплаты имеет одинаковый вес" tone="indigo" icon={<Target size={17} />} />
        <KpiCard label="Weighted-F1" value={fmt(metric(selected, "f1_weighted"))} note="Учитывает фактическую частоту классов" tone="cyan" icon={<CreditCard size={17} />} />
        <KpiCard label="Class imbalance" value={`${fmt(report.meta.target_stats.imbalance_ratio, 1)}×`} note="Частота самого крупного к самому редкому классу" tone="amber" icon={<Scale size={17} />} />
        <KpiCard label="Rare-class recall" value={fmtPct(rareRecall)} note={rareClass ? `Класс: ${rareClass}` : "Recall редкой категории"} tone="rose" icon={<CreditCard size={17} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <ClassDistributionPanel report={report} title="Как распределяются типы оплаты" description="Фактические частоты классов после очистки исходных поездок; бары нормированы относительно крупнейшего класса." />
        <RareClassPanel report={report} model={selected} limit={Math.min(4, rows.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ModelComparisonPanel report={report} selected={selected} />
        <BestOffDiagonalPanel report={report} model={selected} />
      </div>

      <ClassPerformancePanel report={report} model={selected} title="Качество распознавания каждого типа оплаты" description="Сравнивайте precision, recall и F1 по каждой категории. Weighted-F1 может скрывать провал на малочисленных типах оплаты." />
      <ConfusionMatrixPanel report={report} model={selected} title="Карта ошибок между типами оплаты" description="Показывает, какие истинные классы чаще смешиваются друг с другом. Режим «Норм., %» облегчает сравнение редких и частых классов." />
      <ModelMetricsTable report={report} selected={selected} />
      <InsightNote label="Контроль утечки целевой переменной" tone="amber">Суммы платежей, чаевые и итоговый тариф исключены из признаков, потому что напрямую связаны с типом оплаты. {largestClass ? <>Самая частая категория в исходном наборе — <b>{largestClass.label}</b> ({fmtPct(largestClass.count / total, 2)} данных).</> : null} Разрыв Weighted-F1 и Macro-F1 сейчас составляет <b>{fmt(Math.abs(macroWeightedGap), 3)}</b>; используйте метрики вместе при выборе модели.</InsightNote>
    </div>
  );
}
