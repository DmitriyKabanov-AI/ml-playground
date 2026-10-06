import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'

interface CvBarProps {
  values: number[]
  height?: number
}

export function CvBar({ values, height = 240 }: CvBarProps) {
  const t = useChartTheme()
  const data = values.map((value, i) => ({ name: `Fold ${i + 1}`, value }))
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <YAxis tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} domain={[0, 1]} />
        <Tooltip {...tooltipStyle(t)} formatter={(value) => [Number(value).toFixed(4), 'accuracy']} cursor={{ fill: t.grid }} />
        <ReferenceLine
          y={mean}
          stroke={t.warning}
          strokeDasharray="4 4"
          label={{ value: `среднее ${mean.toFixed(3)}`, fill: t.warning, fontSize: 11, position: 'insideTopRight' }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={t.accent} />
      </BarChart>
    </ResponsiveContainer>
  )
}