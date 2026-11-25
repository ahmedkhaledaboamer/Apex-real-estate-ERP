import { AlertTriangle, BadgeCheck, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/format'
import { BROKER_DEPARTMENTS, communityBySlug } from '@/mocks/core'
import { todayIso } from '@/mocks/hr'
import type { DepartmentId, Employee } from '@/types/core'

/** Broker departments carry a BRN, RERA card, commission split and specialist communities. */
export const isBrokerDept = (d: DepartmentId) => BROKER_DEPARTMENTS.includes(d)
export const isBroker = (e: Pick<Employee, 'departmentId'>) => isBrokerDept(e.departmentId)

export type ReraState = 'valid' | 'expiring' | 'expired' | 'none'

/** Days until the RERA card expires (negative = expired). */
export function reraDaysLeft(expiry: string | null) {
  if (!expiry) return null
  const a = new Date(`${todayIso()}T00:00:00`).getTime()
  const b = new Date(`${expiry.slice(0, 10)}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}
export function reraState(e: Pick<Employee, 'reraExpiry' | 'departmentId'>): ReraState {
  if (!isBroker(e)) return 'none'
  const d = reraDaysLeft(e.reraExpiry)
  if (d === null) return 'expired'
  return d < 0 ? 'expired' : d <= 30 ? 'expiring' : 'valid'
}

/** RERA card status badge: green when valid, amber within 30 days, red when expired. */
export function ReraBadge({ employee, withDate }: { employee: Pick<Employee, 'reraExpiry' | 'departmentId'>; withDate?: boolean }) {
  const state = reraState(employee)
  if (state === 'none') return null
  const d = reraDaysLeft(employee.reraExpiry)
  if (state === 'expired')
    return (
      <Badge tone="danger">
        <ShieldAlert className="size-3" />
        {d === null ? 'No RERA card' : `RERA expired ${Math.abs(d)}d ago`}
      </Badge>
    )
  if (state === 'expiring')
    return (
      <Badge tone="warning">
        <AlertTriangle className="size-3" />
        RERA expires {d === 0 ? 'today' : `in ${d}d`}
      </Badge>
    )
  return (
    <Badge tone="success">
      <BadgeCheck className="size-3" />
      {withDate && employee.reraExpiry ? `RERA valid · ${formatDate(employee.reraExpiry)}` : 'RERA valid'}
    </Badge>
  )
}

export const communityNames = (slugs: string[]) => [...new Set(slugs)].map((s) => communityBySlug(s)?.name ?? s)
