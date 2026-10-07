import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

export function Button({ className, variant = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "primary" }) {
  const styles = {
    default: "bg-slate-500/10 hover:bg-slate-500/20",
    ghost: "hover:bg-slate-500/10",
    primary: "bg-primary-500 text-white hover:bg-primary-600",
  } as const;
  return <button className={cn("px-3.5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50", styles[variant], className)} {...props} />;
}
