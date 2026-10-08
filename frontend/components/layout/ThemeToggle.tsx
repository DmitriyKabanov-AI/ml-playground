"use client";
import { Moon, Sun } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return (
    <button
      onClick={toggleTheme}
      // FIX: убрал нерабочий shadow-glow/30
      className="h-10 w-10 rounded-xl glass flex items-center justify-center transition-shadow hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}