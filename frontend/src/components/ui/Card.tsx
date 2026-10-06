import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  padded?: boolean
}

export function Card({ children, className, title, subtitle, actions, padded = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-card backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,.35)]',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </div>
  )
}