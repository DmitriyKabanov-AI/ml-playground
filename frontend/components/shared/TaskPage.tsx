"use client";
import { useMemo } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { HeroMetric } from "./HeroMetric";
import { MetricsGrid } from "./MetricsGrid";
import { ModelSelector } from "./ModelSelector";
import { ConfusionMatrix } from "./ConfusionMatrix";
import { ThresholdSlider } from "./ThresholdSlider";
import { CostCalculator } from "./CostCalculator";
import { Narrative } from "./Narrative";
import { MetaStats } from "./MetaStats";
import { PerClassTable } from "./PerClassTable";
import { ChartGrid } from "./ChartGrid";
import { SamplePredictions } from "./SamplePredictions";
import { useJson, useCsv } from "@/lib/data/loader";
import { metricsFromModel, modelsFromReport, normalizeSweep } from "@/lib/data/normalize";
import { useAppStore } from "@/lib/store";
import { TaskId } from "@/lib/types";
import { TaskMeta } from "@/lib/data/tasks";

export function TaskPage({ task }: { task: TaskMeta }) {
  const { selectedModel, setSelectedModel, threshold, setThreshold } = useAppStore();
  const { data: report, loading } = useJson<any>(task.reportPath);
  const { rows: sweepRows } = useCsv(task.sweepPath ?? null);

  const models = useMemo(() => modelsFromReport(report), [report]);

  // текущая модель: пользовательский выбор → headline.best_model → первая
  const currentModelId =
    selectedModel[task.id] ??
    report?.headline?.best_model ??
    models[0]?.id;
  const currentModel = useMemo(
    () => report?.models?.find((m: any) => m.name === currentModelId) ?? report?.models?.[0],
    [report, currentModelId]
  );

  const metrics = useMemo(() => metricsFromModel(currentModel), [currentModel]);
  const sweep = useMemo(() => normalizeSweep(sweepRows), [sweepRows]);
  const classNames: string[] = report?.meta?.classes ?? [];
  const matrix: number[][] | null = currentModel?.confusion_matrix ?? null;
  const perClass = currentModel?.per_class ?? {};
  const rareClass: string | undefined = report?.meta?.target_stats?.rare_class;
  const charts: Record<string, string> = report?.charts ?? {};
  const baseUrl = `/artifacts/classification/${task.slug}/`;
  const currentThreshold = threshold[task.id] ?? 0.5;

  const heroValue =
    metrics.f1Macro ?? metrics.f1Weighted ?? metrics.accuracy ?? metrics.rocAuc;
  const heroLabel =
    metrics.f1Macro != null ? "F1 (macro)"
    : metrics.f1Weighted != null ? "F1 (weighted)"
    : metrics.accuracy != null ? "Accuracy"
    : "—";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (!report) {
    return (
      <Card>
        <CardTitle>Не удалось загрузить report.json</CardTitle>
        <p className="text-sm text-slate-500 mt-2">{task.reportPath}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <HeroMetric
        title={report.meta?.title ?? task.title}
        model={currentModel?.name ?? "—"}
        metricLabel={heroLabel}
        metricValue={heroValue != null ? Number(heroValue).toFixed(4) : "—"}
        tone="info"
        extra={report.headline?.verdict ?? report.meta?.subtitle ?? task.subtitle}
      />

      {models.length > 0 && (
        <ModelSelector
          models={models.map((m) => ({ id: m.id, name: m.name + (m.isBest ? " ★" : "") }))}
          selected={currentModelId}
          onSelect={(id) => setSelectedModel(task.id as TaskId, id)}
        />
      )}

      <MetaStats meta={report.meta} />
      <MetricsGrid metrics={metrics} />
      <Narrative meta={report.meta} headline={report.headline} />

      {sweep.length > 0 && (
        <ThresholdSlider
          sweep={sweep}
          threshold={currentThreshold}
          onChange={(v) => setThreshold(task.id as TaskId, v)}
          costFP={100}
          costFN={task.id === "bc-fn" ? 5000 : 300}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {matrix && classNames.length > 0 && (
          <ConfusionMatrix labels={classNames} matrix={matrix} />
        )}
        {Object.keys(perClass).length > 0 && (
          <PerClassTable perClass={perClass} rareClass={rareClass} />
        )}
      </div>

      {sweep.length > 0 && <CostCalculator sweep={sweep} />}

      <ChartGrid charts={charts} baseUrl={baseUrl} />

      <SamplePredictions samples={report.sample_predictions} />

      <Card>
        <CardTitle>Raw report.json</CardTitle>
        <pre className="text-xs overflow-auto scrollbar-thin max-h-72 bg-slate-500/5 p-3 rounded-lg mt-3">
          {JSON.stringify(report, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
