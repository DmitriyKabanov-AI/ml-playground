"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  Flower2,
  Ribbon,
  Stethoscope,
  ShieldAlert,
  Grid3x3,
} from "lucide-react";
import { TASKS } from "@/lib/data/tasks";

const ICONS: Record<string, any> = {
  flower: Flower2,
  ribbon: Ribbon,
  stethoscope: Stethoscope,
  shield: ShieldAlert,
  grid: Grid3x3,
};

export default function ClassificationPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black">Классификация</h1>
        <p className="text-slate-500 mt-2">
          Задачи бинарной и многоклассовой классификации из{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-500/10">
            artifacts/classification/
          </code>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TASKS.map((t) => {
          const Icon = ICONS[t.icon];
          return (
            <Link key={t.href} href={t.href}>
              <Card className="h-full group cursor-pointer">
                <div
                  className={`h-11 w-11 rounded-xl bg-gradient-to-br ${t.accent} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  {Icon && <Icon className="text-white" size={20} />}
                </div>
                <h3 className="font-bold text-lg">{t.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}