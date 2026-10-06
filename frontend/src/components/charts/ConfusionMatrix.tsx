import { useChartTheme } from './theme'

interface ConfusionMatrixProps {
  classes: string[]
  matrix: number[][]
}

export function ConfusionMatrix({ classes, matrix }: ConfusionMatrixProps) {
  const t = useChartTheme()
  const max = Math.max(...matrix.flat(), 1)

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2" />
            {classes.map((c) => (
              <th key={c} className="p-2 text-center font-medium text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={classes[i]}>
              <th className="whitespace-nowrap p-2 text-right font-medium text-muted">{classes[i]}</th>
              {row.map((value, j) => {
                const ratio = value / max
                const isDiag = i === j
                const bg = isDiag ? `rgba(52, 211, 153, ${0.15 + ratio * 0.65})` : `rgba(251, 113, 133, ${ratio * 0.55})`
                return (
                  <td key={j} className="p-1">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-semibold"
                      style={{ background: bg, color: t.fg }}
                    >
                      {value}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}