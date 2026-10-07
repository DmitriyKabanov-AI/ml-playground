"use client";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { HeroMetric } from "@/components/shared/HeroMetric";
import { MetricsGrid } from "@/components/shared/MetricsGrid";
import { ModelSelector } from "@/components/shared/ModelSelector";
import { ConfusionMatrix } from "@/components/shared/ConfusionMatrix";
import { FeatureImportance } from "@/components/shared/FeatureImportance";
import { IrisLiveSimulator } from "@/components/iris/IrisLiveSimulator";
import { useAppStore } from "@/lib/store";
import { useJson } from "@/lib/data/loader";
import { metricsFromModel, modelsFromReport } from "@/lib/data/normalize";
import { useIrisData } from "@/lib/data/iris";

export default function IrisPage() {
  const { selectedModel, setSelectedModel } = useAppStore();
  const { data: report, loading: rl, error: rErr } = useJson<any>("classification/iris/report.json");
  const { iris, loading: il } = useIrisData();

  const models = useMemo(() => modelsFromReport(report), [report]);
  const currentModelId = selectedModel["iris"] ?? report?.headline?.best_model ?? models[0]?.id;
  const currentModel = useMemo(
    () => report?.models?.find((m: any) => m.name === currentModelId) ?? report?.models?.[0],
    [report, currentModelId]
  );
  const metrics = useMemo(() => metricsFromModel(currentModel), [currentModel]);

  if (rErr) {
    return (
      <Card>
        <p className="text-rose-500">Ошибка загрузки артефакта: {rErr}</p>
      </Card>
    );
  }

  if (rl || il || !report || !iris) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const labels: string[] = report.meta?.classes ?? [];
  const matrix: number[][] = currentModel?.confusion_matrix ?? [];

  return (
    <div className="space-y-6">
      <HeroMetric
        title="Iris · Многоклассовая классификация"
        model={currentModel?.name ?? ""}
        metricLabel="F1-macro"
        metricValue={metrics.f1Macro != null ? Number(metrics.f1Macro).toFixed(3) : "—"}
        tone="success"
        extra="Сбалансированный датасет, 3 класса по 50 образцов"
      />

      <ModelSelector
        models={models.map((m) => ({ id: m.id, name: m.name }))}
        selected={currentModelId}
        onSelect={(id) => setSelectedModel("iris", id)}
      />

      <MetricsGrid metrics={metrics} />

      <div className="grid lg:grid-cols-2 gap-5">
        <ConfusionMatrix labels={labels} matrix={matrix} />
        <FeatureImportance data={iris.importance} />
      </div>

      <IrisLiveSimulator data={iris.points} />
    </div>
  );
}
