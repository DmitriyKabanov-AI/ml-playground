interface LoaderProps {
  text?: string
}

export function Loader({ text = 'Загрузка...' }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      <p className="text-sm">{text}</p>
    </div>
  )
}