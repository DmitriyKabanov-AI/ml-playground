"use client";
import { useEffect, useState } from "react";
import { Sprout, Plane, CarFront, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

import IrisPage from "@/app/iris/page";
import { LargeDatasetPage } from "@/components/classification/LargeDatasetPage";

const TABS = [
  { id: "iris", label: "Iris", sub: "Базовая многоклассовая задача", icon: Sprout },
  { id: "flight-delay", label: "Flight Delay Risk", sub: "Задержка рейса ≥ 15 минут", icon: Plane },
  { id: "taxi-payment", label: "NYC Taxi · Payment Type", sub: "Реальные поездки · дисбаланс классов", icon: CarFront },
  { id: "cover-type", label: "Forest Cover Type", sub: "7 классов лесного покрова", icon: Trees },
] as const;

type TabId = typeof TABS[number]["id"];
const ALLOWED_TABS: TabId[] = ["iris", "flight-delay", "taxi-payment", "cover-type"];

export function ClassificationTabs() {
  const [active, setActive] = useState<TabId>("iris");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("tab") as TabId | null;
    if (requested && ALLOWED_TABS.includes(requested)) setActive(requested);
  }, []);

  const selectTab = (id: TabId) => {
    setActive(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Классификация</h1>
        <p className="text-slate-500 mt-2">
          Четыре задачи: Iris и три новых набора реальных данных. Spark-отчёты читаются из{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-500/10">artifacts/classification/</code>.
        </p>
      </div>

      <section
        aria-label="Раздел классификации"
        className="flex flex-wrap gap-2 w-fit max-w-full p-1.5 rounded-2xl border border-border bg-slate-500/5"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border min-w-[205px] text-left transition-all",
                isActive
                  ? "border-primary-500/30 bg-gradient-to-br from-primary-500/15 to-violet-500/10 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
                  : "border-transparent hover:bg-slate-500/5"
              )}
            >
              <Icon size={17} className={cn("shrink-0", isActive ? "text-primary-500" : "text-slate-500")} />
              <span className="flex flex-col min-w-0">
                <span className={cn("text-[11px] font-semibold truncate leading-tight", isActive ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                  {tab.label}
                </span>
                <span className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{tab.sub}</span>
              </span>
            </button>
          );
        })}
      </section>

      <div>
        {active === "iris" && <IrisPage />}
        {active === "flight-delay" && <LargeDatasetPage task="flight_delay" />}
        {active === "taxi-payment" && <LargeDatasetPage task="taxi_payment" />}
        {active === "cover-type" && <LargeDatasetPage task="cover_type" />}
      </div>
    </div>
  );
}
