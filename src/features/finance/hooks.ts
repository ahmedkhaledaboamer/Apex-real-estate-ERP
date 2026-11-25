import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from '@/components/ui/Toast'
import { invoiceTotals } from '@/lib/calc'
import { formatMoney } from '@/lib/format'
import { CURRENT_USER_ID, customers, employees } from '@/mocks/core'
import { deals, invoices, payments } from '@/mocks/domain'
import { accounts, commissionPayouts, expenses } from '@/mocks/finance'
import type { Invoice, PaymentMethod } from '@/types/domain'
import type { PayoutStatus } from '@/types/finance'
import { invoiceState, nextNumber, todayIso, type PayoutRow } from './lib'

/** Every collection the finance screens read. `ready` once all have loaded. */
export function useFinanceData() {
  const d = deals.useList()
  const i = invoices.useList()
  const p = payments.useList()
  const x = expenses.useList()
  const a = accounts.useList()
  const c = commissionPayouts.useList()
  const e = employees.useList()
  const cu = customers.useList()
  const all = [d, i, p, x, a, c, e, cu]
  const ready = all.every((q) => !!q.data)
  return {
    ready,
    loading: !ready,
    deals: d.data ?? [],
    invoices: i.data ?? [],
    payments: p.data ?? [],
    expenses: x.data ?? [],
    accounts: a.data ?? [],
    payouts: c.data ?? [],
    employees: e.data ?? [],
    customers: cu.data ?? [],
  }
}

export interface PaymentInput {
  invoice: Invoice
  amount: number
  method: PaymentMethod
  date: string
  reference: string
}

/**
 * Record a receipt against a commission invoice:
 * creates the `payments` record, updates the invoice's `paid`/`status`, and the deal's `collected`
 * (commission collected excl. VAT — capped at the deal's commission).
 */
export function useRecordPayment() {
  const createPayment = payments.useCreate()
  const updateInvoice = invoices.useUpdate({ silent: true })
  const updateDeal = deals.useUpdate({ silent: true })
  const [saving, setSaving] = useState(false)

  const record = useCallback(
    async ({ invoice, amount, method, date, reference }: PaymentInput) => {
      setSaving(true)
      try {
        const all = payments.collection.all()
        await createPayment.mutateAsync({
          number: nextNumber(all.map((p) => p.number), 'RCV'),
          invoiceId: invoice.id,
          dealId: invoice.dealId,
          customerId: invoice.customerId,
          amount,
          method,
          date,
          reference,
          receivedById: CURRENT_USER_ID,
        })
        const paid = Math.round((invoice.paid + amount) * 100) / 100
        const next = { ...invoice, paid, status: invoice.status === 'draft' ? ('sent' as const) : invoice.status }
        const status = invoiceState(next)
        await updateInvoice.mutateAsync({ id: invoice.id, patch: { paid, status } })
        const deal = invoice.dealId ? deals.collection.byId(invoice.dealId) : undefined
        if (deal) {
          const { total, subtotal } = invoiceTotals(invoice)
          // Net-of-VAT share of this receipt; a fully paid invoice means the deal's commission is collected.
          const net = status === 'paid' ? deal.commission : Math.min(deal.commission, Math.round(deal.collected + (amount * subtotal) / (total || 1)))
          await updateDeal.mutateAsync({ id: deal.id, patch: { collected: Math.max(deal.collected, net) } })
        }
        toast.success(status === 'paid' ? `${invoice.number} paid in full` : `${formatMoney(amount)} recorded on ${invoice.number}`)
        return true
      } catch {
        return false
      } finally {
        setSaving(false)
      }
    },
    [createPayment, updateInvoice, updateDeal],
  )
  return { record, saving }
}

/** Approve / mark paid broker payouts (single or bulk), creating records for deals closed after seeding. */
export function usePayoutActions() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async (rows: PayoutRow[], to: PayoutStatus) => {
      if (!rows.length) return
      setBusy(true)
      try {
        const now = new Date().toISOString()
        const ref = `CR-${todayIso().slice(0, 7).replace('-', '')}-${String(Math.floor(Math.random() * 90) + 10)}`
        for (const r of rows) {
          const patch = to === 'paid' ? { status: to, paidAt: todayIso(), approvedAt: r.approvedAt ?? now, reference: ref } : { status: to, approvedAt: now as string | null }
          if (r.virtual) {
            await commissionPayouts.collection.create({ dealId: r.dealId, brokerId: r.brokerId, amount: r.amount, paidAt: null, reference: '', ...patch })
          } else {
            await commissionPayouts.collection.update(r.id, patch)
          }
        }
        await qc.invalidateQueries({ queryKey: commissionPayouts.keys.all })
        const total = rows.reduce((a, r) => a + r.amount, 0)
        toast.success(`${rows.length} payout${rows.length > 1 ? 's' : ''} ${to === 'paid' ? 'marked paid' : 'approved'} · ${formatMoney(total)}`)
      } catch (e) {
        toast.error(String((e as Error).message))
      } finally {
        setBusy(false)
      }
    },
    [qc],
  )
  return { run, busy }
}
