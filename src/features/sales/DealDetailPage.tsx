import { Link } from '@tanstack/react-router'
import { ArrowRight, Ban, Check, CheckCircle2, CircleDot, FileText, Handshake, Pencil, Receipt, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DetailRow, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { dealProperty } from '@/features/dashboard/DashboardPage'
import { dealCollectionState, invoiceTotals, pricePerSqft, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { DEAL_FLOW, DEAL_STAGE, DEAL_TYPE, INVOICE_STATUS, LEAD_SOURCE, LISTING_STATUS, PAYMENT_METHOD } from '@/lib/labels'
import { communityBySlug, customerById, employeeById } from '@/mocks/core'
import { agencyShare, brokerShare, deals, invoices, listingById, offplanById, payments } from '@/mocks/domain'
import { dealChecklist, dealDocs } from '@/mocks/sales'
import type { Customer } from '@/types/core'
import type { Deal } from '@/types/domain'
import { CloseDealModal } from './DealsPage'
import { DealDrawer } from './DealDrawer'
import { COLLECTION_STATE, CUSTOMER_TYPE_TONE } from './labels'
import { MiniStat } from './shared'
import { useDealDocsWriter, useDealStage } from './useDealActions'

export function DealDetailPage({ dealId }: { dealId: string }) {
  const { data: all, isLoading } = deals.useList()
  const deal = all?.find((d) => d.id === dealId)
  if (isLoading) return <Skeleton className="h-[480px] rounded-card" />
  if (!deal)
    return (
      <Card>
        <EmptyState
          icon={<SearchX />}
          title="Deal not found"
          message="It may have been removed."
          action={
            <ButtonLink to="/sales/deals" variant="outline">
              Back to deals
            </ButtonLink>
          }
        />
      </Card>
    )
  return <DealDetail deal={deal} />
}

function DealDetail({ deal }: { deal: Deal }) {
  const { move, pending } = useDealStage()
  const writeDocs = useDealDocsWriter()
  const { data: docs = [] } = dealDocs.useList()
  const { data: invs = [] } = invoices.useList()
  const { data: pays = [] } = payments.useList()
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [closing, setClosing] = useState(false)

  const prop = dealProperty(deal)
  const listing = listingById(deal.listingId)
  const project = offplanById(deal.projectId)
  const record = docs.find((d) => d.id === deal.id)
  const checklist = dealChecklist(deal, record)
  const flow = DEAL_FLOW[deal.type]
  const idx = flow.indexOf(deal.stage)
  const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1]! : null
  const live = deal.stage !== 'closed' && deal.stage !== 'cancelled'

  const dealInvoices = invs.filter((i) => i.dealId === deal.id)
  const dealPayments = pays.filter((p) => p.dealId === deal.id)
  const outstanding = Math.max(0, deal.commission - deal.collected)
  const vat = Math.round(deal.commission * 0.05)

  const timeline = useMemo(() => {
    const ev: { at: string; text: string; tone: 'brand' | 'success' | 'info' | 'danger'; by?: string }[] = [{ at: deal.createdAt, text: `Deal opened from ${LEAD_SOURCE[deal.source]}`, tone: 'brand' }]
    for (const l of record?.log ?? []) ev.push({ at: l.at, text: l.text, tone: l.text.includes('cancel') ? 'danger' : l.text.includes('Closed') ? 'success' : 'info', by: employeeById(l.byId)?.name })
    for (const i of dealInvoices) ev.push({ at: i.issueDate, text: `Invoice ${i.number} issued · ${formatMoney(invoiceTotals(i).total)}`, tone: 'info' })
    for (const p of dealPayments) ev.push({ at: p.date, text: `Payment ${p.number} received · ${formatMoney(p.amount)} (${PAYMENT_METHOD[p.method]})`, tone: 'success' })
    if (deal.closedAt && !(record?.log ?? []).some((l) => l.text.includes('Closed'))) ev.push({ at: deal.closedAt, text: 'Deal closed', tone: 'success' })
    return ev.sort((a, b) => b.at.localeCompare(a.at))
  }, [deal, record, dealInvoices, dealPayments])

  const advance = () => {
    if (!next) return
    if (next === 'closed') setClosing(true)
    else move(deal, next)
  }

  const toggleDoc = (key: string) => {
    const items = checklist.map((i) => (i.key === key ? { ...i, done: !i.done, doneAt: i.done ? null : new Date().toISOString() } : i))
    const it = items.find((i) => i.key === key)!
    void writeDocs(deal, { items, log: it.done ? `Document received: ${it.label}` : `Document reopened: ${it.label}` })
  }
  const docsDone = checklist.filter((i) => i.done).length

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {deal.code}
            <StatusBadge value={deal.stage} map={DEAL_STAGE} />
          </span>
        }
        description={`${DEAL_TYPE[deal.type]} · opened ${formatDate(deal.createdAt)}`}
        breadcrumbs={[{ label: 'Sales' }, { label: 'Deals', to: '/sales/deals' }, { label: deal.code }]}
        actions={
          <>
            <Button variant="outline" icon={<Pencil />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            {live && (
              <Button variant="outline" icon={<Ban />} onClick={() => setCancelling(true)} className="text-danger">
                Cancel deal
              </Button>
            )}
          </>
        }
      />

      {/* Hero + stage strip */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,320px)_1fr]">
          <div className="relative h-48 bg-surface-2 md:h-full md:min-h-[220px]">
            {prop.image && <img src={prop.image} alt="" className="absolute inset-0 size-full object-cover" />}
            <Badge tone={deal.type === 'sale' ? 'brand' : deal.type === 'rent' ? 'info' : 'warning'} className="absolute start-3 top-3 bg-surface/90 backdrop-blur">
              {DEAL_TYPE[deal.type]}
            </Badge>
          </div>
          <div className="min-w-0 space-y-5 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-[19px] font-bold tracking-[-0.01em]">{prop.title}</h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  {prop.sub}
                  {listing && ` · ${listing.building} · ${listing.beds ? `${listing.beds} BR` : listing.propertyType} · ${formatNumber(listing.sqft)} sq ft · ${listing.ref}`}
                  {project && ` · ${project.plan} payment plan · handover ${project.handover}`}
                </p>
              </div>
              <div className="text-end">
                <p className="text-[12px] text-muted">{deal.type === 'rent' ? 'Annual rent' : 'Price'}</p>
                <p className="text-[22px] font-bold tracking-[-0.02em] tabular">{formatMoney(deal.price)}</p>
              </div>
            </div>

            <StageStrip deal={deal} />

            <div className="flex flex-wrap items-center gap-3">
              {live && next && (
                <Button onClick={advance} loading={pending} icon={next === 'closed' ? <Handshake /> : <ArrowRight className="rtl:rotate-180" />}>
                  {next === 'closed' ? 'Close deal' : `Advance to ${DEAL_STAGE[next][0]}`}
                </Button>
              )}
              {deal.stage === 'closed' && (
                <p className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-success">
                  <CheckCircle2 className="size-4" /> Closed {deal.closedAt && formatDate(deal.closedAt)}
                </p>
              )}
              {deal.stage === 'cancelled' && (
                <Button variant="outline" onClick={() => move(deal, 'offer')}>
                  Reopen deal
                </Button>
              )}
              <p className="text-[12.5px] text-muted">
                Expected close <span className="font-semibold text-fg tabular">{formatDate(deal.expectedCloseDate)}</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          {/* Financials */}
          <Card>
            <CardHeader title="Commission" subtitle={`${deal.commissionRate}% of ${formatMoney(deal.price)}${deal.type === 'offplan' ? ' · paid by the developer' : ''}`} actions={<StatusBadge value={dealCollectionState(deal)} map={COLLECTION_STATE} />} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniStat label="Commission (GCI)" value={formatMoney(deal.commission)} />
                <MiniStat label="Broker share" value={formatMoney(brokerShare(deal))} />
                <MiniStat label="Agency share" value={formatMoney(agencyShare(deal))} />
                <MiniStat label="Outstanding" value={formatMoney(outstanding)} tone={outstanding > 0 ? 'warning' : 'success'} />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="text-muted">Collected {formatMoney(deal.collected)}</span>
                  <span className="font-semibold tabular">{deal.commission ? Math.round((deal.collected / deal.commission) * 100) : 0}%</span>
                </div>
                <Progress value={deal.commission ? (deal.collected / deal.commission) * 100 : 0} tone={outstanding ? 'brand' : 'success'} />
              </div>
              <div className="grid gap-x-8 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                <div className="divide-y divide-line">
                  <DetailRow label={deal.type === 'rent' ? 'Annual rent' : 'Price'}>{formatMoney(deal.price)}</DetailRow>
                  {listing && <DetailRow label="AED / sq ft">{formatNumber(pricePerSqft(deal.price, listing.sqft))}</DetailRow>}
                  {listing && <DetailRow label="Asking price">{formatMoney(listing.price)}</DetailRow>}
                  <DetailRow label="Commission rate">{deal.commissionRate}%</DetailRow>
                </div>
                <div className="divide-y divide-line">
                  <DetailRow label="VAT (5%)">{formatMoney(vat)}</DetailRow>
                  <DetailRow label="Invoice total">{formatMoney(deal.commission + vat)}</DetailRow>
                  <DetailRow label="Broker split">{deal.agentSplit}%</DetailRow>
                  <DetailRow label="Source">{LEAD_SOURCE[deal.source]}</DetailRow>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader title="Documents" subtitle={`${docsDone} of ${checklist.length} collected`} actions={<span className="w-24"><Progress value={(docsDone / checklist.length) * 100} tone={docsDone === checklist.length ? 'success' : 'brand'} /></span>} />
            <CardBody className="pt-3">
              <ul className="grid gap-1 sm:grid-cols-2">
                {checklist.map((it) => (
                  <li key={it.key}>
                    <button type="button" onClick={() => toggleDoc(it.key)} className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-start transition-colors hover:bg-surface-2" aria-pressed={it.done}>
                      <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors', it.done ? 'border-success bg-success text-white' : 'border-line bg-surface')}>{it.done && <Check className="size-3.5" />}</span>
                      <span className="min-w-0">
                        <span className={cn('block text-[13.5px] font-medium', it.done && 'text-muted line-through decoration-muted/50')}>{it.label}</span>
                        {it.doneAt && <span className="block text-[11.5px] text-muted">{formatDate(it.doneAt)}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Invoices & payments */}
          <Card className="overflow-hidden">
            <CardHeader title="Invoices & payments" subtitle={`${dealInvoices.length} invoice${dealInvoices.length === 1 ? '' : 's'} · ${formatMoney(sum(dealPayments, (p) => p.amount))} received`} />
            <CardBody className="pt-3">
              {dealInvoices.length === 0 && dealPayments.length === 0 ? (
                <EmptyState icon={<Receipt />} title="Not invoiced yet" message="Commission is invoiced once the MOU / tenancy contract is signed." className="py-8" />
              ) : (
                <ul className="divide-y divide-line">
                  {dealInvoices.map((i) => {
                    const t = invoiceTotals(i)
                    return (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-aura/10 text-aura dark:text-[#d6a8e3]">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold">{i.number}</p>
                          <p className="truncate text-[12px] text-muted">
                            {customerById(i.customerId)?.name} · due {formatDate(i.dueDate)}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="text-[13.5px] font-semibold tabular">{formatMoney(t.total)}</p>
                          {t.balance > 0 && <p className="text-[11.5px] text-muted tabular">{formatMoney(t.balance)} due</p>}
                        </div>
                        <StatusBadge value={i.status} map={INVOICE_STATUS} />
                      </li>
                    )
                  })}
                  {dealPayments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                        <Receipt className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold">{p.number}</p>
                        <p className="truncate text-[12px] text-muted">
                          {formatDate(p.date)} · {PAYMENT_METHOD[p.method]} · {p.reference}
                        </p>
                      </div>
                      <p className="text-[13.5px] font-semibold text-success tabular">+{formatMoney(p.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Parties" />
            <CardBody className="space-y-4 pt-4">
              <Party label={deal.type === 'rent' ? 'Tenant' : 'Buyer'} customer={customerById(deal.clientId)} />
              <Party label={deal.type === 'offplan' ? 'Developer' : deal.type === 'rent' ? 'Landlord' : 'Seller'} customer={customerById(deal.counterpartyId)} />
              {(() => {
                const b = employeeById(deal.agentId)
                return (
                  b && (
                    <div>
                      <p className="mb-1.5 text-[11.5px] font-semibold tracking-[0.04em] text-muted uppercase">Broker</p>
                      <PersonCell name={b.name} hue={b.avatarHue} photo={b.photo} sub={`${b.title}${b.brn ? ` · BRN ${b.brn}` : ''}`} size={40} />
                    </div>
                  )
                )
              })()}
              {listing && (
                <div className="border-t border-line pt-3 text-[12.5px] text-muted">
                  Listing {listing.ref} · <StatusBadge value={listing.status} map={LISTING_STATUS} /> · permit {listing.permit}
                </div>
              )}
              {project && (
                <div className="border-t border-line pt-3 text-[12.5px] text-muted">
                  {project.name} · {communityBySlug(project.communitySlug)?.name} · {project.allocated} units allocated
                </div>
              )}
            </CardBody>
          </Card>

          {deal.notes && (
            <Card>
              <CardHeader title="Notes" />
              <CardBody className="pt-3 text-[13.5px] whitespace-pre-line text-muted">{deal.notes}</CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Timeline" />
            <CardBody className="pt-4">
              <ol className="relative space-y-4 border-s border-line ps-5">
                {timeline.map((e, i) => (
                  <li key={i} className="relative">
                    <span className={cn('absolute -start-[27px] top-0.5 grid size-[13px] place-items-center rounded-full ring-4 ring-surface', e.tone === 'success' ? 'bg-success' : e.tone === 'danger' ? 'bg-danger' : e.tone === 'info' ? 'bg-info' : 'bg-aura')} />
                    <p className="text-[13px] font-medium">{e.text}</p>
                    <p className="text-[11.5px] text-muted">
                      {e.at.length > 10 ? formatDateTime(e.at) : formatDate(e.at)}
                      {e.by && ` · ${e.by}`}
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <DealDrawer open={editing} onClose={() => setEditing(false)} deal={deal} />
      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        title={`Cancel ${deal.code}?`}
        message="The deal leaves the pipeline and its listing becomes available again. You can reopen it later."
        confirmLabel="Cancel deal"
        onConfirm={() => {
          move(deal, 'cancelled')
          setCancelling(false)
        }}
      />
      <CloseDealModal
        deal={closing ? deal : null}
        onClose={() => setClosing(false)}
        onConfirm={() => {
          move(deal, 'closed')
          setClosing(false)
        }}
      />
    </div>
  )
}

function StageStrip({ deal }: { deal: Deal }) {
  const flow = DEAL_FLOW[deal.type]
  const idx = deal.stage === 'cancelled' ? -1 : flow.indexOf(deal.stage)
  return (
    <ol className="flex gap-1.5" aria-label="Deal progress">
      {flow.map((s, i) => {
        const done = i < idx || deal.stage === 'closed'
        const current = i === idx && deal.stage !== 'closed'
        return (
          <li key={s} className="min-w-0 flex-1">
            <div className={cn('h-1.5 rounded-full', done ? 'bg-success' : current ? 'bg-brand-gradient' : 'bg-surface-2', deal.stage === 'cancelled' && 'bg-danger/20')} />
            <p className={cn('mt-1.5 flex items-center gap-1 truncate text-[11.5px] font-semibold', current ? 'text-fg' : done ? 'text-success' : 'text-muted')}>
              {done ? <Check className="size-3.5 shrink-0" /> : current ? <CircleDot className="size-3.5 shrink-0 text-aura" /> : null}
              <span className="truncate">{DEAL_STAGE[s][0]}</span>
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function Party({ label, customer }: { label: string; customer: Customer | undefined }) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-semibold tracking-[0.04em] text-muted uppercase">{label}</p>
      {customer ? (
        <Link to="/sales/clients/$clientId" params={{ clientId: customer.id }} className="-m-1.5 flex items-center justify-between gap-2 rounded-xl p-1.5 transition-colors hover:bg-surface-2">
          <PersonCell name={customer.name} hue={customer.avatarHue} sub={`${customer.phone} · ${customer.email}`} size={40} />
          <StatusBadge value={customer.type} map={CUSTOMER_TYPE_TONE} />
        </Link>
      ) : (
        <p className="text-[13px] text-muted">—</p>
      )}
    </div>
  )
}
