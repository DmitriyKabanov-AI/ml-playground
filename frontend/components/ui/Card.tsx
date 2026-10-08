import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // FIX: shadow-glow — это box-shadow, а не цвет, /40 не сработает.
      // Используем готовую тень либо произвольное значение.
      className={cn(
        "glass rounded-2xl p-5 transition-shadow hover:shadow-[0_0_24px_rgba(99,102,241,0.4)]",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xs font-medium text-slate-500 dark:text-slate-400 tracking-widest uppercase",
        className
      )}
      {...props}
    />
  );
}