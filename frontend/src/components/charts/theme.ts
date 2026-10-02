import { useMemo } from 'react';
import { useUI } from '../../store/ui';

export function useChartTheme() {
  const theme = useUI((s) => s.theme);
  return useMemo(() => {
    const dark = theme === 'dark';
    const fg = dark ? '#e2e8f5' : '#0f172a';
    return {
      dark,
      grid: dark ? '#1f2a44' : '#e2e8f0',
      axis: dark ? '#8b97b1' : '#64748b',
      series: ['#818cf8', '#22d3ee', '#fbbf24', '#34d399', '#fb7185', '#c084fc'],
      classes: ['#22d3ee', '#c084fc', '#fbbf24'],
      accent: '#818cf8',
      good: '#34d399',
      bad: '#fb7185',
      warn: '#fbbf24',
      tooltip: {
        contentStyle: {
          background: dark ? '#0d1325' : '#ffffff',
          border: `1px solid ${dark ? '#243049' : '#e2e8f0'}`,
          borderRadius: 12,
          fontSize: 12,
          color: fg,
          boxShadow: '0 8px 30px rgba(0,0,0,.25)',
        },
        labelStyle: { color: fg, fontWeight: 600 },
        itemStyle: { color: fg },
      },
    };
  }, [theme]);
}

export type ChartTheme = ReturnType<typeof useChartTheme>;

export const axisProps = (t: ChartTheme) => ({
  stroke: t.axis,
  tick: { fill: t.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: t.grid },
});