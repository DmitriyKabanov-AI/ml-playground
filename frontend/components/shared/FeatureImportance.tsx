"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function FeatureImportance({ data }: { data: { feature: string; importance: number }[] }) {
  if (!data?.length) return null;
  const chartData = [...data].sort((a, b) => b.importance - a.importance);
  const colors = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#a855f7", "#14b8a6"];

  return (
    <Card>
      <CardTitle>Feature Importance</CardTitle>
      <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 44)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="feature" type="category" width={140} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => Number(v).toFixed(4)} />
          <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
