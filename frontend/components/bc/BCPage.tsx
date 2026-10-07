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
  BCTask,
  countsFromSweep,
  loadBCReport,
  findBestModel,
} from "@/lib/data/breastCancer";

type Config = {
  task: BCTask;
  hero: "f0.5_pos" | "f2_pos";
  heroLabel: string;
  defaultThreshold: number;
  subtitle: string;
};

const fmtPct = (v?: number | null) =>
  v === undefined || v === null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtNum = (v?: number | null) =>
  v === undefined || v === null ? "—" : v.toFixed(3);

function HeroCard({
  report,
  hero,
  heroValue,
  threshold,
  counts,
}: {
  report: BCReport;
  hero: "f0.5_pos" | "f2_pos";
  heroValue: number;
  threshold: number;
  counts: any;
}) {
  const tone = hero === "f0.5_pos" ? "info" : "danger";
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {report.meta.title}
      </p>
      <h1 className="text-2xl font-bold mt-1">{report.headline.best_model}</h1>
      <div className="flex items-end gap-3 mt-4">
        <span className="text-4xl font-black bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text text-transparent">
          {heroValue.toFixed(4)}
        </span>
        <Badge tone={tone as any}>{hero === "f0.5_pos" ? "F0.5 (malignant)" : "F2 (malignant)"}</Badge>
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
        Confusion matrix @ текущий порог
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
            formatter={(v: number) => v.toFixed(4)}
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
  const [threshold, setThreshold] = useState(config.defaultThreshold);

  useEffect(() => {
    setReport(null);
    setError(null);
    loadBCReport(config.task)
      .then(setReport)
      .catch((e) => setError(String(e)));
  }, [config.task]);

  const counts = useMemo(
    () => (report ? countsFromSweep(report, threshold) : null),
    [report, threshold]
  );

  const best = useMemo(
    () => (report ? findBestModel(report) : null),
    [report]
  );

  if (error) {
    return (
      <Card>
        <p className="text-rose-500">Ошибка загрузки артефакта: {error}</p>
      </Card>
    );
  }
  if (!report || !best || !counts) {
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

  const heroValue = config.hero === "f0.5_pos" ? counts.f05 : counts.f2;

  const metrics: [string, number | undefined, boolean][] = [
    ["Accuracy", best.metrics.accuracy, false],
    ["Balanced Acc.", best.metrics.balanced_accuracy, false],
    ["Precision (macro)", best.metrics.precision_macro, false],
    ["Recall (macro)", best.metrics.recall_macro, false],
    ["F1 (macro)", best.metrics.f1_macro, false],
    ["F0.5 (macro)", best.metrics["f0.5_macro"], false],
    ["F2 (macro)", best.metrics.f2_macro, false],
    ["MCC", best.metrics.mcc, true],
    ["Cohen κ", best.metrics.kappa, true],
    ["ROC-AUC", best.metrics.roc_auc, false],
    ["PR-AUC", best.metrics.pr_auc, false],
    ["Specificity", best.metrics.specificity, false],
    ["Sensitivity", best.metrics.sensitivity, false],
  ];

  const narrativeWhy =
    report.meta.narrative.why_not_accuracy ??
    report.meta.narrative.why_f2 ??
    "";

  const optThreshold =
    report.headline?.diagnostic_verdict?.best_threshold ??
    report.threshold_sweep.optimal_threshold;
  const thrSource =
    report.headline?.diagnostic_verdict?.threshold_source ??
    report.threshold_sweep.sweep_source ??
    "validation";

  return (
    <div className="space-y-6">
      <HeroCard
        report={report}
        hero={config.hero}
        heroValue={heroValue}
        threshold={threshold}
        counts={counts}
      />

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
        <div className="flex items-center justify-between">
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
          className="w-full mt-4 accent-indigo-500 h-2 rounded-full cursor-pointer"
        />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5">
          {[
            ["Precision", counts.precision],
            ["Recall", counts.recall],
            ["F1", (2 * counts.precision * counts.recall) / (counts.precision + counts.recall || 1)],
            ["F0.5", counts.f05],
            ["F2", counts.f2],
            ["Specificity", counts.specificity],
          ].map(([label, val]) => (
            <div key={label as string} className="text-center">
              <p className="text-[10px] text-slate-500 uppercase">{label}</p>
              <p className="font-bold text-sm">{(val as number).toFixed(3)}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-sm flex-wrap">
          <span className="text-rose-500 font-semibold">FP: {counts.fp}</span>
          <span className="text-amber-500 font-semibold">FN: {counts.fn}</span>
          <span className="text-emerald-500 font-semibold">TP: {counts.tp}</span>
          <span className="text-sky-500 font-semibold">TN: {counts.tn}</span>
          <span className="ml-auto text-slate-500 text-xs self-center">
            оптимальный порог из артефакта: {optThreshold.toFixed(3)} ({thrSource})
          </span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <ConfusionGrid tp={counts.tp} fp={counts.fp} fn={counts.fn} tn={counts.tn} />
        <ThresholdChart
          sweep={report.threshold_sweep}
          current={threshold}
          hero={config.hero}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <FeatureImportanceChart data={best.feature_importance} />
        <RiskMap samples={report.sample_predictions} threshold={threshold} />
      </div>

      <CostPanel report={report} />

      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Вывод из ноутбука
        </h3>
        <p className="mt-3 text-sm leading-relaxed">{report.meta.narrative.context}</p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-indigo-500/10">
            <p className="text-xs text-slate-500 uppercase">Hero-метрика</p>
            <p className="font-bold">{report.meta.narrative.hero_metric}</p>
          </div>
          <div className="p-3 rounded-xl bg-violet-500/10">
            <p className="text-xs text-slate-500 uppercase">Почему не accuracy</p>
            <p className="text-xs">{narrativeWhy}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          {report.meta.narrative.main_conclusion}
        </p>
        {report.meta.narrative.contrast_with_breast_cancer_fp && (
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {report.meta.narrative.contrast_with_breast_cancer_fp}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-3">{report.headline.verdict}</p>
      </Card>
    </div>
  );
}