import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'

interface HistogramProps {
  values: number[]
  bins?: number
  height?: number
  color?: string
}

export function Histogram({ values, bins = 12, height = 240, color }: HistogramProps) {
  const t = useChartTheme()
  if (values.length === 0) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = (max - min) / bins || 1
  const counts = new Array(bins).fill(0) as number[]
  values.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width))
    counts[idx] += 1
  })
  const data = counts.map((count, i) => ({
    name: (min + i * width).toFixed(2),
    count,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 10 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <YAxis tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <Tooltip {...tooltipStyle(t)} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={color ?? t.accent} />
      </BarChart>
    </ResponsiveContainer>
  )
}