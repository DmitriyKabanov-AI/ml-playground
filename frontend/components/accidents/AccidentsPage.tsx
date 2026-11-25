"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import AccidentGeoMap, { type MapData } from "./AccidentGeoMap";
import {
  HeroCard, MetricTile, ModelChips, NarrativeCard, SparkRunCard, ImportanceCard,
  SectionTitle, ReportError, ReportSkeleton,
} from "@/components/shared/reportUi";
import {
  AccidentsReport, MulticlassModel, REPORT_SLUGS, useReport,
  fmtPct, fmtNum, fmtInt, fmtCompact,
} from "@/lib/data/reports";

const CLASS_COLORS: Record<string, string> = {
  S1: "#34d399", S2: "#0ea5e9", S3: "#f59e0b", S4: "#f43f5e",
};
const colorOf = (c: string) => CLASS_COLORS[c] ?? "#6366f1";

/* ---------- macro vs weighted по всем моделям ---------- */
function MacroWeightedCard({ models }: { models: MulticlassModel[] }) {
  const data = models.map((m) => ({
    name: m.name.replace("Baseline · ", "base · "),
    "macro-F1": m.metrics.f1_macro,
    "weighted-F1": m.metrics.f1_weighted,
    accuracy: m.metrics.accuracy,
    "balanced acc.": m.metrics.balanced_accuracy,
  }));
  return (
    <Card>
      <SectionTitle>Как качество модели зависит от способа оценки</SectionTitle>
      <p className="text-xs text-slate-500 mt-2">
        Доля верных ответов может скрывать слабую работу на редких классах. Macro-F1 учитывает каждый класс одинаково: и пропуски, и лишние ответы. В предыдущем прогоне правило «всегда S2» давало 79,7% верных при macro-F1 всего 0,222.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 12 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={52} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => Number(v).toFixed(4)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="macro-F1" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="weighted-F1" fill="#34d399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="accuracy" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="balanced acc." fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ---------- per-class ---------- */
function PerClassCard({ model, classes, rare, desc }: {
  model: MulticlassModel; classes: string[]; rare: string[]; desc: Record<string, string>;
}) {
  const data = classes.map((c) => ({ cls: c, recall: model.per_class[c].recall * 100 }));
  return (
    <Card>
      <SectionTitle>Качество по классам</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="cls" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={42} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} labelFormatter={(l) => `Распознано · ${l}`} />
          <Bar dataKey="recall" radius={[8, 8, 0, 0]}>
            {data.map((d) => <Cell key={d.cls} fill={colorOf(d.cls)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table className="w-full text-sm mt-2">
        <thead className="text-xs text-slate-500 border-b border-border">
          <tr>
            <th className="text-left py-2">Класс</th>
            <th className="text-right">Верных среди ответов</th>
            <th className="text-right">Распознано</th>
            <th className="text-right">F1</th>
            <th className="text-right">Аварий</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => {
            const p = model.per_class[c];
            return (
              <tr key={c} className="border-b border-border/50" title={desc[c]}>
                <td className="py-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ background: colorOf(c) }} />
                  {c}
                  {rare.includes(c) && <Badge tone="danger" className="ml-2">редкий</Badge>}
                </td>
                <td className="text-right font-mono">{fmtPct(p.precision)}</td>
                <td className="text-right font-mono">{fmtPct(p.recall)}</td>
                <td className="text-right font-mono">{fmtNum(p.f1)}</td>
                <td className="text-right font-mono text-slate-500">{fmtInt(p.support)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ---------- confusion K×K ---------- */
function ConfusionCard({ model, classes }: { model: MulticlassModel; classes: string[] }) {
  const [mode, setMode] = useState<"pct" | "count">("pct");
  const cm = model.confusion_matrix;
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionTitle>Где модель перепутала классы (тест)</SectionTitle>
        <div className="flex gap-1 p-1 rounded-lg border border-border">
          {(["pct", "count"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs ${mode === m ? "bg-indigo-500 text-white" : "text-slate-500"}`}
            >
              {m === "pct" ? "% по строке" : "штуки"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <table className="mx-auto text-sm border-separate border-spacing-1">
          <thead>
            <tr>
              <th />
              <th colSpan={classes.length} className="text-[11px] uppercase tracking-wide text-slate-500 pb-1">ответ модели</th>
            </tr>
            <tr>
              <th />
              {classes.map((c) => <th key={c} className="text-xs text-slate-500 font-semibold px-2">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {cm.map((row, i) => {
              const total = row.reduce((s, v) => s + v, 0) || 1;
              return (
                <tr key={i}>
                  <th className="text-xs text-slate-500 font-semibold pr-2 text-right">{i === 0 && <span className="block text-[10px] uppercase tracking-wide mb-1">реальный класс</span>}{classes[i]}</th>
                  {row.map((v, j) => {
                    const frac = v / total;
                    return (
                      <td
                        key={j}
                        className={`w-24 h-14 text-center rounded-lg ${i === j ? "ring-1 ring-indigo-500/60" : ""}`}
                        style={{ background: `rgba(99,102,241,${Math.min(0.85, 0.06 + frac * 0.8)})` }}
                        title={`${classes[i]} → ${classes[j]}: ${fmtInt(v)} (${(frac * 100).toFixed(2)}%)`}
                      >
                        <span className="font-bold text-slate-900 dark:text-white">
                          {mode === "pct" ? `${(frac * 100).toFixed(1)}%` : fmtCompact(v)}
                        </span>
                        {mode === "pct" && <span className="block text-[10px] text-slate-600 dark:text-slate-300">{fmtCompact(v)}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500 mt-3">
        Классы упорядочены по тяжести: ошибка «S4 → S1» хуже, чем «S4 → S3». Это учитывает квадратичный κ.
      </p>
    </Card>
  );
}

/* ---------- карта выборки ---------- */
function AccidentMap({ meta }: { meta?: MapData }) {
  return <Card>
    <SectionTitle>Где и в каких авариях модель ошиблась в оценке тяжести</SectionTitle>
    {meta ? <><p className="text-xs text-slate-500 mt-2">Карта построена для лучшей по macro-F1 модели: {meta.model}. Переключение модели выше не меняет эту карту.</p><AccidentGeoMap meta={meta} /></> : <p className="mt-3 text-sm text-slate-500">Для полной карты необходимо выполнить обновлённый ноутбук 04_accident_severity_multiclass.ipynb.</p>}
  </Card>;
}

/* ---------- EDA ---------- */
function EdaBlock({ eda, classes }: { eda: AccidentsReport["eda"]; classes: string[] }) {
  const yearData = eda.by_year.map((y) => ({ ...y, year: String(y.year) }));
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card>
        <SectionTitle>Баланс классов (лог-шкала)</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={eda.class_distribution}>
            <XAxis dataKey="class" tick={{ fontSize: 12 }} />
            <YAxis scale="log" domain={[1, "auto"]} allowDataOverflow tick={{ fontSize: 11 }} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12 }}
              formatter={(v: number, _n: string, p: { payload?: { share: number; desc: string } }) => [`${fmtInt(v)} (${fmtPct(p.payload?.share, 2)})`, p.payload?.desc ?? ""]}
            />
            <Bar dataKey="n" radius={[8, 8, 0, 0]}>
              {eda.class_distribution.map((d) => <Cell key={d.class} fill={colorOf(d.class)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle>Доли классов по годам — сдвиг состава данных</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={yearData}>
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={34} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => fmtPct(v, 1)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {classes.map((c) => <Bar key={c} dataKey={c} stackId="y" fill={colorOf(c)} />)}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-slate-500">Поэтому year не используется как признак, а оценка — «внутри распределения».</p>
      </Card>

      <Card>
        <SectionTitle>Доля тяжёлых (S3+S4) по часу суток</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={eda.by_hour}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => fmtPct(v, 1)} labelFormatter={(l) => `${l}:00`} />
            <Line type="monotone" dataKey="s34" name="S3+S4" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle>Доля тяжёлых по штатам (топ по числу аварий)</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={eda.by_state}>
            <XAxis dataKey="state" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number, k: string, p: { payload?: { n: number } }) => [`${fmtPct(v, 1)} · ${fmtCompact(p.payload?.n)} аварий`, "S3+S4"]} />
            <Bar dataKey="s34" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ---------- таблица моделей ---------- */
function ModelTable({ models, selectedName, rare }: { models: MulticlassModel[]; selectedName: string; rare: string[] }) {
  return (
    <Card>
      <SectionTitle>Сравнение моделей на тесте</SectionTitle>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-border">
            <tr>
              <th className="text-left py-2">Модель</th>
              <th className="text-right">macro-F1</th>
              <th className="text-right">weighted-F1</th>
              <th className="text-right">Разрыв</th>
              <th className="text-right">Доля верных</th>
              <th className="text-right">MCC</th>
              <th className="text-right">QWK</th>
              {rare.map((c) => <th key={c} className="text-right">Распознано {c}</th>)}
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name} className={`border-b border-border/50 ${m.name === selectedName ? "bg-indigo-500/5" : ""}`}>
                <td className="py-2">
                  {m.name}
                  {m.is_best && <Badge tone="success" className="ml-2">лучшая</Badge>}
                  {m.is_baseline && <Badge tone="danger" className="ml-2">простое правило</Badge>}
                  {m.name === selectedName && <Badge tone="info" className="ml-2">выбрана</Badge>}
                </td>
                <td className={`text-right font-mono ${m.is_best ? "font-bold text-emerald-500" : ""}`}>{fmtNum(m.metrics.f1_macro, 4)}</td>
                <td className="text-right font-mono">{fmtNum(m.metrics.f1_weighted, 4)}</td>
                <td className="text-right font-mono text-amber-500">{fmtNum(m.metrics.f1_weighted - m.metrics.f1_macro, 3)}</td>
                <td className="text-right font-mono">{fmtPct(m.metrics.accuracy)}</td>
                <td className="text-right font-mono">{fmtNum(m.metrics.mcc, 3)}</td>
                <td className="text-right font-mono">{fmtNum(m.metrics.qwk, 3)}</td>
                {rare.map((c) => <td key={c} className="text-right font-mono">{fmtPct(m.per_class[c]?.recall)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------- страница ---------- */
export default function AccidentsPage() {
  const { report, error } = useReport<AccidentsReport>(REPORT_SLUGS.accidents);
  const [modelIdx, setModelIdx] = useState<number | null>(null);

  if (error) return <ReportError message={error} />;
  if (!report) return <ReportSkeleton />;

  const models = report.models;
  const idx = modelIdx ?? Math.max(0, models.findIndex((m) => m.is_best));
  const model = models[idx];
  const m = model.metrics;
  const classes = report.meta.classes;
  const rare = report.meta.rare_classes;
  const n = report.meta.narrative;
  const nr = n as unknown as Record<string, string>;
  const gap = m.f1_weighted - m.f1_macro;

  return (
    <div className="space-y-6">
      <HeroCard
        kicker={report.meta.title}
        title={model.name}
        badges={[
          ...(model.is_best ? [{ text: "лучшая", tone: "success" as const }] : []),
          ...(model.is_baseline ? [{ text: "простое правило", tone: "danger" as const }] : []),
        ]}
        value={fmtNum(m.f1_macro, 4)}
        valueLabel="macro-F1"
        subtitle={report.meta.subtitle}
        side={
          <>
            <Badge tone="success">weighted-F1 {fmtNum(m.f1_weighted, 3)}</Badge>
            <Badge>Доля верных {fmtPct(m.accuracy)}</Badge>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{report.meta.dataset}</Badge>
        <Badge>{fmtCompact(report.meta.n_samples)} аварий</Badge>
        <Badge tone="danger">самый частый : самый редкий = {fmtInt(report.meta.target_stats.imbalance_ratio)} : 1</Badge>
        <Badge tone="info">{report.meta.n_features} признаков</Badge>
        <Badge tone="warning">редкие классы: {rare.join(", ") || "—"}</Badge>
      </div>

      <Card><SectionTitle>Что мы решаем</SectionTitle><p className="text-sm mt-2">Аварии уже произошли. По штату, координатам, времени, погоде и дорожным объектам модель оценивает влияние аварии на движение (S1–S4). Она не предсказывает, где произойдёт авария, и не оценивает опасность дорог. S4 означает максимальное влияние на движение, а не тяжесть травм.</p></Card>
      <ModelChips models={models} idx={idx} onSelect={setModelIdx} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricTile label="macro-F1" value={fmtNum(m.f1_macro, 4)} tone="text-emerald-500" hint="Средняя F1 по классам с равным весом" />
        <MetricTile label="weighted-F1" value={fmtNum(m.f1_weighted, 4)} hint="F1, взвешенная поддержкой классов" />
        <MetricTile label="Разрыв w − m" value={fmtNum(gap, 3)} tone={gap > 0.05 ? "text-amber-500" : ""} hint="Чем больше, тем сильнее усреднение прячет редкие классы" />
        <MetricTile label="Доля верных" value={fmtPct(m.accuracy)} tone="text-slate-500" />
        <MetricTile label="Средняя доля распознанных" value={fmtPct(m.balanced_accuracy)} hint="= macro-recall" />
        <MetricTile label="MCC" value={fmtNum(m.mcc, 3)} />
        <MetricTile label="Cohen κ" value={fmtNum(m.kappa, 3)} />
        <MetricTile label="Квадр. κ" value={fmtNum(m.qwk, 3)} hint="Учитывает порядок классов" />
        <MetricTile label="Верный класс среди двух" value={fmtPct(m.top2_accuracy)} hint="Истинный класс среди двух самых вероятных" />
        <MetricTile label="Средняя точность / полнота" value={`${fmtPct(m.precision_macro, 0)} / ${fmtPct(m.recall_macro, 0)}`} />
      </div>

      <MacroWeightedCard models={models} />

      <div className="grid lg:grid-cols-2 gap-5">
        <PerClassCard model={model} classes={classes} rare={rare} desc={report.meta.class_descriptions} />
        <ConfusionCard model={model} classes={classes} />
      </div>

      <AccidentMap meta={(report as AccidentsReport & { map_data?: MapData }).map_data} />
      <EdaBlock eda={report.eda} classes={classes} />

      <div className="grid lg:grid-cols-2 gap-5">
        <ImportanceCard items={model.feature_importance} />
        <ModelTable models={models} selectedName={model.name} rare={rare} />
      </div>

      <Card><SectionTitle>Ограничения</SectionTitle><p className="text-sm mt-2">Тест разделён случайно, без учёта времени. Штат может отражать различия в сборе данных, а не причину тяжести. В предыдущем прогоне модель распознала лишь 18,5% S1 и 7,6% S4. Карта не показывает риск будущих аварий.</p></Card>
      <SparkRunCard spark={report.meta.spark} />

      <NarrativeCard
        items={[
          { title: "Данные", text: n.context },
          { title: "Метрика", text: n.why_hero },
          { title: "Почему не weighted и accuracy", text: nr.why_not_weighted },
          { title: "Поправка на prior", text: nr.prior_correction },
          { title: "Вывод", text: n.main_conclusion },
          { title: "Разбиение", text: report.meta.split_note },
        ]}
        rules={n.rules}
      />
    </div>
  );
}
