"use client";
import { ReactNode } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Counts, FeatureImp, SparkBlock,
  fmtCompact, fmtInt, fmtPct, fmtSeconds,
} from "@/lib/data/reports";

export const PALETTE = ["#6366f1", "#8b5cf6", "#0ea5e9", "#34d399", "#f59e0b", "#f43f5e", "#14b8a6", "#ec4899"];

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
      {children}
    </h3>
  );
}

/* ---------- загрузка / ошибка ---------- */
export function ReportError({ message }: { message: string }) {
  return (
    <Card>
      <p className="text-rose-500">Ошибка загрузки артефакта: {message}</p>
    </Card>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 w-full rounded-2xl bg-slate-500/10" />
      <div className="h-12 w-full rounded-2xl bg-slate-500/10" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-20 w-full rounded-2xl bg-slate-500/10" />
        ))}
      </div>
      <div className="h-72 w-full rounded-2xl bg-slate-500/10" />
    </div>
  );
}

/* ---------- hero ---------- */
export function HeroCard(props: {
  kicker: string;
  title: string;
  badges?: { text: string; tone: "default" | "success" | "danger" | "warning" | "info" }[];
  value: string;
  valueLabel: string;
  subtitle: string;
  side?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
      <p className="text-xs uppercase tracking-widest text-slate-500">{props.kicker}</p>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <h1 className="text-2xl font-bold">{props.title}</h1>
        {props.badges?.map((b) => (
          <Badge key={b.text} tone={b.tone}>{b.text}</Badge>
        ))}
      </div>
      <div className="flex items-end gap-3 mt-4 flex-wrap">
        <span className="text-4xl font-black bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text text-transparent">
          {props.value}
        </span>
        <Badge tone="info">{props.valueLabel}</Badge>
        {props.side}
      </div>
      <p className="text-sm text-slate-500 mt-3">{props.subtitle}</p>
    </Card>
  );
}

export function MetricTile({
  label, value, tone = "", hint, sub,
}: { label: string; value: string; tone?: string; hint?: string; sub?: string }) {
  return (
    <Card className="p-3.5" title={hint}>
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1 leading-snug">{sub}</p>}
    </Card>
  );
}

/* ---------- выбор модели ---------- */
export function ModelChips({
  models, idx, onSelect,
}: {
  models: { name: string; is_best: boolean; is_baseline: boolean }[];
  idx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {models.map((m, i) => (
        <button
          key={m.name}
          onClick={() => onSelect(i)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            idx === i
              ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30"
              : "border-border text-slate-500 hover:border-indigo-500/50"
          }`}
        >
          {m.name}
          {m.is_best && <span className="ml-2 text-[10px] opacity-80">best</span>}
          {m.is_baseline && <span className="ml-2 text-[10px] opacity-70">baseline</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- нарратив ---------- */
export function NarrativeCard({
  items, rules,
}: {
  items: { title: string; text?: string | null }[];
  rules?: Record<string, string>;
}) {
  const shown = items.filter((i) => i.text);
  return (
    <Card>
      <SectionTitle>Как читать результат</SectionTitle>
      <div className="mt-4 grid lg:grid-cols-2 gap-x-8 gap-y-4">
        {shown.map((it) => (
          <div key={it.title}>
            <p className="text-[11px] uppercase tracking-wide text-indigo-500 font-semibold">{it.title}</p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>
      {rules && Object.keys(rules).length > 0 && (
        <ul className="mt-5 pt-4 border-t border-border grid sm:grid-cols-2 gap-2">
          {Object.entries(rules).map(([k, v]) => (
            <li key={k} className="text-xs text-slate-500 flex gap-2">
              <span className="text-emerald-500">●</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Spark ---------- */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-500/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-bold mt-0.5 font-mono">{value}</p>
    </div>
  );
}

export function SparkRunCard({ spark }: { spark: SparkBlock }) {
  const timings = Object.entries(spark.timings ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9);
  const maxT = timings.length ? timings[0][1] : 1;
  const total = Object.values(spark.timings ?? {}).reduce((s, v) => s + v, 0);
  const isLocal = spark.mode === "local";
  return (
    <Card>
      <div className="flex items-center gap-3 flex-wrap">
        <SectionTitle>Spark · как это считалось</SectionTitle>
        <Badge tone={isLocal ? "warning" : "success"}>{isLocal ? "local" : "cluster"}</Badge>
        <span className="text-xs text-slate-500 font-mono">Spark {spark.spark_version}</span>
      </div>

      {isLocal && (
        <p className="text-xs text-amber-500 mt-3">
          Ноутбук работал без кластера и взял {(spark.data_fraction * 100).toFixed(0)}% данных. Запустите
          профиль <code>spark</code> (spark-master + spark-worker) для полного объёма.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <Stat label="Строк в CSV" value={fmtCompact(spark.n_rows_raw)} />
        <Stat label="После очистки" value={fmtCompact(spark.n_rows_used)} />
        <Stat label="Ядра" value={String(spark.cores)} />
        <Stat label="Память executor" value={spark.executor_memory} />
        <Stat label="Parallelism" value={String(spark.default_parallelism)} />
        <Stat label="Shuffle partitions" value={String(spark.shuffle_partitions)} />
        <Stat label="Доля данных" value={`${(spark.data_fraction * 100).toFixed(0)}%`} />
        <Stat label="Время этапов" value={fmtSeconds(total)} />
      </div>

      <div className="mt-5 space-y-1.5">
        {timings.map(([name, sec]) => {
          const displayName = name.replace(
            /^(обучение|оценка)(?=\s·)/i,
            (word) => word[0].toUpperCase() + word.slice(1)
          );

          return (
            <div key={name} className="flex items-center gap-3 text-xs">
              <span className="w-64 shrink-0 truncate text-slate-500" title={displayName}>{displayName}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-500/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${Math.max(2, (sec / maxT) * 100)}%` }}
                />
              </div>
              <span className="w-16 text-right font-mono text-slate-500">{fmtSeconds(sec)}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 mt-4">
        Master UI {spark.ui?.master ?? ":8085"} · History Server {spark.ui?.history ?? ":18080"} · общий каталог{" "}
        <code>{spark.shared_dir}</code> · на драйвер возвращаются только агрегаты
      </p>
    </Card>
  );
}

/* ---------- важность признаков ---------- */
export function ImportanceCard({ items, limit = 15 }: { items: FeatureImp[]; limit?: number }) {
  const top = (items ?? []).slice(0, limit);
  return (
    <Card>
      <SectionTitle>Feature importance (top-{limit})</SectionTitle>
      {top.length === 0 ? (
        <p className="text-sm text-slate-500 mt-4">Для этой модели важность признаков не рассчитывалась.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(260, top.length * 26)}>
          <BarChart data={top} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => Number(v).toFixed(4)} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {top.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

/* ---------- confusion 2×2 (стандартный вид) ---------- */
/**
 * Строки — ФАКТИЧЕСКИЙ класс, столбцы — ПРЕДСКАЗАННЫЙ, положительный класс первым:
 *
 *                 Predicted +   Predicted −   Σ
 *   Actual +         TP            FN         P   → Sensitivity
 *   Actual −         FP            TN         N   → Specificity
 *   Σ                PP            PN         n
 *                  Precision       NPV
 */
function CmCell({
  tag, caption, value, pct, tone, style,
}: {
  tag: string; caption: string; value: number; pct: string; tone: string; style: React.CSSProperties;
}) {
  return (
    <div className={`rounded-lg p-3 text-center flex flex-col justify-center ${tone}`} style={style}>
      <p className="text-[10px] uppercase tracking-wide opacity-80 font-semibold">{tag}</p>
      <p className="text-2xl font-black leading-tight">{fmtInt(value)}</p>
      <p className="text-[10px] opacity-70">{caption}</p>
      <p className="text-[11px] font-mono opacity-90 mt-0.5">{pct}</p>
    </div>
  );
}

function Margin({
  label, value, rate, rateLabel, style,
}: { label: string; value: number; rate?: string; rateLabel?: string; style: React.CSSProperties }) {
  return (
    <div className="rounded-lg bg-slate-500/5 p-2 text-center flex flex-col justify-center" style={style}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-bold font-mono">{fmtInt(value)}</p>
      {rate && (
        <p className="text-[10px] text-slate-500">
          {rateLabel} <b className="font-mono text-slate-700 dark:text-slate-200">{rate}</b>
        </p>
      )}
    </div>
  );
}

const HEAD = "text-[11px] text-slate-500 flex items-center justify-center text-center font-medium";

export function BinaryConfusion({
  counts, posLabel, negLabel,
}: { counts: Counts; posLabel: string; negLabel: string }) {
  const { tp, fp, fn, tn } = counts;
  const P = tp + fn;
  const N = fp + tn;
  const PP = tp + fp;
  const PN = fn + tn;
  const n = P + N;
  const share = (v: number, d: number) => (d > 0 ? fmtPct(v / d) : "—");
  return (
    <Card>
      <SectionTitle>Confusion matrix (тест)</SectionTitle>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <div
          className="grid gap-1.5 min-w-[440px]"
          style={{ gridTemplateColumns: "22px 84px repeat(3, minmax(88px, 1fr))" }}
        >
          {/* шапка: Predicted */}
          <div style={{ gridColumn: "3 / span 2", gridRow: 1 }} className={`${HEAD} uppercase tracking-widest`}>
            Predicted (предсказано)
          </div>
          <div style={{ gridColumn: 5, gridRow: 1 }} />
          <div style={{ gridColumn: 3, gridRow: 2 }} className={HEAD}>Positive · {posLabel}</div>
          <div style={{ gridColumn: 4, gridRow: 2 }} className={HEAD}>Negative · {negLabel}</div>
          <div style={{ gridColumn: 5, gridRow: 2 }} className={HEAD}>Σ actual</div>

          {/* подпись Actual */}
          <div
            style={{ gridColumn: 1, gridRow: "3 / span 3", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            className={`${HEAD} uppercase tracking-widest`}
          >
            Actual (факт)
          </div>
          <div style={{ gridColumn: 2, gridRow: 3 }} className={`${HEAD} justify-end pr-1`}>Positive · {posLabel}</div>
          <div style={{ gridColumn: 2, gridRow: 4 }} className={`${HEAD} justify-end pr-1`}>Negative · {negLabel}</div>
          <div style={{ gridColumn: 2, gridRow: 5 }} className={`${HEAD} justify-end pr-1`}>Σ predicted</div>

          {/* ядро матрицы */}
          <CmCell tag="TP" caption="истинно положительные" value={tp} pct={`${share(tp, P)} строки`}
                tone="bg-emerald-500/15 text-emerald-500" style={{ gridColumn: 3, gridRow: 3 }} />
          <CmCell tag="FN" caption="ложно отрицательные" value={fn} pct={`${share(fn, P)} строки`}
                tone="bg-rose-500/15 text-rose-500" style={{ gridColumn: 4, gridRow: 3 }} />
          <CmCell tag="FP" caption="ложно положительные" value={fp} pct={`${share(fp, N)} строки`}
                tone="bg-amber-500/15 text-amber-500" style={{ gridColumn: 3, gridRow: 4 }} />
          <CmCell tag="TN" caption="истинно отрицательные" value={tn} pct={`${share(tn, N)} строки`}
                tone="bg-sky-500/15 text-sky-500" style={{ gridColumn: 4, gridRow: 4 }} />

          {/* итоги по строкам и столбцам */}
          <Margin label="P" value={P} rate={share(tp, P)} rateLabel="Sensitivity" style={{ gridColumn: 5, gridRow: 3 }} />
          <Margin label="N" value={N} rate={share(tn, N)} rateLabel="Specificity" style={{ gridColumn: 5, gridRow: 4 }} />
          <Margin label="PP" value={PP} rate={share(tp, PP)} rateLabel="Precision" style={{ gridColumn: 3, gridRow: 5 }} />
          <Margin label="PN" value={PN} rate={share(tn, PN)} rateLabel="NPV" style={{ gridColumn: 4, gridRow: 5 }} />
          <Margin label="всего" value={n} style={{ gridColumn: 5, gridRow: 5 }} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mt-3">
        Строки — фактический класс, столбцы — предсказанный; положительный класс первым. Проценты в клетках — доля от
        суммы строки; справа — Sensitivity и Specificity, снизу — Precision и NPV.
      </p>
    </Card>
  );
}
