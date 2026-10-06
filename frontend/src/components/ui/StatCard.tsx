import type { LucideIcon } from 'lucide-react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  delta?: { value: string; positive: boolean }
}

export function StatCard({ label, value, icon: Icon, delta }: StatCardProps) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold text-fg">{value}</p>
        {delta && (
          <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${delta.positive ? 'text-success' : 'text-danger'}`}>
            {delta.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {delta.value}
          </p>
        )}
      </div>
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon size={20} />
        </div>
      )}
    </Card>
  )
}