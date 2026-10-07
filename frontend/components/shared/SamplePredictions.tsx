"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function SamplePredictions({ samples }: { samples: any[] }) {
  if (!Array.isArray(samples) || !samples.length) return null;
  return (
    <Card>
      <CardTitle>Примеры предсказаний (test)</CardTitle>
      <div className="mt-3 max-h-96 overflow-y-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 sticky top-0 bg-surface/90 backdrop-blur">
            <tr>
              <th className="text-left py-2 pr-3">#</th>
              <th className="text-left pr-3">True</th>
              <th className="text-left pr-3">Predicted</th>
              <th className="text-right pr-3">Confidence</th>
              <th className="text-right">Top-2</th>
            </tr>
          </thead>
          <tbody>
            {samples.slice(0, 60).map((s, i) => {
              const top2 = s.top3?.[1] ?? s.top3?.[0];
              return (
                <tr key={i} className="border-t border-border">
                  <td className="py-2 pr-3 text-slate-500">
                    {s.index != null ? s.index : i}
                  </td>
                  <td className="pr-3 font-medium">{s.true ?? s.actual}</td>
                  <td className="pr-3">
                    <span className={s.correct ? "text-emerald-500" : "text-rose-500"}>
                      {s.predicted}
                    </span>
                  </td>
                  <td className="text-right pr-3">{s.confidence != null ? Number(s.confidence).toFixed(3) : "—"}</td>
                  <td className="text-right text-xs text-slate-500">
                    {top2 ? `${top2.class}: ${Number(top2.proba).toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500 mt-2">
        Показано {Math.min(60, samples.length)} из {samples.length}
      </p>
    </Card>
  );
}
