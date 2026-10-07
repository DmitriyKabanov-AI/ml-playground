import { cn } from "@/lib/utils";
type Tone = "default" | "success" | "danger" | "warning" | "info";
export function Badge({ children, tone = "default", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  const tones: Record<Tone, string> = {
    default: "bg-slate-500/10 text-slate-500",
    success: "bg-emerald-500/15 text-emerald-500",
    danger: "bg-rose-500/15 text-rose-500",
    warning: "bg-amber-500/15 text-amber-500",
    info: "bg-sky-500/15 text-sky-500",
  };
  return <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold inline-block", tones[tone], className)}>{children}</span>;
}
