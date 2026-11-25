import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: Tone
  message: string
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
let seq = 0

function push(tone: Tone, message: string) {
  const id = ++seq
  items = [...items, { id, tone, message }].slice(-4)
  emit()
  setTimeout(() => dismiss(id), 3200)
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

/** Fire-and-forget notifications: toast.success('Saved') */
export const toast = {
  success: (m: string) => push('success', m),
  error: (m: string) => push('error', m),
  info: (m: string) => push('info', m),
}

const ICON = { success: CheckCircle2, error: XCircle, info: Info }
const TONE = { success: 'text-success', error: 'text-danger', info: 'text-info' }

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => items,
  )
  return createPortal(
    <div className="pointer-events-none fixed end-4 bottom-4 z-[80] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {list.map((t) => {
        const Icon = ICON[t.tone]
        return (
          <div key={t.id} className="pointer-events-auto flex animate-rise items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-lift">
            <Icon className={cn('mt-0.5 size-[18px] shrink-0', TONE[t.tone])} />
            <p className="flex-1 text-[13.5px] font-medium">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="text-muted hover:text-fg" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
