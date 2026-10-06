import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'
import type { ImportanceItem } from '../../types'

interface ImportanceBarProps {
  data: ImportanceItem[]
  height?: number
  limit?: number
}

export function ImportanceBar({ data, height, limit = 12 }: ImportanceBarProps) {
  const t = useChartTheme()
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, limit)
  const chartHeight = height ?? Math.max(220, sorted.length * 32)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 12, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <Tooltip {...tooltipStyle(t)} formatter={(value) => [Number(value).toFixed(4), 'importance']} cursor={{ fill: t.grid }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={t.accent} />
      </BarChart>
    </ResponsiveContainer>
  )
}