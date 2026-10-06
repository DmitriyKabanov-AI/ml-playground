import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: { to: string; label: string }
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {backTo && (
        <Link to={backTo.to} className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted transition hover:text-accent">
          <ChevronLeft size={14} /> {backTo.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold capitalize text-fg sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}