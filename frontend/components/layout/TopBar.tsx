"use client";
import { ThemeToggle } from "./ThemeToggle";
import { Download, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-6 lg:px-10 py-4">
      <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-3 py-2 w-80">
        <Search size={16} className="text-slate-400" />
        <input
          placeholder="Поиск по моделям, метрикам..."
          className="bg-transparent outline-none text-sm w-full placeholder:text-slate-500"
        />
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <a
          href="/artifacts/index.json"
          download
          // FIX: убрал нерабочий shadow-glow/30
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl glass transition-shadow hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]"
        >
          <Download size={16} /> index.json
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}