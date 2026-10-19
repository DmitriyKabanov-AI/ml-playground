"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FlightDelayDashboard } from "./large-dataset/FlightDelayDashboard";
import { ForestCoverDashboard } from "./large-dataset/ForestCoverDashboard";
import { TaxiPaymentDashboard } from "./large-dataset/TaxiPaymentDashboard";
import { DATASET_PATHS, DatasetReport, ModelResult, Task } from "./large-dataset/types";

function LoadingState() {
  return (
    <div className="space-y-5 animate-pulse" aria-label="Загрузка дашборда">
      <div className="rounded-2xl border border-border bg-slate-500/[0.035] p-6"><div className="h-3 w-36 rounded bg-slate-500/10" /><div className="h-8 w-2/3 rounded-lg bg-slate-500/10 mt-4" /><div className="h-3 w-1/2 rounded bg-slate-500/10 mt-3" /><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-7">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 rounded-xl bg-slate-500/10" />)}</div></div>
      <div className="grid md:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 rounded-xl bg-slate-500/10" />)}</div>
      <div className="grid xl:grid-cols-2 gap-4"><div className="h-[340px] rounded-2xl bg-slate-500/10" /><div className="h-[340px] rounded-2xl bg-slate-500/10" /></div>
    </div>
  );
}

function ErrorState({ task, message, retry }: { task: Task; message: string; retry: () => void }) {
  return (
    <Card className="!p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500 shrink-0"><AlertCircle size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Не удалось загрузить отчёт датасета</h2>
          <p className="text-xs leading-relaxed text-slate-500 mt-2">{message}</p>
          <div className="mt-3 rounded-lg border border-border bg-slate-500/[0.035] px-3 py-2"><p className="text-[10px] text-slate-500">Ожидаемый артефакт</p><code className="text-[11px] text-indigo-500 break-all">{DATASET_PATHS[task]}</code></div>
          <p className="text-xs text-slate-500 mt-3">Проверь, что notebook завершился и сохранил `report.json` в `artifacts/classification/{task}/report.json`, а каталог `artifacts/` доступен фронтенду.</p>
          <button type="button" onClick={retry} className="inline-flex items-center gap-2 mt-4 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-colors"><RefreshCw size={13} /> Повторить загрузку</button>
        </div>
      </div>
    </Card>
  );
}

export function LargeDatasetPage({ task }: { task: Task }) {
  const [report, setReport] = useState<DatasetReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setReport(null);
    setError(null);

    fetch(DATASET_PATHS[task], { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} при чтении ${DATASET_PATHS[task]}`);
        return response.json() as Promise<DatasetReport>;
      })
      .then((json) => {
        if (!json?.meta?.classes?.length || !Array.isArray(json?.models) || json.models.length === 0) {
          throw new Error("В report.json отсутствуют обязательные поля meta.classes или models.");
        }
        if (alive) {
          setReport(json);
          setSelectedName(json.models.find((model) => model.is_best && !model.is_naive)?.name ?? json.models.find((model) => !model.is_naive)?.name ?? json.models[0].name);
        }
      })
      .catch((reason: unknown) => {
        if (alive && !(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [task, reloadKey]);

  const selected = useMemo<ModelResult | null>(() => {
    if (!report) return null;
    return report.models.find((model) => model.name === selectedName) ?? report.models.find((model) => model.is_best) ?? report.models[0] ?? null;
  }, [report, selectedName]);

  if (error) return <ErrorState task={task} message={error} retry={() => setReloadKey((key) => key + 1)} />;
  if (!report || !selected) return <LoadingState />;

  const onSelect = (name: string) => setSelectedName(name);
  if (task === "flight_delay") return <FlightDelayDashboard report={report} selected={selected} onSelect={onSelect} />;
  if (task === "taxi_payment") return <TaxiPaymentDashboard report={report} selected={selected} onSelect={onSelect} />;
  if (task === "cover_type") return <ForestCoverDashboard report={report} selected={selected} onSelect={onSelect} />;

  return <Card><div className="flex items-center gap-2 text-slate-500"><Database size={16} /><span className="text-sm">Неизвестный сценарий классификации.</span></div></Card>;
}
