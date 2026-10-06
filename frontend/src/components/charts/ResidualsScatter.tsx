import { CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'
import type { SamplePrediction } from '../../types'

interface ResidualsScatterProps {
  data: SamplePrediction[]
  height?: number
}

export function ResidualsScatter({ data, height = 320 }: ResidualsScatterProps) {
  const t = useChartTheme()
  const points = data.map((d) => ({ y_pred: d.y_pred, residual: d.y_true - d.y_pred }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis dataKey="y_pred" type="number" name="Прогноз" tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <YAxis dataKey="residual" type="number" name="Остаток" tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
        <Tooltip {...tooltipStyle(t)} cursor={{ strokeDasharray: '3 3' }} />
        <ReferenceLine y={0} stroke={t.muted} strokeDasharray="4 4" />
        <Scatter data={points} dataKey="residual" fill={t.danger} fillOpacity={0.7} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}