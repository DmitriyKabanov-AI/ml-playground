"use client";
import { Card } from "@/components/ui/Card";
import { pct, num } from "@/lib/utils";
import { motion } from "framer-motion";

const LABELS: Record<string, string> = {
  accuracy: "Accuracy",
  balancedAccuracy: "Balanced Acc.",
  precisionMacro: "Precision (macro)",
  recallMacro: "Recall (macro)",
  f1Macro: "F1 (macro)",
  f1Weighted: "F1 (weighted)",
  f05Macro: "F0.5 (macro)",
  f2Macro: "F2 (macro)",
  mcc: "MCC",
  kappa: "Cohen κ",
  rocAuc: "ROC AUC",
  prAuc: "PR AUC",
  top2Accuracy: "Top-2 Acc.",
  top3Accuracy: "Top-3 Acc.",
};

export function MetricsGrid({ metrics }: { metrics: Record<string, number | undefined> }) {
  const order = ["accuracy","balancedAccuracy","precisionMacro","recallMacro","f1Macro","f1Weighted","f05Macro","f2Macro","mcc","kappa","rocAuc","prAuc","top2Accuracy","top3Accuracy"];
  const entries = order
    .map((k) => [k, metrics[k]] as [string, number | undefined])
    .filter(([, v]) => v != null);
  if (!entries.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {entries.map(([k, v], i) => (
        <motion.div key={k} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
          <Card className="p-3.5">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">{LABELS[k] ?? k}</p>
            <p className="text-xl font-bold mt-1">
              {k === "mcc" || k === "kappa" ? num(v as number) : pct(v as number)}
            </p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
