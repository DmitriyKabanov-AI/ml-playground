"use client";
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ReferenceLine, ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionTitle } from "@/components/shared/reportUi";
import { BinaryModel, fmtNum, fmtPct } from "@/lib/data/reports";
import {
  Cnt, FKey, SweepRow, bestIdx, finite, fullMetrics, getValBest, sweepRows,
} from "@/lib/data/binaryMetrics";

const C05 = "#0ea5e9";
const C2 = "#f59e0b";

type Scenario = {
  id: "pos" | "neg";
  title: string;
  caption: string;
  k05: FKey;
  k2: FKey;
  valKey05: "f05_pos" | "f05_neg";
  valKey2: "f2_pos" | "f2_neg";
};

function Panel({
  sc, rows, shown, onPick, current05, current2, val,
}: {
  sc: Scenario;
  rows: SweepRow[];
  shown: number;
  onPick: (t: number) => void;
  current05: number;
  current2: number;
  val: { f05?: number | null; f2?: number | null };
}) {
  const i05 = useMemo(() => bestIdx(rows, sc.k05), [rows, sc.k05]);
  const i2 = useMemo(() => bestIdx(rows, sc.k2), [rows, sc.k2]);
  const best = [
    { beta: "F0.5", color: C05, idx: i05, key: sc.k05, hint: "упор на precision", cur: current05, val: val.f05 },
    { beta: "F2", color: C2, idx: i2, key: sc.k2, hint: "упор на recall", cur: current2, val: val.f2 },
  ];

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{sc.title}</p>
      <p className="text-[11px] text-slate-500/80 mb-2">{sc.caption}</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="t" type="number" domain={[0, 1]} tick={{ fontSize: 11 }}
                 label={{ value: "порог", position: "insideBottomRight", fontSize: 10, offset: -2 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
            formatter={(v: number) => (finite(v) ? v.toFixed(3) : "—")}
            labelFormatter={(l) => `порог ${Number(l).toFixed(2)}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey={sc.k05} name="F0.5" stroke={C05} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey={sc.k2} name="F2" stroke={C2} strokeWidth={2} dot={false} isAnimationActive={false} />
          <ReferenceLine x={shown} stroke="#6366f1" strokeDasharray="4 4" />
          {best.map((b) => (
            <ReferenceDot
              key={b.beta}
              x={rows[b.idx].t}
              y={rows[b.idx][b.key]}
              r={5}
              fill={b.color}
              stroke="#fff"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 space-y-2">
        {best.map((b) => {
          const row = rows[b.idx];
          const active = Math.abs(shown - row.t) < 0.005;
          return (
            <div
              key={b.beta}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border transition-colors ${
                active ? "border-indigo-500/50 bg-indigo-500/10" : "border-transparent bg-slate-500/5"
              }`}
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Лучший по {b.beta} · {b.hint}
                </p>
                <p className="text-sm font-bold font-mono">
                  <span style={{ color: b.color }}>{b.beta} {row[b.key].toFixed(3)}</span>
                  <span className="text-slate-500 font-normal"> · порог {row.t.toFixed(2)}</span>
                </p>
                {finite(b.val) && (
                  <p className="text-[10px] text-slate-500">на валидации (ноутбук): порог {b.val.toFixed(3)}</p>
                )}
              </div>
              <button
                onClick={() => onPick(row.t)}
                disabled={active}
                className="shrink-0 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-500 hover:bg-indigo-500/20 transition-colors disabled:opacity-60 disabled:cursor-default"
              >
                {active ? "выбран" : `выбрать лучший по ${b.beta}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 text-center">
        <div className="rounded-lg bg-slate-500/5 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">F0.5 сейчас</p>
          <p className="text-sm font-bold font-mono" style={{ color: C05 }}>{fmtNum(current05)}</p>
        </div>
        <div className="rounded-lg bg-slate-500/5 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">F2 сейчас</p>
          <p className="text-sm font-bold font-mono" style={{ color: C2 }}>{fmtNum(current2)}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Порог решения: F0.5 и F2 как для положительного («задержка»),
 * так и для отрицательного («вовремя») сценария. Для каждого — кнопки «выбрать лучший».
 * thr === null → порог, подобранный ноутбуком на валидации (точные счётчики).
 */
export function FBetaThresholdCard({
  model, thr, onThr, counts, posLabel, negLabel, tunedLabel,
}: {
  model: BinaryModel;
  thr: number | null;
  onThr: (t: number | null) => void;
  counts: Cnt;
  posLabel: string;
  negLabel: string;
  tunedLabel: string;
}) {
  const rows = useMemo(() => sweepRows(model), [model]);
  const sw = model.sweep;
  const step = sw.thresholds.length > 1 ? sw.thresholds[1] - sw.thresholds[0] : 0.01;
  const shown = thr ?? model.threshold;
  const m = fullMetrics(counts);
  const vb = getValBest(model);

  const scenarios: Scenario[] = [
    {
      id: "pos",
      title: `Положительный сценарий: «${posLabel}» — целевой класс`,
      caption: "Precision и Recall считаются для задержек: рейс помечается, если score ≥ порога.",
      k05: "f05", k2: "f2", valKey05: "f05_pos", valKey2: "f2_pos",
    },
    {
      id: "neg",
      title: `Отрицательный сценарий: «${negLabel}» — целевой класс`,
      caption: "Precision = NPV, Recall = Specificity: рейс считается «вовремя», если score < порога.",
      k05: "f05Neg", k2: "f2Neg", valKey05: "f05_neg", valKey2: "f2_neg",
    },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionTitle>Порог решения — лучший по F0.5 и F2, оба сценария</SectionTitle>
        <div className="flex items-center gap-2">
          <Badge tone={thr === null ? "success" : "info"}>
            {thr === null ? `${tunedLabel}: ${shown.toFixed(3)}` : `ручной: ${shown.toFixed(2)}`}
          </Badge>
          {thr !== null && (
            <button
              onClick={() => onThr(null)}
              className="text-xs px-3 py-1 rounded-lg border border-border text-slate-500 hover:border-indigo-500/50"
            >
              вернуть {model.threshold.toFixed(3)}
            </button>
          )}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={step}
        value={shown}
        onChange={(e) => onThr(parseFloat(e.target.value))}
        className="w-full mt-4 accent-indigo-500"
        aria-label="Порог"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
        {[
          ["Sensitivity", fmtPct(m.sensitivity)],
          ["Specificity", fmtPct(m.specificity)],
          ["Precision", fmtPct(m.precision)],
          ["NPV", fmtPct(m.npv)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-500/5 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{k}</p>
            <p className="text-sm font-bold font-mono mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-5">
        {scenarios.map((sc) => (
          <Panel
            key={sc.id}
            sc={sc}
            rows={rows}
            shown={shown}
            onPick={onThr}
            current05={sc.id === "pos" ? m.f05 : m.f05Neg}
            current2={sc.id === "pos" ? m.f2 : m.f2Neg}
            val={{ f05: vb?.[sc.valKey05]?.threshold, f2: vb?.[sc.valKey2]?.threshold }}
          />
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-3">
        Оптимум ищется по тестовой сетке (шаг {step.toFixed(2)}), поэтому слегка оптимистичен: в ноутбуке пороги по F0.5/F2
        подбираются на отдельной валидации. Точки на графиках — максимумы, синяя вертикаль — текущий порог.
      </p>
    </Card>
  );
}
