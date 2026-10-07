"use client";
import { cn } from "@/lib/utils";

export function ModelSelector({ models, selected, onSelect }: {
  models: { id: string; name: string }[]; selected: string; onSelect: (id: string) => void;
}) {
  if (!models.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {models.map((m) => (
        <button key={m.id} onClick={() => onSelect(m.id)}
          className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all",
            selected === m.id ? "bg-primary-500 text-white border-primary-500 shadow-glow"
                              : "border-border text-slate-500 hover:border-primary-500/50")}>
          {m.name}
        </button>
      ))}
    </div>
  );
}
