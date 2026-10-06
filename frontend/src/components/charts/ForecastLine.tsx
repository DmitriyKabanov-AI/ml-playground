import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme, tooltipStyle } from './theme'

export interface ForecastDatum {
  horizon: number
  [key: string]: number
}

interface CiConfig {
  lowerKey: string
  upperKey: string
  label?: string
}

interface ForecastLineProps {
  data: ForecastDatum[]
  lines: Array<{ key: string; label?: string }>
  ci?: CiConfig
  height?: number
  yLabel?: string
}

export function ForecastLine({ data, lines, ci, height = 320, yLabel }: ForecastLineProps) {
  const t = useChartTheme()

  const chartData = data.map((d) => {
    if (!ci) return d
    return { ...d, __ciBand: d[ci.upperKey] - d[ci.lowerKey] }
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
        <XAxis
          dataKey="horizon"
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.grid }}
          tickLine={false}
          label={{ value: 'Горизонт (дни)', position: 'insideBottom', offset: -4, fill: t.muted, fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.grid }}
          tickLine={false}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: t.muted, fontSize: 11 } : undefined}
        />
        <Tooltip {...tooltipStyle(t)} />
        <Legend wrapperStyle={{ fontSize: 11, color: t.muted }} />
        {ci && (
          <>
            <Area dataKey={ci.lowerKey} stackId="ci" stroke="none" fill="transparent" legendType="none" isAnimationActive={false} />
            <Area
              dataKey="__ciBand"
              stackId="ci"
              stroke="none"
              fill={t.accent}
              fillOpacity={0.12}
              name={ci.label ?? 'CI'}
              isAnimationActive={false}
            />
          </>
        )}
        {lines.map((line, idx) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label ?? line.key}
            stroke={t.series[idx % t.series.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}