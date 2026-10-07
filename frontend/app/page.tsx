"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Flower2, Ribbon, Stethoscope, ShieldAlert, Grid3x3 } from "lucide-react";
import { useJson } from "@/lib/data/loader";

const TASKS_UI = [
  { href: "/iris", title: "Iris", desc: "Многоклассовая классификация", icon: Flower2, accent: "from-emerald-500 to-teal-500" },
  { href: "/breast-cancer-fp", title: "Breast Cancer · Скрининг", desc: "Дорогие ложноположительные", icon: Ribbon, accent: "from-sky-500 to-indigo-500" },
  { href: "/breast-cancer-fn", title: "Breast Cancer · Второе мнение", desc: "Критичны ложноотрицательные", icon: Stethoscope, accent: "from-rose-500 to-pink-500" },
  { href: "/credit-fraud", title: "Credit Fraud", desc: "Экстремальный дисбаланс", icon: ShieldAlert, accent: "from-amber-500 to-orange-500" },
  { href: "/digits", title: "Digits Imbalanced", desc: "Редкий класс, macro vs weighted", icon: Grid3x3, accent: "from-violet-500 to-fuchsia-500" },
];

export default function HomePage() {
  const { data: index, loading } = useJson<any>("index.json");
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black">ML Explorer</h1>
        <p className="text-slate-500 mt-2">
          Данные читаются напрямую из <code className="px-1.5 py-0.5 rounded bg-slate-500/10">public/artifacts/</code> (junction → ../artifacts)
        </p>
        {index && (
          <p className="text-xs text-slate-500 mt-2">
            <b>index.json</b>: {Array.isArray(index) ? `${index.length} записей` : `${Object.keys(index).length} ключей`}
          </p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TASKS_UI.map(({ href, title, desc, icon: Icon, accent }) => (
          <Link key={href} href={href}>
            <Card className="h-full group cursor-pointer">
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="text-white" size={20} />
              </div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-sm text-slate-500 mt-1">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-8 glass rounded-2xl p-5">
        <h3 className="font-semibold mb-2">index.json (raw)</h3>
        <pre className="text-xs overflow-auto scrollbar-thin max-h-60 bg-slate-500/5 p-3 rounded-lg">
          {loading ? "Загрузка..." : JSON.stringify(index, null, 2)}
        </pre>
      </div>
    </div>
  );
}
