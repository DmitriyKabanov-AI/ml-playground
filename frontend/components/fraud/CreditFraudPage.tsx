"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, CartesianGrid, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  CFReport, CFModel, CFSample, loadCreditFraudReport, findBestCFModel,
} from "@/lib/data/creditFraud";

const fmtPct = (v?: number | null) =>
  v === undefined || v === null ? "—" : `${(v * 100).toFixed(2)}%`;
const fmtNum = (v?: number | null) =>
  v === undefined || v === null ? "—" : v.toFixed(3);

function HeroCard({
  report, best,
}: { report: CFReport; best: CFModel }) {
  const d = report.headline.diagnostic_verdict;
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {report.meta.title}
      </p>
      <h1 className="text-2xl font-bold mt-1">{report.headline.best_model}</h1>
      <div className="flex items-end gap-3 mt-4">
        <span className="text-4xl font-black bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text text-transparent">
          {best.metrics.mcc.toFixed(4)}
        </span>
        <Badge tone="info">MCC</Badge>
      </div>
      <p className="text-sm text-slate-500 mt-3">{report.meta.subtitle}</p>
      <div className="flex gap-4 mt-4 text-xs flex-wrap">
        <span>PR-AUC: <b>{best.metrics.pr_auc.toFixed(4)}</b></span>
        <span>ROC-AUC: <b>{best.metrics.roc_auc.toFixed(4)}</b></span>
        <span>Sensitivity: <b>{(d.sensitivity_fraud * 100).toFixed(1)}%</b></span>
        <span className="text-rose-500">FP: <b>{d.fp_normal}</b></span>
        <span className="text-amber-500">FN: <b>{d.fn_fraud}</b></span>
      </div>
    </Card>
  );
}

function AccuracyTrap({ report }: { report: CFReport }) {
  const d = report.headline.diagnostic_verdict;
  const naive = report.models.find((m) => m.is_naive);
  if (!naive) return null;
  return (
    <Card className="border border-amber-500/40 bg-amber-500/5">
      <p className="text-sm">
        <b>⚠️ Accuracy-ловушка:</b> модель <span className="font-mono">«{naive.name}»</span>{" "}
        даёт accuracy = <b>{fmtPct(naive.metrics.accuracy)}</b> — это <b>выше</b>, чем у многих
        честных моделей, но она не поймала ни одного мошенничества:
        MCC = 0, PR-AUC = {naive.metrics.pr_auc.toFixed(5)} (baseline).
      </p>
      <p className="text-xs text-slate-500 mt-2">
        ROC-AUC тоже маскирует: LogReg показывает {report.models[0].metrics.roc_auc.toFixed(4)} —
        выше, чем у лучшей по MCC модели ({report.headline.best_model.split(" ")[0]}:
        {" "}{d.roc_auc?.toFixed(4) ?? d.best_roc_auc?.toFixed(4)}). На дисбалансе 1:
        {Math.round(d.imbalance_ratio)} судим по <b>MCC</b> и <b>PR-AUC</b>.
      </p>
    </Card>
  );
}

function ModelComparison({ report }: { report: CFReport }) {
  const rows = report.models;
  const sortKey = (m: CFModel) => m.metrics.mcc;
  const sorted = [...rows].sort((a, b) => sortKey(b) - sortKey(a));
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Сравнение моделей · sorted by MCC
      </h3>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-border">
            <tr>
              <th className="text-left py-2">Model</th>
              <th className="text-right">MCC</th>
              <th className="text-right">PR-AUC</th>
              <th className="text-right">ROC-AUC</th>
              <th className="text-right">Sens.</th>
              <th className="text-right">Prec.</th>
              <th className="text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => {
              const isNaive = m.is_naive;
              const isBest = m.is_best;
              return (
                <tr
                  key={m.name}
                  className={`border-b border-border/50 ${isNaive ? "opacity-60" : ""} ${isBest ? "bg-emerald-500/5" : ""}`}
                >
                  <td className="py-2">
                    {m.name} {isBest && <Badge tone="success" className="ml-2">best</Badge>}
                    {isNaive && <Badge tone="danger" className="ml-2">baseline</Badge>}
                  </td>
                  <td className={`text-right font-mono ${isBest ? "font-bold text-emerald-500" : ""}`}>
                    {m.metrics.mcc.toFixed(4)}
                  </td>
                  <td className="text-right font-mono">{m.metrics.pr_auc.toFixed(4)}</td>
                  <td className="text-right font-mono">{m.metrics.roc_auc.toFixed(4)}</td>
                  <td className="text-right font-mono">{m.metrics.sensitivity.toFixed(3)}</td>
                  <td className="text-right font-mono">
                    {m.metrics.precision_macro.toFixed(3)}
                  </td>
                  <td className="text-right font-mono">{m.metrics.accuracy.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Naive «всё normal» даёт accuracy <b>{fmtPct(report.models.find((m) => m.is_naive)?.metrics.accuracy)}</b>,
        но MCC = 0. На дисбалансе 1:{Math.round(report.meta.target_stats.imbalance_ratio)} accuracy
        бесполезна, судим по MCC.
      </p>
    </Card>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: "info" | "danger" | "success" }) {
  const color =
    tone === "danger" ? "text-rose-500" :
    tone === "success" ? "text-emerald-500" :
    tone === "info" ? "text-indigo-500" : "";
  return (
    <Card className="p-3.5">
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </Card>
  );
}

function ConfusionGrid({
  tp, fp, fn, tn, isNaive,
}: { tp: number; fp: number; fn: number; tn: number; isNaive: boolean }) {
  const cell = (label: string, val: number, tone: string) => (
    <div className={`rounded-lg p-3 text-center ${tone}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-black">{val.toLocaleString("ru-RU")}</p>
    </div>
  );
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Confusion matrix {isNaive && "(baseline)"}
      </h3>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {cell("TP · fraud верно", tp, "bg-emerald-500/15 text-emerald-500")}
        {cell("FN · пропущен fraud", fn, "bg-amber-500/15 text-amber-500")}
        {cell("FP · ложная тревога", fp, "bg-rose-500/15 text-rose-500")}
        {cell("TN · normal верно", tn, "bg-sky-500/15 text-sky-500")}
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
          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
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

function SampleScatter({
  samples, xKey, yKey,
}: { samples: CFSample[]; xKey: string; yKey: string }) {
  const data = samples.map((s, i) => ({
    id: i,
    x: s.features[xKey] ?? 0,
    y: s.features[yKey] ?? 0,
    sample: s,
    p: s.proba?.fraud ?? (s.predicted === "fraud" ? 1 : 0),
  }));
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Образцы теста: {xKey} × {yKey}
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="x" type="number" tick={{ fontSize: 11 }} name={xKey} />
          <YAxis dataKey="y" type="number" tick={{ fontSize: 11 }} name={yKey} />
          <ZAxis dataKey="p" range={[60, 240]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
            formatter={(v: any, n: string) => (n === "p" ? `${(v * 100).toFixed(1)}%` : v.toFixed(3))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Scatter
            data={data.filter((d) => d.sample.true === "normal")}
            name="true = normal"
            shape={(props: any) => (
              <circle cx={props.cx} cy={props.cy} r={4} fill="#6366f1" opacity={0.5} />
            )}
          />
          <Scatter
            data={data.filter((d) => d.sample.true === "fraud")}
            name="true = fraud"
            shape={(props: any) => (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={7}
                fill="#f43f5e"
                stroke="#fff"
                strokeWidth={props.payload.sample.correct ? 0 : 2}
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-2">
        Красные точки — реальные мошенничества. Обводка = ошибка модели (FN — если предсказан normal).
      </p>
    </Card>
  );
}

export function CreditFraudPage() {
  const [report, setReport] = useState<CFReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelIdx, setModelIdx] = useState(0);

  useEffect(() => {
    setReport(null);
    setError(null);
    loadCreditFraudReport()
      .then((r) => {
        setReport(r);
        const bestIdx = r.models.findIndex((m) => m.is_best);
        setModelIdx(bestIdx >= 0 ? bestIdx : 0);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const best = useMemo(() => (report ? findBestCFModel(report) : null), [report]);
  const selected = report ? report.models[modelIdx] : null;

  if (error) {
    return (
      <Card>
        <p className="text-rose-500">Ошибка загрузки артефакта: {error}</p>
      </Card>
    );
  }
  if (!report || !best || !selected) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 w-full rounded-2xl bg-slate-500/10" />
        <div className="h-24 w-full rounded-2xl bg-slate-500/10" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 w-full rounded-2xl bg-slate-500/10" />
          ))}
        </div>
      </div>
    );
  }

  const d = report.headline.diagnostic_verdict;
  const cc = selected.confusion_counts;

  return (
    <div className="space-y-6">
      <HeroCard report={report} best={best} />
      <AccuracyTrap report={report} />

      <div className="flex flex-wrap gap-2">
        {report.models.map((m, i) => (
          <button
            key={m.name}
            onClick={() => setModelIdx(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              modelIdx === i
                ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30"
                : "border-border text-slate-500 hover:border-indigo-500/50"
            }`}
          >
            {m.name}
            {m.is_naive && <span className="ml-2 text-[10px] opacity-70">baseline</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="MCC" value={selected.metrics.mcc.toFixed(4)} tone={selected.is_naive ? "danger" : "success"} />
        <MetricCard label="PR-AUC" value={selected.metrics.pr_auc.toFixed(4)} />
        <MetricCard label="ROC-AUC" value={selected.metrics.roc_auc.toFixed(4)} />
        <MetricCard label="Balanced Acc." value={fmtPct(selected.metrics.balanced_accuracy)} />
        <MetricCard label="Sensitivity (fraud)" value={fmtPct(selected.metrics.sensitivity)} />
        <MetricCard label="Specificity (normal)" value={fmtPct(selected.metrics.specificity)} />
        <MetricCard label="Precision (fraud)" value={fmtPct(selected.per_class.fraud.precision)} />
        <MetricCard label="F1 (fraud)" value={fmtPct(selected.per_class.fraud.f1)} />
        <MetricCard label="Accuracy" value={fmtPct(selected.metrics.accuracy)} />
        <MetricCard
          label="Errors on test"
          value={String((cc.fp_normal ?? 0) + (cc.fn_fraud ?? 0))}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <ConfusionGrid
          tp={cc.tp_fraud}
          fp={cc.fp_normal}
          fn={cc.fn_fraud}
          tn={cc.tn_normal}
          isNaive={selected.is_naive}
        />
        {selected.feature_importance ? (
          <FeatureImportanceChart data={selected.feature_importance} />
        ) : (
          <Card>
            <p className="text-sm text-slate-500">
              У модели <b>{selected.name}</b> нет feature_importance в артефакте
              (baseline-модель).
            </p>
          </Card>
        )}
      </div>

      <SampleScatter samples={report.sample_predictions} xKey="V14" yKey="V17" />

      <ModelComparison report={report} />

      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Вывод из ноутбука
        </h3>
        <p className="mt-3 text-sm leading-relaxed">{report.meta.narrative.context}</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-indigo-500/10">
            <p className="text-xs text-slate-500 uppercase">Hero-метрика</p>
            <p className="font-bold">{report.meta.narrative.hero_metric}</p>
          </div>
          {report.meta.narrative.why_not_accuracy && (
            <div className="p-3 rounded-xl bg-amber-500/10">
              <p className="text-xs text-slate-500 uppercase">Почему не accuracy</p>
              <p className="text-xs">{report.meta.narrative.why_not_accuracy}</p>
            </div>
          )}
          {report.meta.narrative.why_not_roc_auc && (
            <div className="p-3 rounded-xl bg-rose-500/10">
              <p className="text-xs text-slate-500 uppercase">Почему не ROC-AUC</p>
              <p className="text-xs">{report.meta.narrative.why_not_roc_auc}</p>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          {report.meta.narrative.main_conclusion}
        </p>
        {report.meta.narrative.why_mcc && (
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {report.meta.narrative.why_mcc}
          </p>
        )}
        <div className="flex gap-4 mt-4 text-xs text-slate-500 flex-wrap">
          <span>imbalance = 1:{Math.round(d.imbalance_ratio)}</span>
          <span>prevalence = {(d.prevalence_positive * 100).toFixed(3)}%</span>
          <span>PR-AUC / baseline = {Math.round(d.pr_auc_over_baseline)}×</span>
          <span>errors on test = {d.n_errors_on_test}</span>
        </div>
        <p className="text-xs text-slate-500 mt-3">{report.headline.verdict}</p>
      </Card>
    </div>
  );
}