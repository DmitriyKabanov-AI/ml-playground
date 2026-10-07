"use client";
import { Card } from "@/components/ui/Card";

export function MetaStats({ meta }: { meta: any }) {
  if (!meta) return null;
  const items: [string, any][] = [
    ["n_samples", meta.n_samples],
    ["n_train", meta.n_train],
    ["n_test", meta.n_test],
    ["n_features", meta.n_features],
    ["n_classes", meta.n_classes],
    ["seed", meta.seed],
  ].filter(([, v]) => v != null);
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {items.map(([k, v]) => (
        <Card key={k} className="p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k}</p>
          <p className="text-lg font-bold mt-0.5">{String(v)}</p>
        </Card>
      ))}
    </div>
  );
}
