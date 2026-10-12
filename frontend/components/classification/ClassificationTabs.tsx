"use client";
import { useEffect, useState } from "react";
import { Sprout, ShieldCheck, HeartPulse, CreditCard, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

import IrisPage from "@/app/iris/page";
import BreastCancerFPPage from "@/app/breast-cancer-fp/page";
import BreastCancerFNPage from "@/app/breast-cancer-fn/page";
import CreditFraudPage from "@/app/credit-fraud/page";
import DigitsPage from "@/app/digits/page";

const TABS = [
  { id: "iris",   label: "Iris",                          sub: "Многоклассовая классификация",   icon: Sprout },
  { id: "bc-fp",  label: "Breast Cancer · Скрининг",      sub: "Дорогие ложноположительные",     icon: ShieldCheck },
  { id: "bc-fn",  label: "Breast Cancer · Второе мнение", sub: "Критичны ложноотрицательные",    icon: HeartPulse },
  { id: "fraud",  label: "Credit Fraud",                  sub: "Экстремальный дисбаланс",        icon: CreditCard },
  { id: "digits", label: "Digits Imbalanced",             sub: "Редкий класс, macro vs weighted", icon: Hash },
] as const;

type TabId = typeof TABS[number]["id"];

export function ClassificationTabs() {
  const [active, setActive] = useState<TabId>("iris");

  // Синхронизация с URL: ?tab=iris|bc-fp|bc-fn|fraud|digits
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("tab") as TabId | null;
    const allowed: TabId[] = ["iris", "bc-fp", "bc-fn", "fraud", "digits"];
    if (p && allowed.includes(p)) setActive(p);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Классификация</h1>
        <p className="text-slate-500 mt-2">
          Пять задач из{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-500/10">
            artifacts/classification/
          </code>
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
        {active === "iris"   && <IrisPage />}
        {active === "bc-fp"  && <BreastCancerFPPage />}
        {active === "bc-fn"  && <BreastCancerFNPage />}
        {active === "fraud"  && <CreditFraudPage />}
        {active === "digits" && <DigitsPage />}
      </div>
    </div>
  );
}