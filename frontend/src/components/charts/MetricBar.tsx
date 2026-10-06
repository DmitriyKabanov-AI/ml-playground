import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'

export interface MetricBarDatum {
  name: string
  value: number
}

interface MetricBarProps {
  data: MetricBarDatum[]
  direction?: 'up' | 'down'
  layout?: 'horizontal' | 'vertical'
  valueLabel?: string
  height?: number
}

export function MetricBar({ data, direction = 'up', layout = 'vertical', valueLabel = 'value', height = 280 }: MetricBarProps) {
  const t = useChartTheme()
  const values = data.map((d) => d.value)
  const bestValue = direction === 'up' ? Math.max(...values) : Math.min(...values)

  if (layout === 'horizontal') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
          <Tooltip {...tooltipStyle(t)} formatter={(value) => [Number(value).toFixed(4), valueLabel]} cursor={{ fill: t.grid }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.value === bestValue ? t.success : t.accent} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <YAxis tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <Tooltip {...tooltipStyle(t)} formatter={(value) => [Number(value).toFixed(4), valueLabel]} cursor={{ fill: t.grid }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.value === bestValue ? t.success : t.accent} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}