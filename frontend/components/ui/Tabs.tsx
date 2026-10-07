"use client";
import { cn } from "@/lib/utils";

export function Tabs({ tabs, value, onValueChange }: { tabs: { id: string; label: string }[]; value: string; onValueChange: (id: string) => void }) {
  return (
    <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-500/10">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onValueChange(t.id)}
          className={cn("px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
            value === t.id ? "bg-surface shadow-sm text-primary-500" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
