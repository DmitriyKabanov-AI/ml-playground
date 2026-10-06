import { Inbox } from 'lucide-react'

interface EmptyProps {
  text?: string
}

export function Empty({ text = 'Нет данных' }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted">
      <Inbox size={28} className="opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  )
}