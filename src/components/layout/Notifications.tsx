import { Link } from '@tanstack/react-router'
import { BadgeDollarSign, CalendarClock, FileWarning, KeyRound, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'
import { daysFromNow } from '@/lib/random'

const ITEMS = [
  { id: 1, icon: BadgeDollarSign, tone: 'text-success bg-success/10', title: 'Commission received', body: 'AED 96,600 from Emaar Properties', at: daysFromNow(0, new Date().getHours(), 0), to: '/finance/payments' },
  { id: 2, icon: UserPlus, tone: 'text-aura bg-aura/10', title: 'New lead from Property Finder', body: '3-bed villa · Dubai Hills · AED 6.5M budget', at: daysFromNow(0, Math.max(0, new Date().getHours() - 2)), to: '/sales/leads' },
  { id: 3, icon: KeyRound, tone: 'text-royal bg-royal/10', title: 'Transfer booked at the trustee', body: 'DL-3412 · Marina Gate 1 · Thursday 11:00', at: daysFromNow(-1, 16), to: '/sales/deals' },
  { id: 4, icon: FileWarning, tone: 'text-danger bg-danger/10', title: 'Commission invoices overdue', body: 'Follow up with developers and clients', at: daysFromNow(-1, 9), to: '/finance/invoices' },
  { id: 5, icon: CalendarClock, tone: 'text-warning bg-warning/12', title: 'RERA card expiring', body: 'A broker card expires within 30 days', at: daysFromNow(-2, 11), to: '/hr' },
]

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [read, setRead] = useState<number[]>([])
  useEffect(() => {
    const onDown = (e: MouseEvent) => !ref.current?.parentElement?.contains(e.target as Node) && onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  return (
    <div ref={ref} className="absolute end-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[14px] font-semibold">Notifications</p>
        <button type="button" onClick={() => setRead(ITEMS.map((i) => i.id))} className="text-[12.5px] font-semibold text-aura hover:underline">
          Mark all as read
        </button>
      </div>
      <ul className="max-h-[380px] overflow-y-auto">
        {ITEMS.map((n) => {
          const Icon = n.icon
          return (
            <li key={n.id}>
              <Link to={n.to} onClick={onClose} className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', n.tone)}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-semibold">
                    {n.title}
                    {!read.includes(n.id) && <span className="size-1.5 rounded-full bg-aura" />}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">{n.body}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted/80">{formatRelative(n.at)}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
