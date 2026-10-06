import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'accent'

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  className?: string
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-white/5 text-muted border-line',
  success: 'bg-success/10 text-success border-success/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}