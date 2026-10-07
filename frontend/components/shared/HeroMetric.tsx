"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function HeroMetric({ title, model, metricLabel, metricValue, tone = "info", extra }:{
  title: string; model: string; metricLabel: string; metricValue: string;
  tone?: "success" | "danger" | "warning" | "info"; extra?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl animate-float" />
        <p className="text-xs uppercase tracking-widest text-slate-500">{title}</p>
        <h1 className="text-2xl font-bold mt-1">{model}</h1>
        <div className="flex items-end gap-3 mt-4">
          <span className="text-4xl font-black bg-gradient-to-br from-primary-500 to-violet-500 bg-clip-text text-transparent">
            {metricValue}
          </span>
          <Badge tone={tone}>{metricLabel}</Badge>
        </div>
        {extra && <p className="text-xs text-slate-500 mt-3">{extra}</p>}
      </Card>
    </motion.div>
  );
}
