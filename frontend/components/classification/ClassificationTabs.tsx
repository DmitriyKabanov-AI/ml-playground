"use client";
import { useEffect, useState } from "react";
import { Sprout, PlaneTakeoff, ShieldAlert, TrafficCone } from "lucide-react";
import { cn } from "@/lib/utils";

import IrisPage from "@/app/iris/page";
import FlightDelaysPage from "@/app/flight-delays/page";
import NetworkIntrusionPage from "@/app/network-intrusion/page";
import AccidentSeverityPage from "@/app/accident-severity/page";

const TABS = [
  { id: "flights",   label: "Flight Delays · 5.8 млн",    sub: "Бинарная классификация",            icon: PlaneTakeoff },
  { id: "iris",      label: "Iris · 150 шт",                 sub: "Многоклассовая классификация",           icon: Sprout },
  { id: "intrusion", label: "Network Intrusion · 2.8 млн", sub: "Редкие атаки, экстремальный дисбаланс", icon: ShieldAlert },
  { id: "accidents", label: "US Accidents · 7.7 млн",     sub: "Многоклассовый дисбаланс, macro vs weighted", icon: TrafficCone },
] as const;

type TabId = typeof TABS[number]["id"];
const ALLOWED: TabId[] = TABS.map((t) => t.id);

// Старые закладки (?tab=bc-fp и т.п.) ведут на ближайшую по смыслу новую вкладку.
const LEGACY: Record<string, TabId> = {
  "bc-fp": "flights",
  "bc-fn": "flights",
  fraud: "intrusion",
  digits: "accidents",
};

export function ClassificationTabs() {
  const [active, setActive] = useState<TabId>("flights");

  // Синхронизация с URL: ?tab=iris|flights|intrusion|accidents
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("tab");
    if (!raw) return;
    const p = (ALLOWED as string[]).includes(raw) ? (raw as TabId) : LEGACY[raw];
    if (p) setActive(p);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Классификация</h1>
        <p className="text-slate-500 mt-2">
          Четыре задачи из{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-500/10">
            artifacts/classification/
          </code>
          {" "}· три из них посчитаны на Spark на реальных датасетах в миллионы строк
        </p>
      </div>

      <section
        aria-label="Раздел классификации"
        className="flex flex-wrap gap-2 w-fit max-w-full p-1.5 rounded-2xl border border-border bg-slate-500/5"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                setActive(t.id);
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", t.id);
                  window.history.replaceState(null, "", url.toString());
                }
              }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border min-w-[205px] text-left transition-all",
                isActive
                  ? "border-primary-500/30 bg-gradient-to-br from-primary-500/15 to-violet-500/10 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
                  : "border-transparent hover:bg-slate-500/5"
              )}
            >
              <Icon
                size={17}
                className={cn(
                  "shrink-0",
                  isActive ? "text-primary-500" : "text-slate-500"
                )}
              />
              <span className="flex flex-col min-w-0">
                <span
                  className={cn(
                    "text-[11px] font-semibold truncate leading-tight",
                    isActive ? "text-slate-900 dark:text-white" : "text-slate-500"
                  )}
                >
                  {t.label}
                </span>
                <span className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                  {t.sub}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <div>
        {active === "iris"      && <IrisPage />}
        {active === "flights"   && <FlightDelaysPage />}
        {active === "intrusion" && <NetworkIntrusionPage />}
        {active === "accidents" && <AccidentSeverityPage />}
      </div>
    </div>
  );
}
