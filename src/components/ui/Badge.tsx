import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Status } from '@/types/core'

const TONE: Record<Status, string> = {
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/12 text-[#b06d0f] ring-warning/25 dark:text-[#f0b25a]',
  danger: 'bg-danger/10 text-danger ring-danger/20 dark:text-[#f07f7f]',
  info: 'bg-info/10 text-info ring-info/20 dark:text-[#7db6f0]',
  neutral: 'bg-surface-2 text-muted ring-line',
  brand: 'bg-aura/10 text-aura ring-aura/20 dark:text-[#d6a8e3]',
}
const DOT: Record<Status, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
  brand: 'bg-aura',
}

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Status; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ring-1 ring-inset', TONE[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', DOT[tone])} />}
      {children}
    </span>
  )
}

/**
 * Badge for a status value using a module's map:
 *   const BOOKING_STATUS = { confirmed: ['Confirmed', 'success'], pending: ['Pending', 'warning'] } as const
 *   <StatusBadge value={b.status} map={BOOKING_STATUS} />
 */
export function StatusBadge<K extends string>({ value, map }: { value: K; map: Record<K, readonly [string, Status]> }) {
  const [label, tone] = map[value] ?? [value, 'neutral']
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  )
}
