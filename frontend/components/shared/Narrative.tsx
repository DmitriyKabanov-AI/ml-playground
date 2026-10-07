"use client";
import { Card, CardTitle } from "@/components/ui/Card";

export function Narrative({ meta, headline }: { meta: any; headline: any }) {
  if (!meta && !headline) return null;
  const n = meta?.narrative ?? {};
  return (
    <Card>
      <CardTitle>Контекст задачи</CardTitle>
      {n.context && <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{n.context}</p>}
      {n.main_conclusion && (
        <p className="text-sm mt-3 leading-relaxed">
          <span className="text-xs uppercase tracking-wide text-primary-500 font-semibold">Вывод: </span>
          {n.main_conclusion}
        </p>
      )}
      {n.why_not_weighted && (
        <p className="text-sm mt-2 leading-relaxed text-slate-500">{n.why_not_weighted}</p>
      )}
      {headline?.verdict && !n.main_conclusion && (
        <p className="text-sm mt-3">{headline.verdict}</p>
      )}
    </Card>
  );
}
