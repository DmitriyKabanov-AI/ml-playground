"use client";

import { useMemo } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/shared/reportUi";
import {
  BinaryModel, Counts, derive, fmtInt, fmtNum, fmtPct,
} from "@/lib/data/reports";

const fraction = (part: number, total: number) => total > 0 ? part / total : 0;
const barWidth = (v: number) => `${Math.min(100, Math.max(0, v * 100))}%`;

/** Настройка чувствительности именно детектора вторжений — без сценариев задержек и F-beta. */
export function IntrusionThresholdPanel({
  model, thr, onThr, counts,
}: {
  model: BinaryModel;
  thr: number | null;
  onThr: (value: number | null) => void;
  counts: Counts;
}) {
  const sweep = model.sweep;
  const points = useMemo(() => sweep.thresholds.map((t, i) => {
    const d = derive({
      tp: sweep.tp[i], fp: sweep.fp[i], fn: sweep.fn[i], tn: sweep.tn[i],
    });
    return { t, precision: d.precision, recall: d.recall };
  }), [sweep]);

  const current = thr ?? model.threshold;
  const d = derive(counts);
  const step = sweep.thresholds.length > 1
    ? Math.max(0.001, sweep.thresholds[1] - sweep.thresholds[0]) : 0.01;
  const lo = sweep.thresholds[0] ?? 0;
  const hi = sweep.thresholds[sweep.thresholds.length - 1] ?? 1;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>Настройка чувствительности</SectionTitle>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Порог ниже — больше обнаруженных атак, но и больше ложных тревог. Порог выше — меньше тревог, но выше риск пропуска.
          </p>
        </div>
        <button
          type="button"
          disabled={thr === null}
          onClick={() => onThr(null)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-indigo-500 hover:border-indigo-500/50 disabled:cursor-default disabled:opacity-50"
        >
          Вернуть порог {model.threshold.toFixed(3)}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-border/70 bg-slate-500/[0.03] p-4">
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="intrusion-threshold" className="text-xs font-semibold">Порог срабатывания</label>
          <div className="text-right">
            <span className="font-mono text-xl font-bold tabular-nums">{current.toFixed(3)}</span>
            <p className="text-[10px] text-slate-500">{thr === null ? "выбран на validation" : "ручной · просмотр test"}</p>
          </div>
        </div>
        <input
          id="intrusion-threshold"
          className="mt-3 w-full accent-indigo-500"
          type="range"
          min={lo}
          max={hi}
          step={step}
          value={current}
          onChange={(e) => onThr(Number(e.target.value))}
          aria-label="Порог обнаружения редких сетевых атак"
        />
        <div className="mt-1 flex justify-between gap-3 text-[10px] text-slate-500">
          <span>Ниже · больше обнаружений</span>
          <span>Выше · меньше тревог</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-500/[0.07] px-3 py-3">
            <p className="text-[11px] text-slate-500">Обнаружено атак</p>
            <p className="mt-1 text-xl font-bold font-mono text-emerald-500">{fmtPct(d.recall)}</p>
            <p className="mt-1 text-[11px] text-slate-500">{fmtInt(counts.tp)} из {fmtInt(counts.tp + counts.fn)}</p>
          </div>
          <div className="rounded-lg bg-sky-500/[0.07] px-3 py-3">
            <p className="text-[11px] text-slate-500">Точность тревог</p>
            <p className="mt-1 text-xl font-bold font-mono text-sky-500">{fmtPct(d.precision)}</p>
            <p className="mt-1 text-[11px] text-slate-500">{fmtInt(counts.tp)} из {fmtInt(counts.tp + counts.fp)} верные</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold">Как меняются обнаружение и точность · test</p>
        <ResponsiveContainer width="100%" height={245}>
          <LineChart data={points} margin={{ left: 0, right: 12, top: 6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
            <XAxis dataKey="t" type="number" domain={[lo, hi]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => v.toFixed(2)} />
            <YAxis domain={[0, 1]} width={42} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 10 }}
              formatter={(v: number) => fmtPct(Number(v))}
              labelFormatter={(v) => `Порог ${Number(v).toFixed(3)}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="recall" name="Обнаружено атак" stroke="#10b981" strokeWidth={2.5} dot={false} type="linear" isAnimationActive={false} />
            <Line dataKey="precision" name="Точность тревог" stroke="#0ea5e9" strokeWidth={2.5} dot={false} type="linear" isAnimationActive={false} />
            <ReferenceLine x={model.threshold} stroke="#94a3b8" strokeDasharray="3 5" />
            <ReferenceLine x={current} stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Серый пунктир — порог, подобранный по MCC на validation; фиолетовая линия — текущий.
          Ручная настройка исследует test и не заменяет подбор порога на валидации.
        </p>
      </div>
    </Card>
  );
}

/** Интерпретация реальных и ложных срабатываний для выбранного порога. */
export function IntrusionAlertCard({ counts }: { counts: Counts }) {
  const totalAlerts = counts.tp + counts.fp;
  const attacks = counts.tp + counts.fn;
  const precision = fraction(counts.tp, totalAlerts);
  const recall = fraction(counts.tp, attacks);
  const fpPer100k = fraction(counts.fp, counts.tn + counts.fp) * 100000;

  return (
    <Card>
      <SectionTitle>Что означают срабатывания</SectionTitle>
      <p className="mt-2 text-xs text-slate-500">Результаты на тестовой выборке при выбранном пороге.</p>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] text-slate-500">Всего тревог</p>
          <p className="text-2xl font-bold font-mono">{fmtInt(totalAlerts)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">Из них настоящие атаки</p>
          <p className="text-xl font-bold font-mono text-emerald-500">{fmtInt(counts.tp)}</p>
        </div>
      </div>
      {totalAlerts > 0 ? (
        <>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-500/10" role="img" aria-label={`Верных тревог ${fmtPct(precision)}, ложных ${fmtPct(1 - precision)}`}>
            <div className="bg-emerald-500" style={{ width: barWidth(precision) }} />
            <div className="bg-amber-500" style={{ width: barWidth(1 - precision) }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px]">
            <span className="text-emerald-500">Верные · {fmtPct(precision)}</span>
            <span className="text-amber-500">Ложные · {fmtPct(1 - precision)}</span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Модель не подняла ни одной тревоги.</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-4">
        <div>
          <p className="text-[11px] text-slate-500">Пропущено атак</p>
          <p className="mt-1 text-lg font-bold font-mono text-rose-500">{fmtInt(counts.fn)}</p>
          <p className="mt-1 text-[10px] text-slate-500">{fmtPct(1 - recall)} всех редких атак</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500">Ложных тревог на 100 000 остальных потоков</p>
          <p className="mt-1 text-lg font-bold font-mono text-amber-500">{fmtNum(fpPer100k, 1)}</p>
          <p className="mt-1 text-[10px] text-slate-500">Нормировано для сравнения</p>
        </div>
      </div>
    </Card>
  );
}

type PRPoint = { recall: number; precision: number };
type WithPRCurve = BinaryModel & {
  curves?: { pr?: { recall?: number[]; precision?: number[] } };
};

/** Вместо AP/Brier, отсутствующих в отчёте: PR-кривая, действительно сохранённая notebook. */
export function IntrusionPrecisionRecallCard({
  model, prevalence, counts,
}: { model: BinaryModel; prevalence: number; counts: Counts }) {
  const pr = (model as WithPRCurve).curves?.pr;
  const data: PRPoint[] = (pr?.recall ?? []).map((recall, i) => ({
    recall, precision: pr?.precision?.[i] ?? NaN,
  })).filter((p) => Number.isFinite(p.recall) && Number.isFinite(p.precision));
  const current = derive(counts);
  const showCurrent = !model.is_baseline && Number.isFinite(current.recall) && Number.isFinite(current.precision);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>Точность обнаружения при разном охвате</SectionTitle>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            PR-кривая: как изменяется доля правильных тревог, когда модель пытается найти больше редких атак.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">PR-AUC · test</p>
          <p className="font-mono text-xl font-bold">{fmtNum(model.pr_auc, 4)}</p>
        </div>
      </div>
      {data.length > 1 ? (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={data} margin={{ left: 0, right: 14, top: 12, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
              <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
              <YAxis domain={[0, 1]} width={43} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10 }}
                labelFormatter={(v) => `Найдено атак: ${fmtPct(Number(v))}`}
                formatter={(v: number) => [fmtPct(Number(v)), "Верных среди тревог"]}
              />
              <ReferenceLine y={prevalence} stroke="#94a3b8" strokeDasharray="4 4" />
              <Line dataKey="precision" type="linear" stroke="#6366f1" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              {showCurrent && <ReferenceDot x={current.recall} y={current.precision} r={6} fill="#10b981" stroke="#ffffff" strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
            <span><span className="font-bold text-indigo-500">━</span> Качество модели</span>
            <span><span className="font-bold text-emerald-500">●</span> Текущий порог</span>
            <span><span className="font-bold text-slate-500">┄</span> Случайный отбор · {fmtPct(prevalence, 3)}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Чем ближе к правому верхнему углу, тем лучше: больше атак найдено без потери точности.</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Для этой модели PR-кривая отсутствует в сохранённом отчёте.</p>
      )}
    </Card>
  );
}

/** Убираем метрики, которые визуально сливаются и не помогают выбрать модель. */
export function IntrusionModelComparison({
  models, selectedName,
}: { models: BinaryModel[]; selectedName: string }) {
  const ranked = [...models].sort((a, b) => Number(a.is_baseline) - Number(b.is_baseline) || b.metrics.mcc - a.metrics.mcc);

  return (
    <Card>
      <SectionTitle>Сравнение моделей: качество обнаружения</SectionTitle>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        MCC учитывает как найденные, так и пропущенные атаки и ложные тревоги. PR-AUC оценивает точность поиска редких атак при разных порогах. Больше — лучше.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-b border-border/50 pb-2 text-[11px] font-semibold text-slate-500 sm:grid-cols-[minmax(170px,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <span className="col-span-2 sm:col-span-1">Модель</span>
        <span className="hidden sm:block">MCC</span>
        <span className="hidden sm:block">PR-AUC</span>
      </div>
      <div className="mt-2 space-y-2">
        {ranked.map((m) => {
          const active = m.name === selectedName;
          return (
            <div key={m.name} className={`grid gap-x-3 gap-y-3 rounded-xl border px-3 py-3 sm:grid-cols-[minmax(170px,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center ${active ? "border-indigo-500/40 bg-indigo-500/[0.055]" : "border-border/50"}`}>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <p className="break-words text-xs font-semibold leading-relaxed">{m.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{active ? "Выбранная модель" : m.is_baseline ? "Без обнаружения атак" : m.is_best ? "Лучшая по MCC" : ""}</p>
              </div>
              {([
                ["MCC", m.metrics.mcc, "bg-emerald-500"],
                ["PR-AUC", m.pr_auc, "bg-violet-500"],
              ] as [string, number, string][]).map(([label, value, color]) => (
                <div key={label} className="min-w-0">
                  <div className="mb-1.5 flex justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 sm:hidden">{label}</span>
                    <span className="font-mono font-semibold tabular-nums sm:ml-auto">{fmtNum(value, 4)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-500/10">
                    <div className={`h-full rounded-full ${color}`} style={{ width: barWidth(value) }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">MCC рассчитан при пороге, выбранном на validation; PR-AUC — по тестовой выборке независимо от порога. Baseline показан для ориентира.</p>
    </Card>
  );
}
