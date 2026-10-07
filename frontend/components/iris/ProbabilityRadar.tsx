"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

export function ProbabilityRadar({ probs }: { probs: Record<string, number> }) {
  const data = Object.entries(probs).map(([cls, p]) => ({ cls, probability: +(p * 100).toFixed(1) }));
  return (
    <Card>
      <CardTitle>Вероятности классов</CardTitle>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data}>
          <PolarGrid strokeOpacity={0.15} />
          <PolarAngleAxis dataKey="cls" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar dataKey="probability" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
