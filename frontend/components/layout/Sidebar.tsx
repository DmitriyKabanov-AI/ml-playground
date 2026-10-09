"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, TrendingUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: any };
type NavGroup = { label: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/", label: "Обзор", icon: Activity }],
  },
  {
    label: "Классификация",
    items: [{ href: "/classification", label: "ML Classification", icon: Layers }],
  },
  {
    label: "Регрессия",
    items: [{ href: "/regression", label: "ML Regression", icon: TrendingUp }],
  },
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
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-4" : ""}>
            {group.label && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      active
                        ? "bg-primary-500/15 text-primary-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
                        : "text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Icon size={18} />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 text-xs text-slate-500">v2.1 · real artifacts</div>
    </aside>
  );
}