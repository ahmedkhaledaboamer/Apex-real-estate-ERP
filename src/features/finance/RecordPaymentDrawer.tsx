import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { invoiceTotals } from '@/lib/calc'
import { formatDate, formatMoney } from '@/lib/format'
import { optionsOf, PAYMENT_METHOD } from '@/lib/labels'
import { customerById } from '@/mocks/core'
import { dealById, invoices as invoicesRes } from '@/mocks/domain'
import type { Invoice, PaymentMethod } from '@/types/domain'
import { useRecordPayment } from './hooks'
import { isOpenInvoice, todayIso } from './lib'

/**
 * Record a receipt. With `invoice` the invoice is fixed (detail page); otherwise pick the client,
 * then one of their open invoices — the amount defaults to the invoice balance.
 */
export function RecordPaymentDrawer({ open, onClose, invoice }: { open: boolean; onClose: () => void; invoice?: Invoice }) {
  const { data: all } = invoicesRes.useList()
  const { record, saving } = useRecordPayment()
  const openInvoices = useMemo(() => (all ?? []).filter((i) => isOpenInvoice(i) && invoiceTotals(i).balance > 0), [all])
  const clients = useMemo(() => {
    const ids = [...new Set(openInvoices.map((i) => i.customerId))]
    return ids
      .map((id) => customerById(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [openInvoices])

  const [clientId, setClientId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('bank-transfer')
  const [date, setDate] = useState(todayIso())
  const [reference, setReference] = useState('')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setClientId(invoice?.customerId ?? '')
    setInvoiceId(invoice?.id ?? '')
    setAmount(invoice ? String(invoiceTotals(invoice).balance) : '')
    setMethod('bank-transfer')
    setDate(todayIso())
    setReference('')
    setTried(false)
  }, [open, invoice])

  const clientInvoices = openInvoices.filter((i) => i.customerId === clientId)
  const selected = invoice ?? openInvoices.find((i) => i.id === invoiceId)
  const balance = selected ? invoiceTotals(selected).balance : 0
  const value = Number(amount)
  const errors = {
    client: !invoice && !clientId ? 'Choose a client' : undefined,
    invoice: !selected ? 'Choose an invoice' : undefined,
    amount: !(value > 0) ? 'Enter an amount' : value > balance + 0.01 ? `Can't exceed the balance of ${formatMoney(balance, { decimals: true })}` : undefined,
    date: !date ? 'Pick a date' : date > todayIso() ? 'Receipts cannot be future-dated' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean)

  const submit = async () => {
    setTried(true)
    if (!valid || !selected) return
    const ok = await record({ invoice: selected, amount: Math.round(value * 100) / 100, method, date, reference: reference.trim() || `TX${Date.now().toString().slice(-6)}` })
    if (ok) onClose()
  }
  const deal = dealById(selected?.dealId)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record payment"
      subtitle={selected ? `${selected.number} · ${customerById(selected.customerId)?.name ?? ''}` : 'Commission receipt against an invoice'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!invoice && (
          <>
            <Field label="Client / developer" required error={tried ? errors.client : undefined} className="sm:col-span-2">
              {(id) => (
                <Select
                  id={id}
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value)
                    const first = openInvoices.find((i) => i.customerId === e.target.value)
                    setInvoiceId(first?.id ?? '')
                    setAmount(first ? String(invoiceTotals(first).balance) : '')
                  }}
                  placeholder="Select…"
                  options={clients.map((c) => ({ value: c.id, label: `${c.name}${c.type === 'developer' ? ' (developer)' : ''}` }))}
                  aria-invalid={tried && !!errors.client}
                />
              )}
            </Field>
            <Field label="Invoice" required error={tried ? errors.invoice : undefined} className="sm:col-span-2" hint={clientId && !clientInvoices.length ? 'No open invoices for this client' : undefined}>
              {(id) => (
                <Select
                  id={id}
                  value={invoiceId}
                  disabled={!clientId}
                  onChange={(e) => {
                    setInvoiceId(e.target.value)
                    const inv = openInvoices.find((i) => i.id === e.target.value)
                    setAmount(inv ? String(invoiceTotals(inv).balance) : '')
                  }}
                  placeholder="Select…"
                  options={clientInvoices.map((i) => ({ value: i.id, label: `${i.number} · balance ${formatMoney(invoiceTotals(i).balance)} · due ${formatDate(i.dueDate)}` }))}
                  aria-invalid={tried && !!errors.invoice}
                />
              )}
            </Field>
          </>
        )}

        {selected && (
          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 text-[13px] sm:col-span-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Invoice total</span>
              <span className="font-semibold tabular">{formatMoney(invoiceTotals(selected).total, { decimals: true })}</span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-muted">Paid so far</span>
              <span className="tabular">{formatMoney(selected.paid, { decimals: true })}</span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-muted">Balance due</span>
              <span className="font-bold text-aura tabular dark:text-[#d6a8e3]">{formatMoney(balance, { decimals: true })}</span>
            </div>
            {deal && <p className="mt-2 border-t border-line pt-2 text-[12px] text-muted">Deal {deal.code} — the deal’s collected commission updates automatically.</p>}
          </div>
        )}

        <Field label="Amount (AED, incl. VAT)" required error={tried ? errors.amount : undefined}>
          {(id) => <Input id={id} type="number" inputMode="decimal" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={tried && !!errors.amount} />}
        </Field>
        <Field label="Method" required>
          {(id) => <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={optionsOf(PAYMENT_METHOD)} />}
        </Field>
        <Field label="Date received" required error={tried ? errors.date : undefined}>
          {(id) => <Input id={id} type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} aria-invalid={tried && !!errors.date} />}
        </Field>
        <Field label="Reference" hint="Bank ref / cheque no.">
          {(id) => <Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === 'cheque' || method === 'manager-cheque' ? 'Cheque no.' : 'TX…'} />}
        </Field>
      </div>
    </Drawer>
  )
}
