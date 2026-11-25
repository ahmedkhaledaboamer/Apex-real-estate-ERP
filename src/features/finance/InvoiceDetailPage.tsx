import { Link } from '@tanstack/react-router'
import { Ban, Banknote, FileQuestion, Pencil, Printer, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LogoMark } from '@/components/layout/Logo'
import { PersonCell } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { DetailRow, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { toast } from '@/components/ui/Toast'
import { invoiceTotals } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney } from '@/lib/format'
import { DEAL_STAGE, DEAL_TYPE, PAYMENT_METHOD } from '@/lib/labels'
import { CUSTOMER_TYPE } from '@/lib/labels'
import { communityBySlug, customerById, employeeById } from '@/mocks/core'
import { dealById, invoices, payments } from '@/mocks/domain'
import type { Invoice } from '@/types/domain'
import { InvoiceDrawer } from './InvoiceDrawer'
import { BANK, COMPANY } from './labels'
import { dealProperty, invoiceState, overdueDays } from './lib'
import { BillToBadge, InvoiceStatus } from './parts'
import { RecordPaymentDrawer } from './RecordPaymentDrawer'

export function InvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const { data: list, isLoading } = invoices.useList()
  const { data: allPayments } = payments.useList()
  const update = invoices.useUpdate({ silent: true })
  const [paying, setPaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [voiding, setVoiding] = useState(false)

  const inv = list?.find((i) => i.id === invoiceId)
  const receipts = useMemo(() => (allPayments ?? []).filter((p) => p.invoiceId === invoiceId).sort((a, b) => a.date.localeCompare(b.date)), [allPayments, invoiceId])

  if (isLoading) return <Skeleton className="h-[640px] rounded-card" />
  if (!inv)
    return (
      <Card>
        <EmptyState icon={<FileQuestion />} title="Invoice not found" message="It may have been deleted." action={<ButtonLink to="/finance/invoices">Back to invoices</ButtonLink>} />
      </Card>
    )

  const state = invoiceState(inv)
  const t = invoiceTotals(inv)
  const open = state !== 'void' && state !== 'paid' && state !== 'draft'
  const deal = dealById(inv.dealId)
  const customer = customerById(inv.customerId)
  const broker = employeeById(deal?.agentId)
  const late = overdueDays(inv)

  const setStatus = (patch: Partial<Invoice>, message: string) => update.mutate({ id: inv.id, patch }, { onSuccess: () => toast.success(message) })

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
              {inv.number} <InvoiceStatus invoice={inv} />
            </span>
          }
          description={`${customer?.name ?? '—'} · issued ${formatDate(inv.issueDate)} · due ${formatDate(inv.dueDate)}${late ? ` · ${late} days overdue` : ''}`}
          breadcrumbs={[{ label: 'Finance', to: '/finance' }, { label: 'Invoices', to: '/finance/invoices' }, { label: inv.number }]}
          actions={
            <>
              {open && (
                <Button icon={<Banknote />} onClick={() => setPaying(true)}>
                  Record payment
                </Button>
              )}
              {inv.status === 'draft' && (
                <Button variant="soft" icon={<Send />} onClick={() => setStatus({ status: 'sent' }, `${inv.number} marked as sent`)}>
                  Mark sent
                </Button>
              )}
              {state !== 'void' && state !== 'paid' && (
                <Button variant="outline" icon={<Pencil />} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              <Button variant="outline" icon={<Printer />} onClick={() => window.print()}>
                Print
              </Button>
              {state !== 'void' && inv.paid === 0 && (
                <Button variant="ghost" icon={<Ban />} onClick={() => setVoiding(true)} className="text-danger hover:text-danger">
                  Void
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------------- Printable tax invoice ---------------- */}
        <Card className="relative overflow-hidden print:rounded-none print:border-0 print:shadow-none">
          <div className="h-1.5 bg-brand-gradient [print-color-adjust:exact]" />
          <div className="p-5 sm:p-8 print:p-0 print:pt-6">
            {(state === 'paid' || state === 'void') && (
              <div
                className={cn(
                  'pointer-events-none absolute start-1/2 top-[54%] z-10 -translate-x-1/2 -translate-y-1/2 rotate-[-14deg] rounded-2xl border-[5px] px-8 py-2 text-[44px] font-black tracking-[0.2em] opacity-20 [print-color-adjust:exact] sm:text-[72px] rtl:translate-x-1/2',
                  state === 'paid' ? 'border-success text-success' : 'border-danger text-danger',
                )}
                aria-hidden="true"
              >
                {state === 'paid' ? 'PAID' : 'VOID'}
              </div>
            )}

            {/* Letterhead */}
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-3">
                <LogoMark size={48} className="[print-color-adjust:exact]" />
                <div className="leading-tight">
                  <div className="font-display text-[24px] font-semibold tracking-[0.01em]">Apex Aora</div>
                  <div className="text-[9.5px] font-semibold tracking-[0.3em] text-muted">REAL ESTATE</div>
                </div>
              </div>
              <div className="sm:text-end">
                <div className="text-[22px] font-bold tracking-[0.08em] text-aura uppercase dark:text-[#d6a8e3] print:text-aura">Tax invoice</div>
                <div className="mt-1 text-[13px] font-semibold tabular">{inv.number}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-1 text-[12px] text-muted sm:grid-cols-2">
              <div>
                <div className="font-semibold text-fg">{COMPANY.legalName}</div>
                <div>{COMPANY.address}</div>
                <div>{COMPANY.city}</div>
                <div>
                  {COMPANY.phone} · {COMPANY.email}
                </div>
              </div>
              <div className="sm:text-end">
                <div>
                  TRN <span className="font-semibold text-fg tabular">{COMPANY.trn}</span>
                </div>
                <div>
                  RERA <span className="font-semibold text-fg">{COMPANY.orn}</span>
                </div>
                <div>{COMPANY.licence}</div>
              </div>
            </div>

            {/* Parties + deal */}
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-line p-4 sm:col-span-1">
                <div className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Bill to</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 font-semibold">
                  {customer?.name ?? '—'} <BillToBadge invoice={inv} />
                </div>
                {customer && (
                  <div className="mt-1 space-y-0.5 text-[12.5px] text-muted">
                    <div>{customer.email}</div>
                    <div>{customer.phone}</div>
                    <div>
                      {customer.city} · {CUSTOMER_TYPE[customer.type]}
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-line p-4 sm:col-span-2">
                <div className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Transaction</div>
                {deal ? (
                  <div className="mt-1.5 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
                    <div className="sm:col-span-2 text-[13.5px] font-semibold">{dealProperty(deal).title}</div>
                    <Kv k="Community" v={communityBySlug(deal.communitySlug)?.name ?? '—'} />
                    <Kv k="Deal" v={`${deal.code} · ${DEAL_TYPE[deal.type]}`} />
                    <Kv k={deal.type === 'rent' ? 'Annual rent' : 'Price'} v={formatMoney(deal.price)} />
                    <Kv k="Commission" v={`${deal.commissionRate}% · ${formatMoney(deal.commission)}`} />
                    <Kv k="Closed" v={deal.closedAt ? formatDate(deal.closedAt) : DEAL_STAGE[deal.stage][0]} />
                    {broker && <Kv k="Broker" v={`${broker.name}${broker.brn ? ` · BRN ${broker.brn}` : ''}`} />}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[12.5px] text-muted">Not linked to a deal.</p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
              <Kv k="Invoice date" v={formatDate(inv.issueDate)} block />
              <Kv k="Due date" v={formatDate(inv.dueDate)} block />
              <Kv k="Terms" v={`${Math.max(0, Math.round((new Date(inv.dueDate).getTime() - new Date(inv.issueDate).getTime()) / 86_400_000))} days`} block />
              <Kv k="Currency" v="AED" block />
            </div>

            {/* Items */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="border-b-2 border-line text-[11px] tracking-[0.06em] text-muted uppercase">
                    <th className="py-2 text-start font-semibold">Description</th>
                    <th className="w-14 py-2 text-end font-semibold">Qty</th>
                    <th className="w-32 py-2 text-end font-semibold">Unit price</th>
                    <th className="w-20 py-2 text-end font-semibold">VAT</th>
                    <th className="w-32 py-2 text-end font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((it, i) => (
                    <tr key={i} className="border-b border-line/70 align-top">
                      <td className="py-3 pe-4">{it.description}</td>
                      <td className="py-3 text-end tabular">{it.qty}</td>
                      <td className="py-3 text-end tabular">{formatMoney(it.unitPrice, { decimals: true })}</td>
                      <td className="py-3 text-end tabular">{inv.taxRate}%</td>
                      <td className="py-3 text-end font-medium tabular">{formatMoney(it.qty * it.unitPrice, { decimals: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-sm rounded-xl bg-surface-2/70 p-4 text-[12px] [print-color-adjust:exact]">
                <div className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Pay by bank transfer</div>
                <div className="mt-1.5 space-y-0.5">
                  <div className="font-semibold">{BANK.accountName}</div>
                  <div>
                    {BANK.bank} · {BANK.branch}
                  </div>
                  <div className="tabular">IBAN {BANK.iban}</div>
                  <div>SWIFT {BANK.swift}</div>
                  <div className="text-muted">Please quote {inv.number} as the payment reference.</div>
                </div>
              </div>
              <div className="w-full text-[13px] sm:w-[300px]">
                <Line k="Subtotal" v={formatMoney(t.subtotal, { decimals: true })} />
                <Line k={`VAT ${inv.taxRate}%`} v={formatMoney(t.tax, { decimals: true })} />
                <Line k="Total (AED)" v={formatMoney(t.total, { decimals: true })} strong />
                <Line k="Amount paid" v={inv.paid ? `− ${formatMoney(inv.paid, { decimals: true })}` : formatMoney(0, { decimals: true })} />
                <div className="mt-1 flex items-center justify-between rounded-lg bg-aura/10 px-3 py-2 text-[14.5px] font-bold text-aura [print-color-adjust:exact] dark:text-[#d6a8e3] print:text-aura">
                  <span>Balance due</span>
                  <span className="tabular">{formatMoney(state === 'void' ? 0 : t.balance, { decimals: true })}</span>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="mt-7">
              <div className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Payment history</div>
              {receipts.length ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[460px] text-[12.5px]">
                    <tbody>
                      {receipts.map((p) => (
                        <tr key={p.id} className="border-b border-line/70 last:border-0">
                          <td className="py-2 font-semibold">{p.number}</td>
                          <td className="py-2 text-muted">{formatDate(p.date)}</td>
                          <td className="py-2 text-muted">{PAYMENT_METHOD[p.method]}</td>
                          <td className="py-2 text-muted">Ref {p.reference}</td>
                          <td className="py-2 text-end font-semibold tabular">{formatMoney(p.amount, { decimals: true })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-1.5 text-[12.5px] text-muted">No payments received yet.</p>
              )}
            </div>

            {inv.notes && <p className="mt-5 rounded-xl border border-line p-3 text-[12.5px] text-muted">{inv.notes}</p>}

            <div className="mt-8 border-t border-line pt-4 text-center text-[11px] leading-relaxed text-muted">
              {COMPANY.legalName} · Licensed real estate broker regulated by the Real Estate Regulatory Agency (RERA), Dubai Land Department · {COMPANY.orn} · TRN {COMPANY.trn}
              <br />
              Commission is earned on completion of the transaction per the signed agreement (Form A / Form B / developer agency agreement). This is a computer-generated tax invoice.
            </div>
          </div>
        </Card>

        {/* ---------------- Side panel ---------------- */}
        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader title="Collection" />
            <CardBody className="pt-3">
              <div className="flex items-end justify-between gap-3">
                <span className="text-[24px] font-bold tabular">{formatMoney(state === 'void' ? 0 : t.balance)}</span>
                <span className="pb-1 text-[12px] text-muted">balance due</span>
              </div>
              <Progress value={t.total ? (inv.paid / t.total) * 100 : 0} tone={state === 'paid' ? 'success' : state === 'overdue' ? 'danger' : 'brand'} className="mt-3" />
              <div className="mt-2 flex justify-between text-[12px] text-muted">
                <span>Paid {formatMoney(inv.paid)}</span>
                <span>of {formatMoney(t.total)}</span>
              </div>
              {open && (
                <Button className="mt-4 w-full" icon={<Banknote />} onClick={() => setPaying(true)}>
                  Record payment
                </Button>
              )}
            </CardBody>
          </Card>
          {deal && (
            <Card>
              <CardHeader
                title="Deal"
                actions={
                  <Link to="/sales/deals/$dealId" params={{ dealId: deal.id }} className="text-[12.5px] font-semibold text-aura hover:underline dark:text-[#d6a8e3]">
                    Open deal
                  </Link>
                }
              />
              <CardBody className="divide-y divide-line pt-2">
                <DetailRow label="Deal">{deal.code}</DetailRow>
                <DetailRow label="Stage">{DEAL_STAGE[deal.stage][0]}</DetailRow>
                <DetailRow label="Commission">{formatMoney(deal.commission)}</DetailRow>
                <DetailRow label="Collected (excl. VAT)">
                  <span className={cn(deal.collected >= deal.commission && 'text-success')}>{formatMoney(deal.collected)}</span>
                </DetailRow>
                <DetailRow label={`Broker share (${deal.agentSplit}%)`}>{formatMoney(Math.round((deal.commission * deal.agentSplit) / 100))}</DetailRow>
                {broker && (
                  <div className="pt-3">
                    <PersonCell name={broker.name} photo={broker.photo} hue={broker.avatarHue} sub={broker.title} />
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <RecordPaymentDrawer open={paying} onClose={() => setPaying(false)} invoice={inv} />
      <InvoiceDrawer open={editing} onClose={() => setEditing(false)} invoice={inv} />
      <ConfirmDialog
        open={voiding}
        onClose={() => setVoiding(false)}
        title={`Void ${inv.number}?`}
        message="The invoice stays on record for the audit trail but no longer counts as a receivable."
        confirmLabel="Void invoice"
        loading={update.isPending}
        onConfirm={() => update.mutate({ id: inv.id, patch: { status: 'void' } }, { onSuccess: () => (setVoiding(false), toast.success(`${inv.number} voided`)) })}
      />
    </div>
  )
}

function Kv({ k, v, block }: { k: string; v: string; block?: boolean }) {
  return block ? (
    <div className="rounded-lg bg-surface-2/60 px-3 py-2 [print-color-adjust:exact]">
      <div className="text-[11px] text-muted">{k}</div>
      <div className="font-semibold">{v}</div>
    </div>
  ) : (
    <div className="flex justify-between gap-3 sm:block">
      <span className="text-muted">{k}: </span>
      <span className="font-medium">{v}</span>
    </div>
  )
}
function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3 py-1.5', strong && 'mt-1 border-t border-line pt-2 text-[14px] font-bold')}>
      <span className={strong ? '' : 'text-muted'}>{k}</span>
      <span className="tabular">{v}</span>
    </div>
  )
}
