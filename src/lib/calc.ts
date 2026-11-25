import type { Deal, Invoice } from '@/types/domain'

export function invoiceTotals(inv: Pick<Invoice, 'items' | 'taxRate' | 'paid'>) {
  const subtotal = inv.items.reduce((a, i) => a + i.qty * i.unitPrice, 0)
  const tax = Math.round(subtotal * inv.taxRate) / 100
  const total = subtotal + tax
  return { subtotal, tax, total, balance: Math.max(0, total - inv.paid) }
}

export type CollectionState = 'uncollected' | 'partial' | 'collected'
/** How much of a deal's commission has been collected. */
export function dealCollectionState(d: Pick<Deal, 'collected' | 'commission'>): CollectionState {
  if (d.collected <= 0) return 'uncollected'
  return d.collected >= d.commission ? 'collected' : 'partial'
}
export function margin(revenue: number, cost: number) {
  return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
}
/** % change from previous to current (0 when previous is 0). */
export function change(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : 0
}
export function sum<T>(rows: readonly T[], get: (r: T) => number) {
  return rows.reduce((a, r) => a + get(r), 0)
}
/** AED per square foot. */
export function pricePerSqft(price: number, sqft: number) {
  return sqft > 0 ? Math.round(price / sqft) : 0
}
