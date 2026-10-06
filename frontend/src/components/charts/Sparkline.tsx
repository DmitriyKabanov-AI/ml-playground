import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useChartTheme } from './theme'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

export function Sparkline({ data, color, height = 36 }: SparklineProps) {
  const t = useChartTheme()
  const chartData = data.map((value, i) => ({ i, value }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="value" stroke={color ?? t.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}