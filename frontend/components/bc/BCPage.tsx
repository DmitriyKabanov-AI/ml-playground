"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskMap } from "./RiskMap";
import { ThresholdChart } from "./ThresholdChart";
import { CostPanel } from "./CostPanel";
import {
  BCReport,
  BCModel,
  BCSweep,
  BCTask,
  countsFromSweep,
  loadBCReport,
} from "@/lib/data/breastCancer";

type Config = {
  task: BCTask;
  hero: "f0.5_pos" | "f2_pos";
  heroLabel: string;
  defaultThreshold: number;
  subtitle: string;
};

type Counts = { tp: number; fn: number; fp: number; tn: number };

const fmtPct = (v?: number | null) =>
  v === undefined || v === null || Number.isNaN(v) ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtNum = (v?: number | null) =>
  v === undefined || v === null || Number.isNaN(v) ? "—" : v.toFixed(3);

/**
 * Из всех конфигураций одной модели (LogReg @thr=0.5, @thr=0.3, ...)
 * оставляем одну — с максимальной hero-метрикой. Пользователь выбирает
 * ТИП модели, а порог для неё — тот, что дал лучший результат в артефакте.
 */
function bestConfigPerModel(report: BCReport, hero: string): BCModel[] {
  const byModel = new Map<string, BCModel>();
  for (const m of report.models ?? []) {
    const cur = byModel.get(m.model);
    const val = (m.metrics as any)?.[hero];
    const curVal = cur ? (cur.metrics as any)?.[hero] : undefined;
    if (!cur || (Number.isFinite(val) && (!Number.isFinite(curVal) || val > curVal))) {
      byModel.set(m.model, m);
    }
  }
  return Array.from(byModel.values()).sort((a, b) => {
    const va = (a.metrics as any)?.[hero] ?? -Infinity;
    const vb = (b.metrics as any)?.[hero] ?? -Infinity;
    return vb - va;
  });
}

/**
 * Считаем counts через sweep выбранной модели, а не через статичные
 * confusion_counts из артефакта. Тогда ConfusionGrid реагирует на движение
 * слайдера порога. Fallback на confusion_counts — только если sweep нет.
 */
function extractCounts(
  model: BCModel | null,
  report: BCReport,
  threshold: number
): Counts {
  if (!model) return { tp: 0, fn: 0, fp: 0, tn: 0 };

  const perModel = (report as any).threshold_sweeps as
    | Record<string, BCSweep>
    | undefined;
  const sweep =
    perModel?.[model.model] ??
    (report.threshold_sweep?.model === model.model
      ? report.threshold_sweep
      : undefined);

  if (sweep) {
    const c = countsFromSweep(report, threshold, sweep);
    return { tp: c.tp, fn: c.fn, fp: c.fp, tn: c.tn };
  }

  const cc: any = (model as any).confusion_counts ?? {};
  const tp = Number(cc.tp_malignant ?? cc.tp ?? cc.TP ?? 0) || 0;
  const fn = Number(cc.fn_malignant ?? cc.fn ?? cc.FN ?? 0) || 0;
  const fp = Number(cc.fp_benign ?? cc.fp ?? cc.FP ?? 0) || 0;
  const tn = Number(cc.tn_benign ?? cc.tn ?? cc.TN ?? 0) || 0;
  return { tp, fn, fp, tn };
}

function ModelSelector({
  models,
  selectedName,
  onSelect,
  hero,
}: {
  models: BCModel[];
  selectedName: string;
  onSelect: (m: BCModel) => void;
  hero: string;
}) {
  if (!models.length) return null;
  const heroShort = hero === "f0.5_pos" ? "F0.5" : "F2";
  return (
    <div className="flex flex-wrap gap-2">
      {models.map((m) => {
        const active = m.name === selectedName;
        const val = (m.metrics as any)?.[hero];
        return (
          <button
            key={m.name}
            onClick={() => onSelect(m)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              active
                ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30"
                : "border-border text-slate-500 hover:border-indigo-500/50"
            }`}
          >
            <span>{m.model}</span>
            <span className="ml-2 text-[11px] opacity-70">
              thr={m.threshold.toFixed(3)}
            </span>
            {Number.isFinite(val) && (
              <span className="ml-2 text-[11px] opacity-80">
                {heroShort}={Number(val).toFixed(3)}
              </span>
            )}
            {m.is_best && <span className="ml-2 text-[10px] opacity-80">★</span>}
          </button>
        );
      })}
    </div>
  );
}

function HeroCard({
  report,
  hero,
  heroValue,
  heroLabel,
  threshold,
  counts,
  model,
}: {
  report: BCReport;
  hero: "f0.5_pos" | "f2_pos";
  heroValue: number;
  heroLabel: string;
  threshold: number;
  counts: Counts;
  model: BCModel;
}) {
  const tone = hero === "f0.5_pos" ? "info" : "danger";
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {report.meta.title}
      </p>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <h1 className="text-2xl font-bold">{model.model}</h1>
        <span className="text-xs text-slate-500">
          {model.name}
          {model.is_best ? " · лучшая по hero-метрике" : ""}
        </span>
      </div>
      <div className="flex items-end gap-3 mt-4">
        <span className="text-4xl font-black bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text text-transparent">
          {Number.isFinite(heroValue) ? heroValue.toFixed(4) : "—"}
        </span>
        <Badge tone={tone as any}>{heroLabel}</Badge>
      </div>
      <p className="text-sm text-slate-500 mt-3">{report.meta.subtitle}</p>
      <div className="flex gap-4 mt-4 text-xs flex-wrap">
        <span>
          Порог: <b>{threshold.toFixed(3)}</b>
        </span>
        <span className="text-emerald-500">
          TP: <b>{counts.tp}</b>
        </span>
        <span className="text-sky-500">
          TN: <b>{counts.tn}</b>
        </span>
        <span className="text-rose-500">
          FP: <b>{counts.fp}</b>
        </span>
        <span className="text-amber-500">
          FN: <b>{counts.fn}</b>
        </span>
      </div>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3.5">
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </Card>
  );
}

function ConfusionGrid({
  tp, fp, fn, tn,
}: { tp: number; fp: number; fn: number; tn: number }) {
  const cell = (label: string, val: number, tone: string) => (
    <div className={`rounded-lg p-3 text-center ${tone}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-black">{val}</p>
    </div>
  );
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Confusion matrix @ выбранный порог
      </h3>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {cell("TP · malignant верно", tp, "bg-emerald-500/15 text-emerald-500")}
        {cell("FN · пропущен рак", fn, "bg-amber-500/15 text-amber-500")}
        {cell("FP · ложная тревога", fp, "bg-rose-500/15 text-rose-500")}
        {cell("TN · benign верно", tn, "bg-sky-500/15 text-sky-500")}
      </div>
    </Card>
  );
}

function FeatureImportanceChart({
  data,
}: { data: { name: string; value: number }[] }) {
  if (!Array.isArray(data) || !data.length) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Feature importance
        </h3>
        <p className="text-sm text-slate-500 mt-3">
          В артефакте нет feature_importance для этой модели.
        </p>
      </Card>
    );
  }
  const colors = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#a855f7", "#14b8a6"];
  const top = [...data].slice(0, 15);
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Feature importance (top-15)
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(260, top.length * 26)}>
        <BarChart data={top} layout="vertical" margin={{ left: 10 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
            formatter={(v: number) => Number(v).toFixed(4)}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {top.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function BCPage({ config }: { config: Config }) {
  const [report, setReport] = useState<BCReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(config.defaultThreshold);

  useEffect(() => {
    setReport(null);
    setError(null);
    setThreshold(config.defaultThreshold);
    setSelectedName(null);
    loadBCReport(config.task)
      .then(setReport)
      .catch((e) => setError(String(e)));
  }, [config.task, config.defaultThreshold]);

  // Уникальные модели (по одной конфигурации на модель), отсортированные по hero
  const models = useMemo(
    () => (report ? bestConfigPerModel(report, config.hero) : []),
    [report, config.hero]
  );

  // Выбранная модель — пользовательский выбор, иначе лучшая
  const selected: BCModel | null = useMemo(() => {
    if (!models.length) return null;
    if (selectedName) {
      const found = models.find((m) => m.name === selectedName);
      if (found) return found;
    }
    return models[0];
  }, [models, selectedName]);

  // Когда меняется выбранная модель — синхронизируем порог с её порогом
  useEffect(() => {
    if (selected) setThreshold(selected.threshold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.name]);

  // Sweep для выбранной модели: сначала per-model, потом fallback на старый.
  const sweepForSelected: BCSweep | null = useMemo(() => {
    if (!report || !selected) return null;
    const perModel = (report as any).threshold_sweeps as
      | Record<string, BCSweep>
      | undefined;
    if (perModel && perModel[selected.model]) return perModel[selected.model];
    if (
      report.threshold_sweep &&
      report.threshold_sweep.model === selected.model
    ) {
      return report.threshold_sweep;
    }
    return null;
  }, [report, selected]);

  const hasSweepForSelected = !!sweepForSelected;

  const counts: Counts | null = useMemo(
    () =>
      report && selected
        ? extractCounts(selected, report, threshold)
        : null,
    [report, selected, threshold]
  );

  // Оптимум для hero считаем по sweep выбранной модели
  const optimalForHero = useMemo(() => {
    if (!sweepForSelected?.thresholds?.length) return null;
    const sweep = sweepForSelected;
    const arr =
      config.hero === "f0.5_pos" ? sweep["f0.5_pos"] : sweep.f2_pos;
    if (!Array.isArray(arr) || !arr.length) return null;
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (Number.isFinite(v) && v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return null;
    const t = sweep.thresholds[bestIdx];
    return Number.isFinite(t) ? t : null;
  }, [sweepForSelected, config.hero]);

  if (error) {
    return (
      <Card>
        <p className="text-rose-500">Ошибка загрузки артефакта: {error}</p>
      </Card>
    );
  }
  if (!report || !selected || !counts) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 w-full rounded-2xl bg-slate-500/10" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 w-full rounded-2xl bg-slate-500/10" />
          ))}
        </div>
        <div className="h-72 w-full rounded-2xl bg-slate-500/10" />
      </div>
    );
  }

  // Hero-метрика: ключ берём прямо из config.hero ("f0.5_pos" или "f2_pos").
  const heroValue = Number((selected.metrics as any)[config.hero] ?? 0);

  const metrics: [string, number | undefined, boolean][] = [
    ["Accuracy", selected.metrics.accuracy, false],
    ["Balanced Acc.", selected.metrics.balanced_accuracy, false],
    ["Precision (macro)", selected.metrics.precision_macro, false],
    ["Recall (macro)", selected.metrics.recall_macro, false],
    ["F1 (macro)", selected.metrics.f1_macro, false],
    [
      "F0.5 (macro)",
      selected.metrics["f0.5_macro"] ??
        selected.metrics.f05_macro ??
        selected.metrics.f0_5_macro,
      false,
    ],
    ["F2 (macro)", selected.metrics.f2_macro, false],
    ["MCC", selected.metrics.mcc, true],
    ["Cohen κ", selected.metrics.kappa, true],
    ["ROC-AUC", selected.metrics.roc_auc, false],
    ["PR-AUC", selected.metrics.pr_auc, false],
    ["Specificity", selected.metrics.specificity, false],
    ["Sensitivity", selected.metrics.sensitivity, false],
  ];

  return (
    <div className="space-y-6">
      <HeroCard
        report={report}
        hero={config.hero}
        heroValue={heroValue}
        heroLabel={config.heroLabel}
        threshold={threshold}
        counts={counts}
        model={selected}
      />

      {/* Селектор моделей — переключение между типами моделей */}
      {models.length > 1 && (
        <ModelSelector
          models={models}
          selectedName={selected.name}
          onSelect={(m) => setSelectedName(m.name)}
          hero={config.hero}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map(([label, val, isNum]) => (
          <MetricCard
            key={label}
            label={label}
            value={isNum ? fmtNum(val) : fmtPct(val)}
          />
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            Порог решения
          </h3>
          <span className="text-lg font-bold text-indigo-500">
            {threshold.toFixed(3)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          disabled={!hasSweepForSelected}
          className={`w-full mt-4 accent-indigo-500 h-2 rounded-full ${
            hasSweepForSelected
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50"
          }`}
        />
        {!hasSweepForSelected && (
          <p className="text-xs text-slate-500 mt-2">
            Для модели <b>{selected.model}</b> в артефакте нет threshold_sweep —
            порог зафиксирован значением из отчёта (
            {selected.threshold.toFixed(3)}).
          </p>
        )}

        {hasSweepForSelected && (
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
            {optimalForHero != null && (
              <button
                onClick={() => setThreshold(optimalForHero)}
                className="text-indigo-500 hover:text-indigo-600 font-medium"
              >
                ↺ К оптимальному для{" "}
                {config.hero === "f0.5_pos" ? "F0.5" : "F2"} (
                {optimalForHero.toFixed(3)})
              </button>
            )}
            <button
              onClick={() => setThreshold(selected.threshold)}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
            >
              ↺ К порогу из артефакта ({selected.threshold.toFixed(3)})
            </button>
          </div>
        )}

        <div className="flex gap-4 mt-4 text-sm flex-wrap">
          <span className="text-rose-500 font-semibold">FP: {counts.fp}</span>
          <span className="text-amber-500 font-semibold">FN: {counts.fn}</span>
          <span className="text-emerald-500 font-semibold">TP: {counts.tp}</span>
          <span className="text-sky-500 font-semibold">TN: {counts.tn}</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <ConfusionGrid
          tp={counts.tp}
          fp={counts.fp}
          fn={counts.fn}
          tn={counts.tn}
        />
        {hasSweepForSelected && sweepForSelected ? (
          <ThresholdChart
            sweep={sweepForSelected}
            current={threshold}
            hero={config.hero}
          />
        ) : (
          <Card>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
              Threshold sweep
            </h3>
            <p className="text-sm text-slate-500 mt-3">
              Для <b>{selected.model}</b> нет sweep по порогу в артефакте.
              Переключись на другую модель.
            </p>
          </Card>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <FeatureImportanceChart data={selected.feature_importance ?? []} />
        <RiskMap
          samples={report.sample_predictions ?? []}
          threshold={threshold}
        />
      </div>

      <CostPanel
        report={report}
        sweep={sweepForSelected ?? undefined}
        currentThreshold={threshold}
        onApplyThreshold={(t) => setThreshold(t)}
      />
    </div>
  );
}