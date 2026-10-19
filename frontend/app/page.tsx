"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  Plane,
  CarFront,
  Trees,
  Sprout,
  Building2,
  Gem,
  ShoppingCart,
  CloudSun,
  Thermometer,
  MapPin,
  BarChart3,
  Layers3,
  type LucideIcon,
} from "lucide-react";

const CLASSIFICATION_TASKS = [
  { href: "/classification?tab=iris", title: "Iris", desc: "Базовая многоклассовая классификация", icon: Sprout, accent: "from-emerald-500 to-teal-500" },
  { href: "/classification?tab=flight-delay", title: "Flight Delay Risk", desc: "Миллионы реальных рейсов · задержка ≥ 15 минут", icon: Plane, accent: "from-sky-500 to-indigo-500" },
  { href: "/classification?tab=taxi-payment", title: "NYC Taxi · Payment Type", desc: "Миллионы поездок · сильный дисбаланс классов", icon: CarFront, accent: "from-amber-500 to-orange-500" },
  { href: "/classification?tab=cover-type", title: "Forest Cover Type", desc: "581 тыс. измерений · 7 типов лесного покрова", icon: Trees, accent: "from-emerald-500 to-green-600" },
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

type TaskCardProps = {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
};

function TaskCard({ href, title, desc, icon: Icon, accent }: TaskCardProps) {
  return (
    <Link href={href} className="block h-full">
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
          Метрики моделей и датасеты из{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-500/10">artifacts/</code>
          . Крупные задачи классификации обучаются на Spark MLlib.
        </p>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Классификация</h2>
          <p className="text-sm text-slate-500 mt-1">Четыре самостоятельные задачи на реальных данных</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CLASSIFICATION_TASKS.map((task) => <TaskCard key={task.href} {...task} />)}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Регрессия</h2>
          <p className="text-sm text-slate-500 mt-1">Регрессионные модели, калькуляторы и прогноз продаж</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REGRESSION_TASKS.map((task) => <TaskCard key={task.href} {...task} />)}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Forecasting</h2>
          <p className="text-sm text-slate-500 mt-1">Прогноз временных рядов · skill относительно baseline</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FORECASTING_TASKS.map((task) => <TaskCard key={task.href} {...task} />)}
        </div>
      </section>
    </div>
  );
}
