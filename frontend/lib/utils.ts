import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function pct(v: number | undefined, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}
export function num(v: number | undefined, digits = 3) {
  if (v == null || Number.isNaN(v)) return "—";
  return Number(v).toFixed(digits);
}
