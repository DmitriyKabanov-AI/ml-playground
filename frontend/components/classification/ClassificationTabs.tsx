"use client";
import { useState } from "react";
import {
  Flower2,
  Ribbon,
  Stethoscope,
  ShieldAlert,
  Grid3x3,
} from "lucide-react";
import { cn } from "@/lib/utils";

import IrisPage from "@/app/iris/page";
import BreastCancerFPPage from "@/app/breast-cancer-fp/page";
import BreastCancerFNPage from "@/app/breast-cancer-fn/page";
import CreditFraudPage from "@/app/credit-fraud/page";
import DigitsPage from "@/app/digits/page";

const TABS = [
  { id: "iris",   label: "Iris",                          sub: "Многоклассовая классификация",   icon: Flower2,     accent: "from-emerald-500 to-teal-500" },
  { id: "bc-fp",  label: "Breast Cancer · Скрининг",      sub: "Дорогие ложноположительные",     icon: Ribbon,      accent: "from-sky-500 to-indigo-500" },
  { id: "bc-fn",  label: "Breast Cancer · Второе мнение", sub: "Критичны ложноотрицательные",    icon: Stethoscope, accent: "from-rose-500 to-pink-500" },
  { id: "fraud",  label: "Credit Fraud",                  sub: "Экстремальный дисбаланс",        icon: ShieldAlert, accent: "from-amber-500 to-orange-500" },
  { id: "digits", label: "Digits Imbalanced",             sub: "Редкий класс, macro vs weighted", icon: Grid3x3,     accent: "from-violet-500 to-fuchsia-500" },
] as const;

type TabId = typeof TABS[number]["id"];

export function ClassificationTabs() {
  const [active, setActive] = useState<TabId>("iris");

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                isActive
                  ? "border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]"
                  : "border-border hover:border-indigo-500/40"
              )}
            >
              <span
                className={cn(
                  "h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br flex items-center justify-center",
                  t.accent
                )}
              >
                <Icon className="text-white" size={18} />
              </span>
              <span className="flex flex-col min-w-0">
                <span
                  className={cn(
                    "text-sm font-bold truncate",
                    isActive ? "text-indigo-500" : "text-slate-900 dark:text-slate-100"
                  )}
                >
                  {t.label}
                </span>
                <span className="text-[11px] text-slate-500 truncate">{t.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

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