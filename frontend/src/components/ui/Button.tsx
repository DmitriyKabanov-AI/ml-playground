import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'ghost', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-accent text-white hover:brightness-110 active:scale-95',
        variant === 'outline' && 'border border-line text-fg hover:bg-white/5',
        variant === 'ghost' && 'text-muted hover:bg-white/5 hover:text-fg',
        className,
      )}
      {...props}
    />
  )
}