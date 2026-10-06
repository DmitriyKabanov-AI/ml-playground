import type { CSSProperties } from 'react'
import { useUIStore } from '../../store/ui'

export interface ChartTheme {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  fg: string
  muted: string
  series: string[]
  success: string
  danger: string
  warning: string
  accent: string
}

const SERIES = ['#818cf8', '#22d3ee', '#fbbf24', '#34d399', '#fb7185', '#c084fc']

export function useChartTheme(): ChartTheme {
  const theme = useUIStore((s) => s.theme)
  const isDark = theme === 'dark'
  return {
    grid: isDark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.08)',
    axis: isDark ? '#8993ab' : '#64748b',
    tooltipBg: isDark ? 'rgba(13,18,34,.92)' : 'rgba(255,255,255,.95)',
    tooltipBorder: isDark ? 'rgba(255,255,255,.12)' : 'rgba(15,23,42,.1)',
    fg: isDark ? '#f3f5fb' : '#0f172a',
    muted: isDark ? '#8993ab' : '#64748b',
    series: SERIES,
    success: '#34d399',
    danger: '#fb7185',
    warning: '#fbbf24',
    accent: isDark ? '#6366f1' : '#4f46e5',
  }
}

export function tooltipStyle(t: ChartTheme): { contentStyle: CSSProperties; labelStyle: CSSProperties } {
  return {
    contentStyle: {
      background: t.tooltipBg,
      border: `1px solid ${t.tooltipBorder}`,
      borderRadius: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,.25)',
      backdropFilter: 'blur(12px)',
      fontSize: 12,
      color: t.fg,
    },
    labelStyle: { color: t.muted, marginBottom: 4 },
  }
}