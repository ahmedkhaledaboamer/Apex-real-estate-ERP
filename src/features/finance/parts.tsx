import type { ReactNode } from 'react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { INVOICE_STATUS } from '@/lib/labels'
import type { Invoice } from '@/types/domain'
import { BILL_TO } from './labels'
import { billToType, invoiceState } from './lib'

export function InvoiceStatus({ invoice }: { invoice: Invoice }) {
  return <StatusBadge value={invoiceState(invoice)} map={INVOICE_STATUS} />
}

export function BillToBadge({ invoice }: { invoice: Pick<Invoice, 'customerId'> }) {
  const [label, tone] = BILL_TO[billToType(invoice)]
  return <Badge tone={tone}>{label}</Badge>
}

export function Money({ value, className, muted }: { value: number; className?: string; muted?: boolean }) {
  return <span className={cn('tabular', muted && value === 0 && 'text-muted', className)}>{muted && value === 0 ? '—' : formatMoney(value)}</span>
}

/** Small "label · value" summary chip used under tab bars. */
export function SummaryChip({ label, value, tone }: { label: string; value: ReactNode; tone?: 'danger' | 'success' | 'warning' }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
      <p className="text-[11.5px] font-medium text-muted">{label}</p>
      <p className={cn('mt-0.5 text-[15px] font-bold tabular', tone === 'danger' && 'text-danger', tone === 'success' && 'text-success', tone === 'warning' && 'text-warning')}>{value}</p>
    </div>
  )
}

/** Light thumbnail for a property (listing photo / project render). */
export function Thumb({ src, className }: { src?: string; className?: string }) {
  return src ? <img src={src} alt="" loading="lazy" className={cn('size-10 shrink-0 rounded-lg object-cover', className)} /> : <span className={cn('size-10 shrink-0 rounded-lg bg-surface-2', className)} />
}
