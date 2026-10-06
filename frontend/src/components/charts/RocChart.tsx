import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'
import type { RocCurve } from '../../types'

interface RocChartProps {
  curves: RocCurve[]
  height?: number
}

interface RocPoint {
  fpr: number
  [key: string]: number
}

function interpolate(curve: RocCurve, x: number): number {
  const { fpr, tpr } = curve
  if (fpr.length === 0) return 0
  if (x <= fpr[0]) return tpr[0]
  if (x >= fpr[fpr.length - 1]) return tpr[tpr.length - 1]
  for (let i = 1; i < fpr.length; i++) {
    if (x <= fpr[i]) {
      const x0 = fpr[i - 1]
      const x1 = fpr[i]
      const y0 = tpr[i - 1]
      const y1 = tpr[i]
      const ratio = x1 === x0 ? 0 : (x - x0) / (x1 - x0)
      return y0 + ratio * (y1 - y0)
    }
  }
  return tpr[tpr.length - 1]
}

export function RocChart({ curves, height = 320 }: RocChartProps) {
  const t = useChartTheme()

  const gridSet = new Set<number>([0, 1])
  curves.forEach((c) => c.fpr.forEach((v) => gridSet.add(Number(v.toFixed(3)))))
  const xs = Array.from(gridSet).sort((a, b) => a - b)

  const data: RocPoint[] = xs.map((x) => {
    const point: RocPoint = { fpr: x, random: Number(x.toFixed(4)) }
    curves.forEach((c) => {
      point[c.cls] = Number(interpolate(c, x).toFixed(4))
    })
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis
          dataKey="fpr"
          type="number"
          domain={[0, 1]}
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.grid }}
          tickLine={false}
          label={{ value: 'FPR', position: 'insideBottom', offset: -4, fill: t.muted, fontSize: 11 }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.grid }}
          tickLine={false}
          label={{ value: 'TPR', angle: -90, position: 'insideLeft', fill: t.muted, fontSize: 11 }}
        />
        <Tooltip {...tooltipStyle(t)} />
        <Legend wrapperStyle={{ fontSize: 11, color: t.muted }} />
        <Line type="linear" dataKey="random" name="Random" stroke={t.muted} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        {curves.map((c, idx) => (
          <Line
            key={c.cls}
            type="monotone"
            dataKey={c.cls}
            name={`${c.cls} (AUC ${c.auc.toFixed(3)})`}
            stroke={t.series[idx % t.series.length]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}