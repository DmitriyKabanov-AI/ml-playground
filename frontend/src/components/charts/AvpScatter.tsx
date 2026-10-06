import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'
import type { SamplePrediction } from '../../types'

interface AvpScatterProps {
  data: SamplePrediction[]
  height?: number
}

export function AvpScatter({ data, height = 320 }: AvpScatterProps) {
  const t = useChartTheme()
  const all = data.flatMap((d) => [d.y_true, d.y_pred])
  const min = Math.min(...all)
  const max = Math.max(...all)
  const diag = [
    { y_true: min, y_pred: min },
    { y_true: max, y_pred: max },
  ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis
          dataKey="y_true"
          type="number"
          name="Факт"
          domain={[min, max]}
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.grid }}
          tickLine={false}
        />
        <YAxis
          dataKey="y_pred"
          type="number"
          name="Прогноз"
          domain={[min, max]}
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.grid }}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle(t)} cursor={{ strokeDasharray: '3 3' }} />
        <Line data={diag} dataKey="y_pred" stroke={t.muted} strokeDasharray="4 4" dot={false} isAnimationActive={false} legendType="none" />
        <Scatter data={data} dataKey="y_pred" fill={t.accent} fillOpacity={0.7} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}