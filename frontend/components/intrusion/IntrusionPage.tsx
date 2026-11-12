"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  HeroCard, MetricTile, ModelChips, NarrativeCard, SparkRunCard, ImportanceCard,
  BinaryConfusion, SectionTitle, ReportError, ReportSkeleton, PALETTE,
} from "@/components/shared/reportUi";
import {
  IntrusionThresholdPanel, IntrusionAlertCard, IntrusionPrecisionRecallCard, IntrusionModelComparison,
} from "@/components/intrusion/IntrusionInsights";
import {
  IntrusionReport, BinaryModel, REPORT_SLUGS, useReport, countsAt, derive,
  fmtPct, fmtNum, fmtInt, fmtCompact,
} from "@/lib/data/reports";

/* ---------- разбор по семействам атак ---------- */
function FamilyCard({ model }: { model: BinaryModel }) {
  const fam = model.by_family ?? [];
  const rare = fam.filter((f) => f.is_rare).map((f) => ({ ...f, pct: f.rate * 100 }));
  const other = fam.filter((f) => !f.is_rare).map((f) => ({ ...f, pct: f.rate * 100 }));
  if (!fam.length) {
    return (
      <Card>
        <SectionTitle>Разбор по семействам</SectionTitle>
        <p className="text-sm text-slate-500 mt-4">Для baseline детализация по семействам не рассчитывается.</p>
      </Card>
    );
  }
  return (
    <Card>
      <SectionTitle>Что именно ловит модель · при её настроенном пороге</SectionTitle>
      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <div>
          <p className="text-xs text-rose-500 font-semibold mb-1">Редкие атаки — доля пойманных (recall)</p>
          <ResponsiveContainer width="100%" height={Math.max(180, rare.length * 36)}>
            <BarChart data={rare} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <YAxis dataKey="family" type="category" width={150} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12 }}
                formatter={(v: number, _n: string, p: { payload?: { flagged: number; n: number } }) =>
                  [`${v.toFixed(1)}% (${fmtInt(p.payload?.flagged)} из ${fmtInt(p.payload?.n)})`, "recall"]}
              />
              <Bar dataKey="pct" radius={[0, 8, 8, 0]} fill="#f43f5e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold mb-1">Остальной трафик — доля ложных тревог</p>
          <ResponsiveContainer width="100%" height={Math.max(180, other.length * 36)}>
            <BarChart data={other} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
              <YAxis dataKey="family" type="category" width={150} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12 }}
                formatter={(v: number, _n: string, p: { payload?: { flagged: number; n: number } }) =>
                  [`${v.toFixed(3)}% (${fmtInt(p.payload?.flagged)} из ${fmtInt(p.payload?.n)})`, "ложные тревоги"]}
              />
              <Bar dataKey="pct" radius={[0, 8, 8, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

/* ---------- состав данных ---------- */
function FamilyDistribution({ families }: { families: IntrusionReport["eda"]["families"] }) {
  return (
    <Card>
      <SectionTitle>Состав трафика (лог-шкала)</SectionTitle>
      <ResponsiveContainer width="100%" height={Math.max(260, families.length * 26)}>
        <BarChart data={families} layout="vertical" margin={{ left: 10, right: 16 }}>
          <XAxis type="number" scale="log" domain={[1, "auto"]} allowDataOverflow tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} />
          <YAxis dataKey="family" type="category" width={150} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => fmtInt(v)} />
          <Bar dataKey="n" radius={[0, 8, 8, 0]}>
            {families.map((f, i) => <Cell key={i} fill={f.is_rare ? "#f43f5e" : "#34d399"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-slate-500">Красным — «редкие атаки» (положительный класс), зелёным — всё остальное, включая громкие DoS/DDoS/PortScan.</p>
    </Card>
  );
}

/* ---------- таблица моделей ---------- */
function ModelTable({ models, selectedName }: { models: BinaryModel[]; selectedName: string }) {
  return (
    <Card>
      <SectionTitle>Модели · метрики на тесте</SectionTitle>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-border">
            <tr>
              <th className="text-left py-2">Model</th>
              <th className="text-right">MCC</th>
              <th className="text-right">PR-AUC</th>
              <th className="text-right">ROC-AUC</th>
              <th className="text-right">Recall</th>
              <th className="text-right">Precision</th>
              <th className="text-right">FP</th>
              <th className="text-right">Accuracy</th>
              <th className="text-right">Порог</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name} className={`border-b border-border/50 ${m.name === selectedName ? "bg-indigo-500/5" : ""}`}>
                <td className="py-2">
                  {m.name}
                  {m.is_best && <Badge tone="success" className="ml-2">best</Badge>}
                  {m.is_baseline && <Badge tone="danger" className="ml-2">baseline</Badge>}
                  {m.name === selectedName && <Badge tone="info" className="ml-2">selected</Badge>}
                </td>
                <td className={`text-right font-mono ${m.is_best ? "font-bold text-emerald-500" : ""}`}>{fmtNum(m.metrics.mcc, 4)}</td>
                <td className="text-right font-mono">{fmtNum(m.pr_auc, 4)}</td>
                <td className="text-right font-mono">{fmtNum(m.roc_auc, 4)}</td>
                <td className="text-right font-mono">{fmtPct(m.metrics.recall_pos)}</td>
                <td className="text-right font-mono">{fmtPct(m.metrics.precision_pos)}</td>
                <td className="text-right font-mono">{fmtInt(m.confusion_counts.fp)}</td>
                <td className="text-right font-mono">{fmtPct(m.metrics.accuracy, 3)}</td>
                <td className="text-right font-mono text-slate-500">{m.threshold.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------- страница ---------- */
export default function IntrusionPage() {
  const { report, error } = useReport<IntrusionReport>(REPORT_SLUGS.intrusion);
  const [modelIdx, setModelIdx] = useState<number | null>(null);
  const [thr, setThr] = useState<number | null>(null);

  if (error) return <ReportError message={error} />;
  if (!report) return <ReportSkeleton />;

  const models = report.models;
  const idx = modelIdx ?? Math.max(0, models.findIndex((m) => m.is_best));
  const model = models[idx];
  const counts = thr === null ? model.confusion_counts : countsAt(model.sweep, thr);
  const d = derive(counts);
  const n = report.meta.narrative;
  const nr = n as unknown as Record<string, string>;
  const ts = report.meta.target_stats;
  const select = (i: number) => { setModelIdx(i); setThr(null); };

  return (
    <div className="space-y-6">
      <HeroCard
        kicker={report.meta.title}
        title={model.name}
        badges={[
          ...(model.is_best ? [{ text: "best", tone: "success" as const }] : []),
          ...(model.is_baseline ? [{ text: "baseline", tone: "danger" as const }] : []),
        ]}
        value={fmtNum(d.mcc, 4)}
        valueLabel="MCC"
        subtitle={report.meta.subtitle}
        side={<Badge tone="info">PR-AUC {fmtNum(model.pr_auc, 4)}</Badge>}
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{report.meta.dataset}</Badge>
        <Badge>{fmtCompact(report.meta.n_samples)} потоков после дедупликации</Badge>
        <Badge tone="info">{report.meta.n_features} признаков потока</Badge>
      </div>

      <ModelChips models={models} idx={idx} onSelect={select} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricTile label="MCC" value={fmtNum(d.mcc, 4)} tone="text-emerald-500" hint="Использует все четыре клетки confusion matrix" />
        <MetricTile label="PR-AUC" value={fmtNum(model.pr_auc, 4)} hint="Площадь под precision–recall; baseline = prevalence" />
        <MetricTile label="Recall (редкие)" value={fmtPct(d.recall)} />
        <MetricTile label="Precision" value={fmtPct(d.precision)} />
        <MetricTile label="F1" value={fmtNum(d.f1, 4)} />
        <MetricTile label="Ложных тревог" value={fmtPct(d.fpr, 4)} tone="text-amber-500" hint="FPR: доля обычных потоков, помеченных как атака" />
        <MetricTile label="Balanced acc." value={fmtPct((d.recall + d.specificity) / 2)} />
        <MetricTile label="ROC-AUC" value={fmtNum(model.roc_auc, 4)} tone="text-slate-500" hint="Раздут числом верно отпущенных потоков" />
        <MetricTile label="Accuracy" value={fmtPct(d.accuracy, 3)} tone="text-slate-500" hint="Почти не отличает baseline от модели" />
        <MetricTile label="FP / FN" value={`${fmtInt(counts.fp)} / ${fmtInt(counts.fn)}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <IntrusionThresholdPanel model={model} thr={thr} onThr={setThr} counts={counts} />
        <div className="space-y-5">
          <BinaryConfusion counts={counts} posLabel="редкая атака" negLabel="трафик" />
          <IntrusionAlertCard counts={counts} />
        </div>
      </div>

      <IntrusionModelComparison models={models} selectedName={model.name} />
      <IntrusionPrecisionRecallCard model={model} prevalence={ts.prevalence_test ?? ts.prevalence} counts={counts} />
      <FamilyCard model={model} />

      <div className="grid lg:grid-cols-2 gap-5">
        <ImportanceCard items={model.feature_importance} />
        <FamilyDistribution families={report.eda.families} />
      </div>

      <ModelTable models={models} selectedName={model.name} />
      <SparkRunCard spark={report.meta.spark} />

      <NarrativeCard
        items={[
          { title: "Данные", text: n.context },
          { title: "Метрика", text: n.why_hero },
          { title: "Почему не accuracy", text: n.why_not_accuracy },
          { title: "Почему не ROC-AUC", text: nr.why_not_roc_auc },
          { title: "Способы против дисбаланса", text: nr.imbalance_methods },
          { title: "Вывод", text: n.main_conclusion },
          { title: "Разбиение", text: report.meta.split_note },
        ]}
        rules={n.rules}
      />
    </div>
  );
}
