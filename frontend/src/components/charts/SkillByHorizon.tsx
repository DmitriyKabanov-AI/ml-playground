import { ForecastLine } from './ForecastLine'
import type { ForecastDatum } from './ForecastLine'
import type { WeatherHorizonStat } from '../../types'

interface SkillByHorizonProps {
  byHorizon: Record<string, WeatherHorizonStat>
  height?: number
}

export function SkillByHorizon({ byHorizon, height = 320 }: SkillByHorizonProps) {
  const horizons = Object.keys(byHorizon)
    .map(Number)
    .sort((a, b) => a - b)

  const data: ForecastDatum[] = horizons.map((h) => {
    const stat = byHorizon[String(h)]
    return {
      horizon: h,
      ridge: Number(stat.skill_ridge_mean.toFixed(4)),
      rf: Number(stat.skill_rf_mean.toFixed(4)),
    }
  })

  return (
    <ForecastLine
      data={data}
      lines={[
        { key: 'ridge', label: 'Ridge' },
        { key: 'rf', label: 'RandomForest' },
      ]}
      yLabel="Skill"
      height={height}
    />
  )
}