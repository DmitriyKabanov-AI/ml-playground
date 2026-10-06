interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-white/5 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
            value === opt.value ? 'bg-accent text-white shadow' : 'text-muted hover:text-fg'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}