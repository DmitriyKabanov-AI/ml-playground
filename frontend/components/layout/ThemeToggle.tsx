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
    <button onClick={toggleTheme} className="h-10 w-10 rounded-xl glass flex items-center justify-center hover:shadow-glow/30 transition-all">
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
