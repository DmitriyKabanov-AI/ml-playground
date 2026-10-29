"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  HeroCard, MetricTile, ModelChips, NarrativeCard, SparkRunCard, ImportanceCard,
  BinaryConfusion, SectionTitle, ReportError, ReportSkeleton, PALETTE,
} from "@/components/shared/reportUi";
import { FBetaThresholdCard } from "@/components/shared/FBetaThresholdCard";
import { AveragePrecisionCard } from "@/components/shared/AveragePrecisionCard";
import { BrierScoreCard } from "@/components/shared/BrierScoreCard";
import {
  FlightsReport, BinaryModel, REPORT_SLUGS, useReport,
  countsAt, countsAtIdx, bestCostIdx, costPer1000,
  fmtPct, fmtNum, fmtInt, fmtCompact, isNum,
} from "@/lib/data/reports";
import { fullMetrics, getAp, getBrier, brierNoSkill, brierSkill } from "@/lib/data/binaryMetrics";

const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

/* ---------- калькулятор цены ошибок ---------- */
function CostExplorer({
  model, models, cfp, cfn, unit, setCfp, setCfn, thr, onThr, defaults,
}: {
  model: BinaryModel;
  models: BinaryModel[];
  cfp: number;
  cfn: number;
  unit: string;
  setCfp: (v: number) => void;
  setCfn: (v: number) => void;
  thr: number | null;
  onThr: (t: number | null) => void;
  defaults: { fp: number; fn: number };
}) {
  const sw = model.sweep;
  const shown = thr ?? model.threshold;
  const bestI = useMemo(() => bestCostIdx(sw, cfp, cfn), [sw, cfp, cfn]);
  const bestThr = sw.thresholds[bestI];
  const bestCost = costPer1000(countsAtIdx(sw, bestI), cfp, cfn);
  const cur = costPer1000(thr === null ? model.confusion_counts : countsAt(sw, thr), cfp, cfn);
  const baselines = models.filter((m) => m.is_baseline);
  const theory = cfp + cfn > 0 ? cfp / (cfp + cfn) : 0.5;

  const data = useMemo(
    () => sw.thresholds.map((t, i) => ({ t, cost: costPer1000(countsAtIdx(sw, i), cfp, cfn) })),
    [sw, cfp, cfn]
  );

  const field = (label: string, v: number, set: (n: number) => void) => (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={5}
          value={v}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            set(Number.isFinite(n) && n >= 0 ? n : 0);
          }}
          className="w-28 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-mono text-slate-900 dark:text-white"
        />
        <span>{unit}</span>
      </div>
    </label>
  );

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionTitle>Цена ошибок</SectionTitle>
        <button
          onClick={() => { setCfp(defaults.fp); setCfn(defaults.fn); }}
          className="text-xs px-3 py-1 rounded-lg border border-border text-slate-500 hover:border-indigo-500/50"
        >
          сбросить цены
        </button>
      </div>

      <div className="flex flex-wrap gap-6 mt-4 items-end">
        {field("FP — ложная тревога", cfp, setCfp)}
        {field("FN — пропущенная задержка", cfn, setCfn)}
        <div className="text-xs text-slate-500 pb-2">
          для откалиброванной модели оптимальный порог ≈ <b className="font-mono">{theory.toFixed(2)}</b>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mt-4">
        <div className="rounded-lg bg-slate-500/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Сейчас (порог {shown.toFixed(2)})</p>
          <p className="text-lg font-black">{fmtInt(cur)} {unit}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-emerald-500">Оптимум на тестовой сетке</p>
          <p className="text-lg font-black text-emerald-500">{fmtInt(bestCost)} {unit}</p>
          <p className="text-[11px] text-slate-500">порог {bestThr.toFixed(2)}</p>
        </div>
        <button
          onClick={() => onThr(bestThr)}
          className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-500 hover:bg-indigo-500/20 transition-colors"
        >
          Применить порог {bestThr.toFixed(2)}
        </button>
      </div>
      <p className="text-[11px] text-slate-500 mt-2">
        Оптимум найден по тестовой сетке, поэтому слегка оптимистичен: в ноутбуке порог подбирался на отдельной валидации.
      </p>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12 }}
              formatter={(v: number) => `${fmtInt(v)} ${unit}`}
              labelFormatter={(l) => `порог ${Number(l).toFixed(2)}`}
            />
            {baselines.map((b, i) => (
              <ReferenceLine
                key={b.name}
                y={costPer1000(b.confusion_counts, cfp, cfn)}
                stroke={i === 0 ? "#f43f5e" : "#f59e0b"}
                strokeDasharray="5 4"
                label={{ value: b.name.replace("Baseline · ", ""), fontSize: 10, fill: "#94a3b8", position: "insideTopRight" }}
              />
            ))}
            <ReferenceLine x={bestThr} stroke="#34d399" strokeDasharray="3 3" />
            <ReferenceLine x={shown} stroke="#6366f1" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="cost" name="Потери" stroke="#8b5cf6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-slate-500">
          Потери на 1000 рейсов. Фиолетовая — модель, пунктир — baseline'ы без модели; зелёная вертикаль — оптимум, синяя — текущий порог.
        </p>
      </div>
    </Card>
  );
}

/* ---------- EDA ---------- */
function RateBars({
  title, data, xKey, prevalence, horizontal = false, fmtX,
}: {
  title: string;
  data: { n: number; rate: number; [k: string]: string | number }[];
  xKey: string;
  prevalence: number;
  horizontal?: boolean;
  fmtX?: (v: string | number) => string;
}) {
  const rows = data.map((d) => ({ ...d, label: fmtX ? fmtX(d[xKey]) : String(d[xKey]), pct: d.rate * 100 }));
  const h = horizontal ? Math.max(260, rows.length * 24) : 240;
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <ResponsiveContainer width="100%" height={h}>
        {horizontal ? (
          <BarChart data={rows} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
            <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
            <ReferenceLine x={prevalence * 100} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="pct" radius={[0, 8, 8, 0]}>
              {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={rows}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} unit="%" width={40} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
            <ReferenceLine y={prevalence * 100} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="pct" radius={[6, 6, 0, 0]} fill="#6366f1" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}

/* ---------- таблица моделей ---------- */
function ModelTable({
  models, selectedName, cfp, cfn, unit,
}: { models: BinaryModel[]; selectedName: string; cfp: number; cfn: number; unit: string }) {
  const rows = [...models].sort(
    (a, b) =>
      Number(a.is_baseline) - Number(b.is_baseline) ||
      costPer1000(a.confusion_counts, cfp, cfn) - costPer1000(b.confusion_counts, cfp, cfn)
  );
  return (
    <Card>
      <SectionTitle>Модели · цена на тесте при их порогах</SectionTitle>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="text-xs text-slate-500 border-b border-border">
            <tr>
              <th className="text-left py-2">Model</th>
              <th className="text-right">Порог</th>
              <th className="text-right">{unit}/1000</th>
              <th className="text-right px-2">Sensitivity</th>
              <th className="text-right px-2">Specificity</th>
              <th className="text-right px-2">Precision</th>
              <th className="text-right px-2">NPV</th>
              <th className="text-right px-2">MCC</th>
              <th className="text-right px-2">AP</th>
              <th className="text-right px-2">Brier</th>
              <th className="text-right px-2">F0.5</th>
              <th className="text-right px-2">F2.0</th>
              <th className="text-right">Train</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const c = costPer1000(m.confusion_counts, cfp, cfn);
              const d = fullMetrics(m.confusion_counts);
              return (
                <tr key={m.name} className={`border-b border-border/50 ${m.name === selectedName ? "bg-indigo-500/5" : ""}`}>
                  <td className="py-2">
                    {m.name}
                    {m.is_baseline && <Badge tone="danger" className="ml-2">baseline</Badge>}
                    {m.name === selectedName && <Badge tone="info" className="ml-2">selected</Badge>}
                  </td>
                  <td className="text-right font-mono">{m.threshold.toFixed(3)}</td>
                  <td className="text-right font-mono font-bold">{fmtInt(c)}</td>
                  <td className="text-right font-mono px-2">{fmtPct(d.sensitivity)}</td>
                  <td className="text-right font-mono px-2">{fmtPct(d.specificity)}</td>
                  <td className="text-right font-mono px-2">{fmtPct(d.precision)}</td>
                  <td className="text-right font-mono px-2">{fmtPct(d.npv)}</td>
                  <td className="text-right font-mono px-2">{fmtNum(d.mcc)}</td>
                  <td className="text-right font-mono px-2">{fmtNum(getAp(m), 4)}</td>
                  <td className="text-right font-mono px-2">{fmtNum(getBrier(m), 4)}</td>
                  <td className="text-right font-mono px-2">{fmtNum(d.f05)}</td>
                  <td className="text-right font-mono px-2">{fmtNum(d.f2)}</td>
                  <td className="text-right font-mono text-slate-500">{isNum(m.train_seconds) ? `${m.train_seconds.toFixed(0)} с` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------- страница ---------- */
export default function FlightDelaysPage() {
  const { report, error } = useReport<FlightsReport>(REPORT_SLUGS.flights);
  const [modelIdx, setModelIdx] = useState<number | null>(null);
  const [thr, setThr] = useState<number | null>(null);
  const [costs, setCosts] = useState<{ fp: number; fn: number } | null>(null);

  if (error) return <ReportError message={error} />;
  if (!report) return <ReportSkeleton />;

  const models = report.models;
  const defaultIdx = Math.max(0, models.findIndex((m) => m.is_best));
  const idx = modelIdx ?? defaultIdx;
  const model = models[idx];
  const def = report.meta.costs;
  const cfp = costs?.fp ?? def.fp;
  const cfn = costs?.fn ?? def.fn;
  const unit = def.unit;

  const counts = thr === null ? model.confusion_counts : countsAt(model.sweep, thr);
  const m = fullMetrics(counts);
  const ap = getAp(model);
  const brier = getBrier(model);
  const cost = costPer1000(counts, cfp, cfn);
  const baselineCosts = models.filter((m) => m.is_baseline).map((m) => costPer1000(m.confusion_counts, cfp, cfn));
  const bestBaseline = baselineCosts.length ? Math.min(...baselineCosts) : NaN;
  const saving = isNum(bestBaseline) && bestBaseline > 0 ? 1 - cost / bestBaseline : NaN;
  const n = report.meta.narrative;
  const prevalence = report.meta.target_stats.prevalence;
  const bss = brierSkill(brier, prevalence);

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
        value={`${fmtInt(cost)} ${unit}`}
        valueLabel="потери на 1000 рейсов"
        subtitle={report.meta.subtitle}
        side={
          isNum(saving) && !model.is_baseline ? (
            <Badge tone={saving > 0 ? "success" : "danger"}>
              {saving > 0 ? "−" : "+"}{Math.abs(saving * 100).toFixed(1)}% к лучшему baseline
            </Badge>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <Badge>{report.meta.dataset}</Badge>
        <Badge>{fmtCompact(report.meta.n_samples)} рейсов</Badge>
        <Badge>train {fmtCompact(report.meta.n_train)} · val {fmtCompact(report.meta.n_val)} · test {fmtCompact(report.meta.n_test)}</Badge>
        <Badge tone="warning">задержка ≥15 мин: {fmtPct(prevalence)}</Badge>
        <Badge tone="info">{report.meta.n_features} признаков</Badge>
      </div>

      <ModelChips models={models} idx={idx} onSelect={select} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricTile label="Sensitivity" value={fmtPct(m.sensitivity)} tone="text-emerald-500" sub="TP / (TP + FN) · доля пойманных задержек" hint="Sensitivity = Recall = TPR" />
        <MetricTile label="Specificity" value={fmtPct(m.specificity)} tone="text-sky-500" sub="TN / (TN + FP) · доля верно отпущенных" hint="Specificity = TNR = 1 − FPR" />
        <MetricTile label="Precision" value={fmtPct(m.precision)} sub="TP / (TP + FP) · доля верных тревог" hint="Precision = PPV" />
        <MetricTile label="NPV" value={fmtPct(m.npv)} sub="TN / (TN + FN) · доля верных «вовремя»" hint="Negative Predictive Value" />
        <MetricTile label="MCC" value={fmtNum(m.mcc)} sub="корреляция Мэтьюса, −1…1 · все 4 клетки" hint="Устойчив к дисбалансу классов" />
        <MetricTile label="AP" value={fmtNum(ap, 4)} sub={`Average Precision · без модели = ${fmtPct(prevalence)}`} hint="Не зависит от порога" />
        <MetricTile label="Brier Score" value={fmtNum(brier, 4)} tone="text-amber-500" sub={`средний (p − y)² · ниже лучше · no-skill ${brierNoSkill(prevalence).toFixed(4)}`} hint="Не зависит от порога; 0 — идеально" />
        <MetricTile label="F0.5 · задержка" value={fmtNum(m.f05)} sub="Положительный сценарий: «задержка» — целевой класс · вес precision выше recall" hint="β = 0.5, precision = Precision, recall = Sensitivity" />
        <MetricTile label="F2.0 · задержка" value={fmtNum(m.f2)} sub="Положительный сценарий: «задержка» — целевой класс · вес recall выше precision" hint="β = 2, precision = Precision, recall = Sensitivity" />
        <MetricTile label="Brier Skill Score" value={fmtNum(bss, 3)} tone={isNum(bss) && bss > 0 ? "text-emerald-500" : "text-rose-500"} sub="1 − Brier / no-skill · выше лучше, > 0 — лучше константы prevalence" hint="Не зависит от порога; 1 — идеально, 0 — как предсказание prevalence" />
        <MetricTile label="F0.5 · вовремя" value={fmtNum(m.f05Neg)} sub="Отрицательный сценарий: «вовремя» — целевой класс · вес NPV выше Specificity" hint="β = 0.5, precision = NPV, recall = Specificity" />
        <MetricTile label="F2.0 · вовремя" value={fmtNum(m.f2Neg)} sub="Отрицательный сценарий: «вовремя» — целевой класс · вес Specificity выше NPV" hint="β = 2, precision = NPV, recall = Specificity" />
      </div>
      <p className="text-[11px] text-slate-500 -mt-3">
        Sensitivity, Specificity, Precision, NPV, MCC и F0.5 / F2.0 (для «задержки» и «вовремя») — при пороге {(thr ?? model.threshold).toFixed(3)}; AP, Brier Score и Brier Skill Score от порога не зависят.
      </p>

      <div className="grid lg:grid-cols-2 gap-5">
        <CostExplorer
          model={model} models={models} cfp={cfp} cfn={cfn} unit={unit}
          setCfp={(v) => setCosts({ fp: v, fn: cfn })} setCfn={(v) => setCosts({ fp: cfp, fn: v })}
          thr={thr} onThr={setThr} defaults={def}
        />
        <BinaryConfusion counts={counts} posLabel="задержка" negLabel="вовремя" />
      </div>

      <FBetaThresholdCard
        model={model} thr={thr} onThr={setThr} counts={counts}
        posLabel="задержка" negLabel="вовремя" tunedLabel="оптимум на валидации"
      />

      <AveragePrecisionCard models={models} selectedName={model.name} prevalence={prevalence} />

      <BrierScoreCard models={models} selectedName={model.name} prevalence={prevalence} />

      <div className="grid lg:grid-cols-2 gap-5">
        <RateBars title="Доля задержек по часу вылета" data={report.eda.by_hour} xKey="dep_hour" prevalence={prevalence} fmtX={(v) => `${v}`} />
        <RateBars title="Доля задержек по месяцам" data={report.eda.by_month} xKey="month" prevalence={prevalence} fmtX={(v) => MONTHS[Number(v) - 1] ?? String(v)} />
      </div>
      <RateBars title="Доля задержек по авиакомпаниям" data={report.eda.by_airline} xKey="name" prevalence={prevalence} horizontal />

      <ImportanceCard items={model.feature_importance} />
      <ModelTable models={models} selectedName={model.name} cfp={cfp} cfn={cfn} unit={unit} />

      <SparkRunCard spark={report.meta.spark} />

      <NarrativeCard
        items={[
          { title: "Данные", text: n.context },
          { title: "Метрика", text: n.why_hero },
          { title: "Почему не accuracy", text: n.why_not_accuracy },
          { title: "AP и Brier", text: (n as unknown as Record<string, string | undefined>).why_ap_brier },
          { title: "Вывод", text: n.main_conclusion },
          { title: "Разбиение", text: report.meta.split_note },
        ]}
        rules={n.rules}
      />
    </div>
  );
}
