import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { invoiceTotals } from '@/lib/calc'
import { formatMoney } from '@/lib/format'
import { DEAL_TYPE } from '@/lib/labels'
import { communityBySlug, customerById, customers } from '@/mocks/core'
import { deals as dealsRes, invoices as invoicesRes, listingById, offplanById } from '@/mocks/domain'
import type { Deal, Invoice, InvoiceItem } from '@/types/domain'
import { addDays, dealProperty, nextNumber, todayIso } from './lib'

const TYPE_LABEL = { sale: 'Sale', rent: 'Lease', offplan: 'Off-plan sale' } as const
/** Same wording as the generated invoices: "Sale commission — 2% of AED 2,450,000 · 2-bed apartment, Dubai Marina". */
export function commissionLine(d: Deal): InvoiceItem {
  const unit = listingById(d.listingId)
  const project = offplanById(d.projectId)
  const where = unit ? `${unit.title}, ${communityBySlug(unit.communitySlug)?.name}` : project ? project.name : communityBySlug(d.communitySlug)?.name
  return { description: `${TYPE_LABEL[d.type]} commission — ${d.commissionRate}% of AED ${d.price.toLocaleString('en-US')} · ${where}`, qty: 1, unitPrice: d.commission }
}
const INVOICEABLE = new Set(['mou', 'noc', 'transfer', 'contract', 'ejari', 'closed'])

type Draft = Omit<Invoice, 'id'>
const blank = (): Draft => ({ number: '', customerId: '', dealId: null, issueDate: todayIso(), dueDate: addDays(todayIso(), 7), items: [{ description: '', qty: 1, unitPrice: 0 }], taxRate: 5, paid: 0, status: 'draft', notes: '' })

export function InvoiceDrawer({ open, onClose, invoice, onSaved }: { open: boolean; onClose: () => void; invoice?: Invoice | null; onSaved?: (inv: Invoice) => void }) {
  const { data: allDeals } = dealsRes.useList()
  const { data: allInvoices } = invoicesRes.useList()
  const { data: allCustomers } = customers.useList()
  const create = invoicesRes.useCreate()
  const update = invoicesRes.useUpdate()
  const [f, setF] = useState<Draft>(blank)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setTried(false)
    if (invoice) {
      const { id: _id, ...rest } = invoice
      setF({ ...rest, items: invoice.items.map((i) => ({ ...i })) })
    } else setF(blank())
  }, [open, invoice])

  const invoicedDeals = useMemo(() => new Set((allInvoices ?? []).filter((i) => i.status !== 'void' && i.id !== invoice?.id).map((i) => i.dealId)), [allInvoices, invoice])
  const dealOptions = useMemo(
    () =>
      (allDeals ?? [])
        .filter((d) => INVOICEABLE.has(d.stage) && (!invoicedDeals.has(d.id) || d.id === f.dealId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((d) => ({ value: d.id, label: `${d.code} · ${DEAL_TYPE[d.type]} · ${dealProperty(d).title} · ${formatMoney(d.commission)}` })),
    [allDeals, invoicedDeals, f.dealId],
  )
  const customerOptions = useMemo(() => (allCustomers ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: `${c.name}${c.type === 'developer' ? ' (developer)' : ''}` })), [allCustomers])

  const pickDeal = (id: string) => {
    const d = (allDeals ?? []).find((x) => x.id === id)
    if (!d) return setF((s) => ({ ...s, dealId: null }))
    const developer = d.type === 'offplan'
    setF((s) => ({ ...s, dealId: d.id, customerId: developer ? d.counterpartyId : d.clientId, items: [commissionLine(d)], dueDate: addDays(s.issueDate || todayIso(), developer ? 45 : 7) }))
  }
  const setItem = (i: number, patch: Partial<InvoiceItem>) => setF((s) => ({ ...s, items: s.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }))

  const t = invoiceTotals(f)
  const errors = {
    customerId: !f.customerId ? 'Choose who the invoice is billed to' : undefined,
    issueDate: !f.issueDate ? 'Required' : undefined,
    dueDate: !f.dueDate ? 'Required' : f.dueDate < f.issueDate ? 'Due date is before the issue date' : undefined,
    items: f.items.some((i) => !i.description.trim() || !(i.qty > 0)) ? 'Every line needs a description and quantity' : t.subtotal <= 0 ? 'Invoice total must be above zero' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean)

  const save = (status: Invoice['status']) => {
    setTried(true)
    if (!valid) return
    const data = { ...f, items: f.items.map((i) => ({ ...i, description: i.description.trim() })), status: invoice ? (f.status === 'draft' && status === 'sent' ? 'sent' : f.status) : status }
    if (invoice) update.mutate({ id: invoice.id, patch: data }, { onSuccess: (inv) => (onSaved ? onSaved(inv) : onClose()) })
    else create.mutate({ ...data, number: nextNumber((allInvoices ?? []).map((i) => i.number), 'INV') }, { onSuccess: (inv) => (onSaved ? onSaved(inv) : onClose()) })
  }
  const billTo = customerById(f.customerId)
  const deal = (allDeals ?? []).find((d) => d.id === f.dealId)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={invoice ? `Edit ${invoice.number}` : 'New commission invoice'}
      subtitle={invoice ? billTo?.name : 'Pick a deal to pre-fill the bill-to and commission line'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {(!invoice || invoice.status === 'draft') && (
            <Button variant="soft" onClick={() => save('draft')} loading={create.isPending || update.isPending}>
              Save draft
            </Button>
          )}
          <Button onClick={() => save('sent')} loading={create.isPending || update.isPending}>
            {invoice && invoice.status !== 'draft' ? 'Save changes' : 'Save & send'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deal" className="sm:col-span-2" hint={deal ? `${DEAL_TYPE[deal.type]} · ${deal.commissionRate}% of ${formatMoney(deal.price)} · bills ${deal.type === 'offplan' ? 'the developer' : 'the client'}` : 'Deals from MOU / contract onwards that have no invoice yet'}>
          {(id) => <Select id={id} value={f.dealId ?? ''} onChange={(e) => pickDeal(e.target.value)} placeholder="No deal (manual invoice)" options={dealOptions} />}
        </Field>
        <Field label="Bill to" required className="sm:col-span-2" error={tried ? errors.customerId : undefined} hint={billTo ? `${billTo.type === 'developer' ? 'Developer' : 'Client'} · ${billTo.email}` : undefined}>
          {(id) => <Select id={id} value={f.customerId} onChange={(e) => setF((s) => ({ ...s, customerId: e.target.value }))} placeholder="Select…" options={customerOptions} aria-invalid={tried && !!errors.customerId} />}
        </Field>
        <Field label="Issue date" required error={tried ? errors.issueDate : undefined}>
          {(id) => <Input id={id} type="date" value={f.issueDate} onChange={(e) => setF((s) => ({ ...s, issueDate: e.target.value }))} />}
        </Field>
        <Field label="Due date" required error={tried ? errors.dueDate : undefined}>
          {(id) => <Input id={id} type="date" value={f.dueDate} onChange={(e) => setF((s) => ({ ...s, dueDate: e.target.value }))} aria-invalid={tried && !!errors.dueDate} />}
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13.5px] font-semibold">Line items</h3>
          <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setF((s) => ({ ...s, items: [...s.items, { description: '', qty: 1, unitPrice: 0 }] }))}>
            Add line
          </Button>
        </div>
        <div className="space-y-3">
          {f.items.map((it, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <Textarea aria-label="Description" className="min-h-[60px]" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Sale commission — 2% of AED … · property" />
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="w-20 text-[11.5px] font-semibold text-muted">
                  Qty
                  <Input type="number" min={0} value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} className="mt-1" />
                </label>
                <label className="min-w-[140px] flex-1 text-[11.5px] font-semibold text-muted">
                  Unit price (AED)
                  <Input type="number" min={0} value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) })} className="mt-1" />
                </label>
                <span className="ms-auto pb-2.5 text-[13.5px] font-semibold tabular">{formatMoney(it.qty * it.unitPrice)}</span>
                {f.items.length > 1 && (
                  <Button variant="ghost" size="icon-sm" aria-label="Remove line" className="mb-1" onClick={() => setF((s) => ({ ...s, items: s.items.filter((_, k) => k !== i) }))}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {tried && errors.items && <p className="mt-2 text-[12px] text-danger">{errors.items}</p>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Notes" hint="Printed on the invoice">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => setF((s) => ({ ...s, notes: e.target.value }))} className="min-h-[88px]" />}
        </Field>
        <div className="self-end rounded-xl bg-surface-2/70 p-4 text-[13.5px]">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="tabular">{formatMoney(t.subtotal, { decimals: true })}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-muted">VAT</span>
            <span className="flex items-center gap-2">
              <Select aria-label="VAT rate" value={String(f.taxRate)} onChange={(e) => setF((s) => ({ ...s, taxRate: Number(e.target.value) }))} options={[{ value: '5', label: '5%' }, { value: '0', label: '0%' }]} className="w-[84px]" />
              <span className="tabular">{formatMoney(t.tax, { decimals: true })}</span>
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[15px] font-bold">
            <span>Total</span>
            <span className="tabular">{formatMoney(t.total, { decimals: true })}</span>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
