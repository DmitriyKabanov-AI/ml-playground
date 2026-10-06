import type { ChangeEvent } from 'react'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps {
  label?: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
}

export function SelectField({ label, value, options, onChange, className }: SelectFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)
  return (
    <label className={`flex flex-col gap-1 text-xs text-muted ${className ?? ''}`}>
      {label && <span className="font-medium">{label}</span>}
      <select
        value={value}
        onChange={handleChange}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none transition focus:border-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}