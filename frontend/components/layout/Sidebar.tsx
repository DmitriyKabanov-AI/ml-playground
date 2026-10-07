"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flower2, Ribbon, Stethoscope, ShieldAlert, Grid3x3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASKS } from "@/lib/data/tasks";

const ICONS: Record<string, any> = {
  flower: Flower2, ribbon: Ribbon, stethoscope: Stethoscope, shield: ShieldAlert, grid: Grid3x3,
};

const NAV = [
  { href: "/", label: "Обзор", icon: Activity },
  ...TASKS.map((t) => ({ href: t.href, label: t.title, icon: ICONS[t.icon] })),
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-72 flex-col glass border-r border-border m-3 rounded-2xl">
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 shadow-glow" />
        <div>
          <p className="font-bold leading-tight">ML Explorer</p>
          <p className="text-xs text-slate-500">Real-artifacts edition</p>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active ? "bg-primary-500/15 text-primary-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
                       : "text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white")}>
              <Icon size={18} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-slate-500">v2.1 · real artifacts</div>
    </aside>
  );
}
