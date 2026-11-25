import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'

/** Base currency of the company. All stored amounts are in AED. */
export const BASE_CURRENCY = 'AED'

const money0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const money2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** "AED 12,500" (or with decimals). */
export function formatMoney(amount: number, opts: { decimals?: boolean; currency?: string } = {}) {
  const f = opts.decimals ? money2 : money0
  return `${opts.currency ?? BASE_CURRENCY} ${f.format(amount)}`
}
/** "AED 1.2M" */
export function formatMoneyCompact(amount: number, currency = BASE_CURRENCY) {
  return `${currency} ${compact.format(amount)}`
}
export function formatNumber(n: number) {
  return money0.format(n)
}
export function formatCompact(n: number) {
  return compact.format(n)
}
export function formatPercent(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`
}

const toDate = (d: string | Date) => (typeof d === 'string' ? parseISO(d) : d)
/** "12 Mar 2026" */
export function formatDate(d: string | Date) {
  return format(toDate(d), 'd MMM yyyy')
}
/** "12 Mar" */
export function formatShortDate(d: string | Date) {
  return format(toDate(d), 'd MMM')
}
/** "12 Mar 2026, 14:30" */
export function formatDateTime(d: string | Date) {
  return format(toDate(d), 'd MMM yyyy, HH:mm')
}
/** "3 days ago" / "in 2 hours" */
export function formatRelative(d: string | Date) {
  return formatDistanceToNowStrict(toDate(d), { addSuffix: true })
}
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
