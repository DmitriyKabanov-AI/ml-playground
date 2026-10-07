"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { pct } from "@/lib/utils";

export function PerClassTable({ perClass, rareClass }: { perClass: Record<string, any>; rareClass?: string }) {
  if (!perClass || !Object.keys(perClass).length) return null;
  const rows = Object.entries(perClass);
  return (
    <Card>
      <CardTitle>Per-class метрики</CardTitle>
      <div className="mt-3 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="text-left py-2 pr-3">Класс</th>
              <th className="text-right pr-3">Precision</th>
              <th className="text-right pr-3">Recall</th>
              <th className="text-right pr-3">F1</th>
              <th className="text-right">Support</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([cls, m]: any) => {
              const rare = rareClass && cls === rareClass;
              return (
                <tr key={cls} className="border-t border-border">
                  <td className={`py-2 pr-3 font-medium ${rare ? "text-rose-500" : ""}`}>
                    {cls}{rare ? " ⚠" : ""}
                  </td>
                  <td className="text-right pr-3">{pct(m.precision)}</td>
                  <td className={`text-right pr-3 ${rare ? "text-rose-500 font-semibold" : ""}`}>{pct(m.recall)}</td>
                  <td className="text-right pr-3">{pct(m.f1)}</td>
                  <td className="text-right text-slate-500">{m.support}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
