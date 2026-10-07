"use client";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content sideOffset={6} className="rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow-lg z-50">
        {children}
        <TooltipPrimitive.Arrow className="fill-slate-900" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
