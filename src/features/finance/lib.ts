import { invoiceTotals, sum } from '@/lib/calc'
import { today } from '@/lib/random'
import { communityBySlug, customerById } from '@/mocks/core'
import { agencyShare, brokerShare, listingById, offplanById } from '@/mocks/domain'
import { ACCOUNT_IDS, CARD_SETTLEMENT_DAYS } from '@/mocks/finance'
import type { Deal, DealType, Invoice, InvoiceStatus, Payment } from '@/types/domain'
import type { Account, CommissionPayout, Expense, ExpenseCategory } from '@/types/finance'

/* Pure finance helpers shared by the Finance pages. Revenue = GCI of deals closed in the period
   (by `closedAt`, same as the dashboard); cost of sales = the brokers' share of those deals. */

const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayIso = () => isoDay(today())
/** yyyy-mm-dd + n days */
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + n)
  return isoDay(d)
}
export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const monthLabel = (key: string, long = false) => {
  const [y, m] = key.split('-').map(Number)
  return long ? new Date(y!, m! - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : `${MONTHS[m! - 1]}`
}
/** Gross amount (incl. VAT) of an expense. */
export const expenseGross = (e: Pick<Expense, 'amount' | 'vatRate'>) => Math.round(e.amount * (1 + e.vatRate / 100) * 100) / 100
/** Expenses that count in the P&L (everything except rejected submissions). */
export const countsInPnl = (e: Pick<Expense, 'status'>) => e.status !== 'rejected'
const closedIn = (d: Deal, from: string, to: string) => d.stage === 'closed' && !!d.closedAt && d.closedAt.slice(0, 10) >= from && d.closedAt.slice(0, 10) <= to

/** Last 12 months (oldest first), keys yyyy-mm. */
export function last12Months() {
  const now = today()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const key = monthKeyOf(d)
    return { key, label: MONTHS[d.getMonth()]!, long: monthLabel(key, true) }
  })
}

/* ------------------------------------------------------------------ */
/*  Periods                                                             */
/* ------------------------------------------------------------------ */
export type PeriodId = 'this-month' | 'last-month' | 'this-quarter' | 'ytd' | 'last-12'
export const PERIODS: { value: PeriodId; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'last-12', label: 'Last 12 months' },
]
export interface Range {
  from: string
  to: string
  label: string
}
const monthStart = (y: number, m: number) => isoDay(new Date(y, m, 1))
const monthEnd = (y: number, m: number) => isoDay(new Date(y, m + 1, 0))
const fmtRange = (from: string, to: string) => {
  const f = new Date(`${from}T00:00:00`)
  const t = new Date(`${to}T00:00:00`)
  const o: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
  return f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear() ? f.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : `${f.toLocaleDateString('en-GB', o)} – ${t.toLocaleDateString('en-GB', o)}`
}
/** Current range + the comparable previous range. Month/quarter ranges run to period end so accrued bills (payroll on the 27th) count. */
export function periodRanges(p: PeriodId): { cur: Range; prev: Range } {
  const now = today()
  const y = now.getFullYear()
  const m = now.getMonth()
  const mk = (from: string, to: string): Range => ({ from, to, label: fmtRange(from, to) })
  switch (p) {
    case 'this-month':
      return { cur: mk(monthStart(y, m), monthEnd(y, m)), prev: mk(monthStart(y, m - 1), monthEnd(y, m - 1)) }
    case 'last-month':
      return { cur: mk(monthStart(y, m - 1), monthEnd(y, m - 1)), prev: mk(monthStart(y, m - 2), monthEnd(y, m - 2)) }
    case 'this-quarter': {
      const q = Math.floor(m / 3) * 3
      return { cur: mk(monthStart(y, q), monthEnd(y, q + 2)), prev: mk(monthStart(y, q - 3), monthEnd(y, q - 1)) }
    }
    case 'ytd':
      return { cur: mk(monthStart(y, 0), monthEnd(y, m)), prev: mk(monthStart(y - 1, 0), monthEnd(y - 1, m)) }
    case 'last-12':
      return { cur: mk(monthStart(y, m - 11), monthEnd(y, m)), prev: mk(monthStart(y, m - 23), monthEnd(y, m - 12)) }
  }
}

/* ------------------------------------------------------------------ */
/*  P&L                                                                 */
/* ------------------------------------------------------------------ */
export interface Pnl {
  revenue: Record<DealType, number>
  revenueTotal: number
  deals: number
  brokerCommissions: number
  grossProfit: number
  opex: Record<ExpenseCategory, number>
  opexTotal: number
  netProfit: number
  margin: number
}
const CATS: ExpenseCategory[] = ['salaries', 'rent', 'portals', 'advertising', 'media', 'licensing', 'software', 'utilities', 'office', 'legal', 'conveyancing']
export function buildPnl(deals: Deal[], expenses: Expense[], r: Pick<Range, 'from' | 'to'>): Pnl {
  const closed = deals.filter((d) => closedIn(d, r.from, r.to))
  const revenue = { sale: 0, rent: 0, offplan: 0 } as Record<DealType, number>
  for (const d of closed) revenue[d.type] += d.commission
  const revenueTotal = sum(closed, (d) => d.commission)
  const brokerCommissions = sum(closed, (d) => brokerShare(d))
  const opex = Object.fromEntries(CATS.map((c) => [c, 0])) as Record<ExpenseCategory, number>
  for (const e of expenses) if (countsInPnl(e) && e.date >= r.from && e.date <= r.to) opex[e.category] += e.amount
  const opexTotal = sum(CATS, (c) => opex[c])
  const grossProfit = revenueTotal - brokerCommissions
  const netProfit = grossProfit - opexTotal
  return { revenue, revenueTotal, deals: closed.length, brokerCommissions, grossProfit, opex, opexTotal, netProfit, margin: revenueTotal ? (netProfit / revenueTotal) * 100 : 0 }
}

/** 12-month series: GCI, agency net, opex, net profit. */
export function monthlySeries(deals: Deal[], expenses: Expense[]) {
  return last12Months().map((m) => {
    const closed = deals.filter((d) => d.stage === 'closed' && d.closedAt?.slice(0, 7) === m.key)
    const gci = sum(closed, (d) => d.commission)
    const net = sum(closed, (d) => agencyShare(d))
    const opex = sum(
      expenses.filter((e) => countsInPnl(e) && e.date.slice(0, 7) === m.key),
      (e) => e.amount,
    )
    return { ...m, month: m.label, gci, net, broker: gci - net, opex, profit: net - opex }
  })
}

/* ------------------------------------------------------------------ */
/*  Invoices                                                            */
/* ------------------------------------------------------------------ */
/** Effective status: sent/partial invoices past their due date are overdue. */
export function invoiceState(inv: Pick<Invoice, 'status' | 'dueDate' | 'paid' | 'items' | 'taxRate'>): InvoiceStatus {
  if (inv.status === 'void' || inv.status === 'draft') return inv.status
  const { total } = invoiceTotals(inv)
  if (inv.paid >= total - 0.5) return 'paid'
  if (inv.dueDate < todayIso()) return 'overdue'
  return inv.paid > 0 ? 'partial' : 'sent'
}
/** Open = counts as receivable (same rule as the dashboard). */
export const isOpenInvoice = (inv: Invoice) => inv.status !== 'void' && inv.status !== 'paid' && inv.status !== 'draft'
export const billToType = (inv: Pick<Invoice, 'customerId'>): 'developer' | 'client' => (customerById(inv.customerId)?.type === 'developer' ? 'developer' : 'client')
export function overdueDays(inv: Invoice) {
  if (invoiceState(inv) !== 'overdue') return 0
  return Math.max(0, Math.round((today().getTime() - new Date(`${inv.dueDate}T00:00:00`).getTime()) / DAY))
}
export const AGEING_BUCKETS = ['Not yet due', '1–30 days', '31–60 days', '61–90 days', '90+ days'] as const
export function ageing(invoices: Invoice[]) {
  const out = AGEING_BUCKETS.map((name) => ({ name, value: 0, count: 0 }))
  const t = today().getTime()
  for (const inv of invoices) {
    if (!isOpenInvoice(inv)) continue
    const bal = invoiceTotals(inv).balance
    if (bal <= 0) continue
    const late = Math.round((t - new Date(`${inv.dueDate}T00:00:00`).getTime()) / DAY)
    const i = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4
    out[i]!.value += bal
    out[i]!.count += 1
  }
  return out
}
/** Next document number: nextNumber(['INV-5201', …], 'INV') → 'INV-5560'. */
export function nextNumber(numbers: string[], prefix: string) {
  const max = numbers.reduce((a, n) => Math.max(a, Number(n.replace(/\D+/g, '')) || 0), 0)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

/** "2-bed apartment in Marina Gate 1 · Dubai Marina" or the off-plan project. */
export function dealProperty(d: Pick<Deal, 'listingId' | 'projectId' | 'communitySlug'> | undefined) {
  if (!d) return { title: '—', sub: '', image: undefined as string | undefined }
  const l = listingById(d.listingId)
  if (l) return { title: l.title, sub: communityBySlug(l.communitySlug)?.name ?? '', image: l.images[0] }
  const p = offplanById(d.projectId)
  if (p) return { title: p.name, sub: `Off-plan · ${communityBySlug(p.communitySlug)?.name ?? ''}`, image: p.image }
  return { title: communityBySlug(d.communitySlug)?.name ?? '—', sub: '', image: undefined }
}

/* ------------------------------------------------------------------ */
/*  Accounts + transactions                                             */
/* ------------------------------------------------------------------ */
export interface Txn {
  id: string
  date: string
  kind: 'receipt' | 'expense' | 'payout'
  label: string
  sub: string
  amount: number
  accountId: string
  link?: { to: string; params?: Record<string, string> }
}
/** Bank account a receipt lands in (card receipts sit in clearing until settled). */
export function receiptAccount(p: Pick<Payment, 'method' | 'date'>) {
  if (p.method !== 'card') return ACCOUNT_IDS.current
  const age = (today().getTime() - new Date(`${p.date}T00:00:00`).getTime()) / DAY
  return age < CARD_SETTLEMENT_DAYS ? ACCOUNT_IDS.card : ACCOUNT_IDS.current
}
/** Paying account for an expense: petty cash spent in earlier months has already been topped up from the current account. */
function expenseAccount(e: Expense) {
  if (e.accountId === ACCOUNT_IDS.petty && e.paidAt && e.paidAt.slice(0, 7) !== monthKeyOf(today())) return ACCOUNT_IDS.current
  return e.accountId
}
export function transactions(payments: Payment[], expenses: Expense[], payouts: CommissionPayout[], brokerName: (id: string) => string): Txn[] {
  const out: Txn[] = []
  for (const p of payments)
    out.push({ id: p.id, date: p.date, kind: 'receipt', label: `Receipt ${p.number}`, sub: customerById(p.customerId)?.name ?? '—', amount: p.amount, accountId: receiptAccount(p), link: p.invoiceId ? { to: '/finance/invoices/$invoiceId', params: { invoiceId: p.invoiceId } } : undefined })
  for (const e of expenses)
    if (e.status === 'paid' && e.paidAt) out.push({ id: e.id, date: e.paidAt, kind: 'expense', label: e.payee, sub: e.description, amount: -expenseGross(e), accountId: expenseAccount(e) })
  for (const c of payouts)
    if (c.status === 'paid' && c.paidAt) out.push({ id: c.id, date: c.paidAt, kind: 'payout', label: `Commission · ${brokerName(c.brokerId)}`, sub: c.reference || 'Broker payout', amount: -c.amount, accountId: ACCOUNT_IDS.current })
  return out.sort((a, b) => b.date.localeCompare(a.date))
}
export function accountBalances(accounts: Account[], txns: Txn[]) {
  const mk = monthKeyOf(today())
  return accounts.map((a) => {
    const rows = txns.filter((t) => t.accountId === a.id && t.date > a.openingDate)
    const inMonth = rows.filter((t) => t.date.slice(0, 7) === mk)
    const flowIn = sum(inMonth.filter((t) => t.amount > 0), (t) => t.amount)
    const flowOut = -sum(inMonth.filter((t) => t.amount < 0), (t) => t.amount)
    const balance = a.openingBalance + sum(rows, (t) => t.amount)
    return { account: a, balance, flowIn, flowOut, count: rows.length }
  })
}

/* ------------------------------------------------------------------ */
/*  Broker payouts                                                      */
/* ------------------------------------------------------------------ */
export interface PayoutRow extends CommissionPayout {
  deal: Deal
  /** Deal commission fully collected → broker can be paid */
  eligible: boolean
  /** Not yet stored (deal closed after the payouts were generated) */
  virtual: boolean
}
export function payoutRows(deals: Deal[], payouts: CommissionPayout[]): PayoutRow[] {
  const byDeal = new Map(payouts.map((p) => [p.dealId, p]))
  const out: PayoutRow[] = []
  for (const d of deals) {
    if (d.stage !== 'closed') continue
    const p = byDeal.get(d.id)
    const base: CommissionPayout = p ?? { id: `virtual-${d.id}`, dealId: d.id, brokerId: d.agentId, amount: brokerShare(d), status: 'pending', approvedAt: null, paidAt: null, reference: '' }
    out.push({ ...base, deal: d, eligible: d.collected >= d.commission, virtual: !p })
  }
  return out.sort((a, b) => (b.deal.closedAt ?? '').localeCompare(a.deal.closedAt ?? ''))
}
