"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  Sprout,
  ShieldCheck,
  HeartPulse,
  CreditCard,
  Hash,
  Building2,
  Gem,
  ShoppingCart,
  CloudSun,
  Thermometer,
  MapPin,
  BarChart3,
  Layers3,
} from "lucide-react";

const CLASSIFICATION_TASKS = [
  { href: "/classification?tab=iris", title: "Iris", desc: "Многоклассовая классификация", icon: Sprout, accent: "from-emerald-500 to-teal-500" },
  { href: "/classification?tab=bc-fp", title: "Breast Cancer · Скрининг", desc: "Дорогие ложноположительные", icon: ShieldCheck, accent: "from-sky-500 to-indigo-500" },
  { href: "/classification?tab=bc-fn", title: "Breast Cancer · Второе мнение", desc: "Критичны ложноотрицательные", icon: HeartPulse, accent: "from-rose-500 to-pink-500" },
  { href: "/classification?tab=fraud", title: "Credit Fraud", desc: "Экстремальный дисбаланс", icon: CreditCard, accent: "from-amber-500 to-orange-500" },
  { href: "/classification?tab=digits", title: "Digits Imbalanced", desc: "Редкий класс, macro vs weighted", icon: Hash, accent: "from-violet-500 to-fuchsia-500" },
];

const REGRESSION_TASKS = [
  { href: "/regression?tab=property", title: "Недвижимость", desc: "Модель + калькулятор", icon: Building2, accent: "from-cyan-500 to-blue-500" },
  { href: "/regression?tab=diamonds", title: "Алмазы", desc: "Diamonds · цена и метрики", icon: Gem, accent: "from-fuchsia-500 to-pink-500" },
  { href: "/regression?tab=walmart", title: "Walmart Sales", desc: "Магазины + прогноз", icon: ShoppingCart, accent: "from-indigo-500 to-violet-500" },
];

const FORECASTING_TASKS = [
  { href: "/weather?page=overview", title: "Обзор",                 desc: "Сводка и KPI · ML Weather", icon: CloudSun,    accent: "from-sky-500 to-cyan-500" },
  { href: "/weather?page=stations", title: "Станции",               desc: "1–14 дней · бэктест",      icon: Thermometer, accent: "from-emerald-500 to-teal-500" },
  { href: "/weather?page=cities",   title: "Города и переменные",   desc: "5 параметров погоды",      icon: MapPin,      accent: "from-indigo-500 to-violet-500" },
  { href: "/weather?page=models",   title: "Модели и метрики",      desc: "Лидерборды",               icon: BarChart3,   accent: "from-amber-500 to-orange-500" },
  { href: "/weather?page=features", title: "Признаки и справочник", desc: "Features · метрики",       icon: Layers3,     accent: "from-fuchsia-500 to-pink-500" },
];

function TaskCard({ href, title, desc, icon: Icon, accent }: { href: string; title: string; desc: string; icon: any; accent: string }) {
  return (
    <Link href={href}>
      <Card className="h-full group cursor-pointer">
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <Icon className="text-white" size={20} />
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-slate-500 mt-1">{desc}</p>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black">ML Explorer</h1>
        <p className="text-slate-500 mt-2">
          Данные читаются напрямую из{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-500/10">public/artifacts/</code>{" "}
          (junction → ../artifacts)
        </p>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Классификация</h2>
          <p className="text-sm text-slate-500 mt-1">Пять задач бинарной и многоклассовой классификации</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CLASSIFICATION_TASKS.map((t) => (
            <TaskCard key={t.href} {...t} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Регрессия</h2>
          <p className="text-sm text-slate-500 mt-1">Регрессионные модели, калькуляторы и прогноз продаж</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REGRESSION_TASKS.map((t) => (
            <TaskCard key={t.href} {...t} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Forecasting</h2>
          <p className="text-sm text-slate-500 mt-1">Прогноз временных рядов · skill относительно baseline</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FORECASTING_TASKS.map((t) => (
            <TaskCard key={t.href} {...t} />
          ))}
        </div>
      </section>
    </div>
  );
}