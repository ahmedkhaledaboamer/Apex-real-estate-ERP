import { Link, useNavigate } from '@tanstack/react-router'
import { BadgeDollarSign, Building2, CalendarDays, FileWarning, Handshake, Mail, MessageSquare, Pencil, Phone, Plus, SearchX, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select, Textarea } from '@/components/ui/Form'
import { DetailRow, EmptyState, PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { dealProperty } from '@/features/dashboard/DashboardPage'
import { invoiceTotals, sum } from '@/lib/calc'
import { formatDate, formatMoney, formatMoneyCompact, formatRelative } from '@/lib/format'
import { DEAL_STAGE, DEAL_TYPE, INVOICE_STATUS, LISTING_PURPOSE, LISTING_STATUS, PAYMENT_METHOD, VIEWING_STATUS, optionsOf } from '@/lib/labels'
import { CURRENT_USER_ID, communityBySlug, customers, developerBySlug, employeeById } from '@/mocks/core'
import { deals, invoices, listings, payments, viewings } from '@/mocks/domain'
import { clientNotes } from '@/mocks/sales'
import type { Customer } from '@/types/core'
import type { Deal, Invoice, Listing, Payment, Viewing } from '@/types/domain'
import type { ClientNoteKind } from '@/types/sales'
import { ClientDrawer } from './ClientDrawer'
import { DealDrawer } from './DealDrawer'
import { CUSTOMER_TYPE_TONE, NOTE_KIND } from './labels'
import { fmtDay, fmtTime, PropertyThumb, Stars } from './shared'

type Tab = 'deals' | 'properties' | 'viewings' | 'finance' | 'notes'

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const { data: all, isLoading } = customers.useList()
  const client = all?.find((c) => c.id === clientId)
  if (isLoading) return <Skeleton className="h-[480px] rounded-card" />
  if (!client)
    return (
      <Card>
        <EmptyState
          icon={<SearchX />}
          title="Client not found"
          action={
            <ButtonLink to="/sales/clients" variant="outline">
              Back to clients
            </ButtonLink>
          }
        />
      </Card>
    )
  return <ClientDetail client={client} />
}

function ClientDetail({ client }: { client: Customer }) {
  const navigate = useNavigate()
  const { data: dls = [] } = deals.useList()
  const { data: lst = [] } = listings.useList()
  const { data: vws = [] } = viewings.useList()
  const { data: invs = [] } = invoices.useList()
  const { data: pays = [] } = payments.useList()
  const [tab, setTab] = useState<Tab>('deals')
  const [editing, setEditing] = useState(false)
  const [newDeal, setNewDeal] = useState(false)

  const clientDeals = useMemo(() => dls.filter((d) => d.clientId === client.id || d.counterpartyId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [dls, client.id])
  const owned = useMemo(() => lst.filter((l) => l.ownerId === client.id), [lst, client.id])
  const clientViewings = useMemo(() => vws.filter((v) => v.clientId === client.id).sort((a, b) => b.at.localeCompare(a.at)), [vws, client.id])
  const clientInvoices = useMemo(() => invs.filter((i) => i.customerId === client.id), [invs, client.id])
  const clientPayments = useMemo(() => pays.filter((p) => p.customerId === client.id), [pays, client.id])
  const gci = sum(clientDeals.filter((d) => d.stage === 'closed'), (d) => d.commission)
  const openInvoices = clientInvoices.filter((i) => i.status !== 'paid' && i.status !== 'void')
  const outstanding = sum(openInvoices, (i) => invoiceTotals(i).balance)
  const owner = employeeById(client.ownerId)
  const dev = developerBySlug(client.developerSlug)
  const dealInitial = useMemo(() => ({ type: client.type === 'tenant' ? ('rent' as const) : ('sale' as const), clientId: client.id }), [client.type, client.id])
  const canBuy = client.type === 'buyer' || client.type === 'tenant' || client.type === 'investor'

  const { data: notes = [] } = clientNotes.useList()
  const myNotes = notes.filter((n) => n.customerId === client.id)

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={`${client.code} · client since ${formatDate(client.createdAt)}`}
        breadcrumbs={[{ label: 'Sales' }, { label: 'Clients', to: '/sales/clients' }, { label: client.name }]}
        actions={
          <>
            <Button variant="outline" icon={<Pencil />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            {canBuy && (
              <Button icon={<Plus />} onClick={() => setNewDeal(true)}>
                New deal
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardBody className="space-y-5">
            <div className="flex items-center gap-4">
              {dev?.image ? <img src={dev.image} alt="" className="size-16 shrink-0 rounded-2xl object-cover" /> : <Avatar name={client.name} hue={client.avatarHue} size={64} />}
              <div className="min-w-0">
                <p className="truncate text-[17px] font-bold">{client.name}</p>
                <div className="mt-1">
                  <StatusBadge value={client.type} map={CUSTOMER_TYPE_TONE} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-semibold hover:bg-surface-2">
                <Phone className="size-4" /> Call
              </a>
              <a href={`mailto:${client.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-semibold hover:bg-surface-2">
                <Mail className="size-4" /> Email
              </a>
              <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-semibold hover:bg-surface-2">
                <MessageSquare className="size-4" /> WhatsApp
              </a>
            </div>
            <div className="divide-y divide-line">
              <DetailRow label="Email">
                <span className="break-all">{client.email}</span>
              </DetailRow>
              <DetailRow label="Phone">{client.phone}</DetailRow>
              <DetailRow label="Nationality">{client.nationality}</DetailRow>
              <DetailRow label="City">{client.city}</DetailRow>
              {dev && <DetailRow label="Developer">{dev.name}</DetailRow>}
            </div>
            {owner && (
              <div className="rounded-xl bg-surface-2/70 p-3">
                <PersonCell name={owner.name} hue={owner.avatarHue} photo={owner.photo} sub={`${client.type === 'developer' ? 'Account manager' : 'Owner broker'} · ${owner.title}`} size={36} />
              </div>
            )}
            {client.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map((t) => (
                  <Badge key={t} tone="brand">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Deals" value={clientDeals.filter((d) => d.stage !== 'cancelled').length} icon={<Handshake />} footnote={`${clientDeals.filter((d) => d.stage === 'closed').length} closed`} />
            <StatCard label="GCI generated" value={formatMoneyCompact(gci)} icon={<BadgeDollarSign />} tone="success" footnote="Closed deals, all time" />
            <StatCard label="Outstanding invoices" value={formatMoneyCompact(outstanding)} icon={<FileWarning />} tone={outstanding ? 'warning' : 'success'} footnote={`${openInvoices.length} open invoice${openInvoices.length === 1 ? '' : 's'}`} />
            <StatCard label="Properties owned" value={owned.length} icon={<Building2 />} tone="royal" footnote={owned.length ? `${owned.filter((l) => l.status === 'active').length} active listings` : 'No listings with us'} />
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'deals', label: 'Deals', count: clientDeals.length },
              { value: 'properties', label: 'Properties', count: owned.length },
              { value: 'viewings', label: 'Viewings', count: clientViewings.length },
              { value: 'finance', label: 'Invoices & payments', count: clientInvoices.length },
              { value: 'notes', label: 'Notes', count: myNotes.length },
            ]}
          />

          {tab === 'deals' && <DealsTab client={client} rows={clientDeals} onOpen={(d) => navigate({ to: '/sales/deals/$dealId', params: { dealId: d.id } })} />}
          {tab === 'properties' && <PropertiesTab rows={owned} />}
          {tab === 'viewings' && <ViewingsTab rows={clientViewings} />}
          {tab === 'finance' && <FinanceTab invoices={clientInvoices} payments={clientPayments} />}
          {tab === 'notes' && <NotesTab clientId={client.id} />}
        </div>
      </div>

      <ClientDrawer open={editing} onClose={() => setEditing(false)} client={client} />
      <DealDrawer open={newDeal} onClose={() => setNewDeal(false)} initial={dealInitial} onCreated={(d) => navigate({ to: '/sales/deals/$dealId', params: { dealId: d.id } })} />
    </div>
  )
}

function DealsTab({ client, rows, onOpen }: { client: Customer; rows: Deal[]; onOpen: (d: Deal) => void }) {
  const columns: Column<Deal>[] = [
    { key: 'code', header: 'Deal', sort: (d) => d.code, cell: (d) => <span className="font-semibold text-aura dark:text-[#d6a8e3]">{d.code}</span> },
    {
      key: 'property',
      header: 'Property',
      sort: (d) => dealProperty(d).title,
      cell: (d) => {
        const p = dealProperty(d)
        return (
          <div className="flex max-w-[240px] min-w-0 items-center gap-2.5">
            <PropertyThumb image={p.image} size={36} rounded="rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-medium">{p.title}</p>
              <p className="truncate text-[12px] text-muted">{DEAL_TYPE[d.type]}</p>
            </div>
          </div>
        )
      },
    },
    { key: 'role', header: 'Role', hideBelow: 'md', sort: (d) => (d.clientId === client.id ? 0 : 1), cell: (d) => <Badge tone={d.clientId === client.id ? 'brand' : 'neutral'}>{d.clientId === client.id ? (d.type === 'rent' ? 'Tenant' : 'Buyer') : d.type === 'offplan' ? 'Developer' : d.type === 'rent' ? 'Landlord' : 'Seller'}</Badge> },
    { key: 'price', header: 'Price', align: 'end', sort: (d) => d.price, cell: (d) => <span className="tabular">{formatMoneyCompact(d.price)}</span> },
    { key: 'gci', header: 'GCI', align: 'end', hideBelow: 'sm', sort: (d) => d.commission, cell: (d) => <span className="tabular">{formatMoney(d.commission)}</span> },
    { key: 'stage', header: 'Stage', sort: (d) => d.stage, cell: (d) => <StatusBadge value={d.stage} map={DEAL_STAGE} /> },
  ]
  return <DataTable rows={rows} columns={columns} onRowClick={onOpen} initialSort={{ key: 'code', dir: 'desc' }} empty={<EmptyState icon={<Handshake />} title="No deals yet" />} />
}

function PropertiesTab({ rows }: { rows: Listing[] }) {
  if (rows.length === 0)
    return (
      <Card>
        <EmptyState icon={<Building2 />} title="No properties listed" message="Sellers' and landlords' units listed with Apex Aora appear here." />
      </Card>
    )
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {rows.map((l) => (
        <Card key={l.id} className="overflow-hidden">
          <div className="relative h-36 bg-surface-2">
            {l.images[0] && <img src={l.images[0]} alt="" loading="lazy" className="size-full object-cover" />}
            <span className="absolute start-2.5 top-2.5">
              <StatusBadge value={l.status} map={LISTING_STATUS} />
            </span>
          </div>
          <div className="space-y-1 p-4">
            <p className="truncate text-[14px] font-semibold">{l.title}</p>
            <p className="truncate text-[12.5px] text-muted">
              {communityBySlug(l.communitySlug)?.name} · {l.beds ? `${l.beds} BR` : l.propertyType} · {l.sqft.toLocaleString('en-US')} sq ft
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[14px] font-bold tabular">
                {formatMoney(l.price)}
                {l.purpose === 'rent' && <span className="text-[12px] font-normal text-muted"> /yr</span>}
              </span>
              <span className="text-[12px] text-muted">
                {LISTING_PURPOSE[l.purpose]} · {l.ref}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function ViewingsTab({ rows }: { rows: Viewing[] }) {
  if (rows.length === 0)
    return (
      <Card>
        <EmptyState icon={<CalendarDays />} title="No viewings" action={<ButtonLink to="/sales/viewings" search={{ new: 1 } as never} variant="outline">Schedule viewing</ButtonLink>} />
      </Card>
    )
  return (
    <Card className="divide-y divide-line">
      {rows.map((v) => {
        const p = dealProperty({ listingId: v.listingId, projectId: v.projectId, communitySlug: '' })
        const b = employeeById(v.agentId)
        return (
          <div key={v.id} className="flex items-center gap-3 p-3 sm:px-4">
            <PropertyThumb image={p.image} size={44} rounded="rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold">{p.title}</p>
              <p className="truncate text-[12px] text-muted">
                {fmtDay(v.at)} · {fmtTime(v.at)}
                {v.feedback && ` · “${v.feedback}”`}
              </p>
              {v.interest && <Stars value={v.interest} size={12} />}
            </div>
            {b && <Avatar name={b.name} hue={b.avatarHue} photo={b.photo} size={26} />}
            <StatusBadge value={v.status} map={VIEWING_STATUS} />
          </div>
        )
      })}
    </Card>
  )
}

function FinanceTab({ invoices: invs, payments: pays }: { invoices: Invoice[]; payments: Payment[] }) {
  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice', sort: (i) => i.number, cell: (i) => <span className="font-semibold">{i.number}</span> },
    { key: 'issue', header: 'Issued', hideBelow: 'sm', sort: (i) => i.issueDate, cell: (i) => <span className="text-muted">{formatDate(i.issueDate)}</span> },
    { key: 'due', header: 'Due', hideBelow: 'md', sort: (i) => i.dueDate, cell: (i) => <span className="text-muted">{formatDate(i.dueDate)}</span> },
    { key: 'total', header: 'Total', align: 'end', sort: (i) => invoiceTotals(i).total, cell: (i) => <span className="tabular">{formatMoney(invoiceTotals(i).total)}</span> },
    { key: 'balance', header: 'Balance', align: 'end', hideBelow: 'sm', sort: (i) => invoiceTotals(i).balance, cell: (i) => <span className="font-semibold tabular">{formatMoney(invoiceTotals(i).balance)}</span> },
    { key: 'status', header: 'Status', sort: (i) => i.status, cell: (i) => <StatusBadge value={i.status} map={INVOICE_STATUS} /> },
  ]
  return (
    <div className="space-y-4">
      <DataTable rows={invs} columns={columns} initialSort={{ key: 'issue', dir: 'desc' }} empty={<EmptyState title="No invoices" />} pageSize={6} />
      <Card>
        <div className="flex items-center justify-between px-5 pt-4">
          <h3 className="text-[15px] font-semibold">Payments received</h3>
          <span className="text-[13px] font-semibold text-success tabular">{formatMoney(sum(pays, (p) => p.amount))}</span>
        </div>
        {pays.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-line px-5 pb-2">
            {[...pays]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold">{p.number}</p>
                    <p className="truncate text-[12px] text-muted">
                      {formatDate(p.date)} · {PAYMENT_METHOD[p.method]} · {p.reference}
                      {p.dealId && (
                        <>
                          {' · '}
                          <Link to="/sales/deals/$dealId" params={{ dealId: p.dealId }} className="text-aura hover:underline dark:text-[#d6a8e3]">
                            deal
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-[13.5px] font-semibold text-success tabular">+{formatMoney(p.amount)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function NotesTab({ clientId }: { clientId: string }) {
  const { data: notes = [] } = clientNotes.useList()
  const create = clientNotes.useCreate()
  const remove = clientNotes.useRemove()
  const [text, setText] = useState('')
  const [kind, setKind] = useState<ClientNoteKind>('note')
  const [error, setError] = useState('')
  const list = notes.filter((n) => n.customerId === clientId).sort((a, b) => b.at.localeCompare(a.at))
  const add = () => {
    if (!text.trim()) return setError('Write something first')
    create.mutate({ customerId: clientId, kind, text: text.trim(), authorId: CURRENT_USER_ID, at: new Date().toISOString() }, { onSuccess: () => setText('') })
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <Textarea value={text} onChange={(e) => (setText(e.target.value), setError(''))} placeholder="Log a call, meeting or note…" aria-label="Note" aria-invalid={!!error} className="min-h-[80px]" />
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select value={kind} onChange={(e) => setKind(e.target.value as ClientNoteKind)} options={optionsOf(NOTE_KIND)} className="w-[150px]" aria-label="Type" />
            <Button onClick={add} loading={create.isPending} icon={<Plus />}>
              Add note
            </Button>
          </div>
        </CardBody>
      </Card>
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<MessageSquare />} title="No notes yet" />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {list.map((n) => {
            const a = employeeById(n.authorId)
            return (
              <div key={n.id} className="group flex gap-3 p-4">
                {a && <Avatar name={a.name} hue={a.avatarHue} photo={a.photo} size={32} />}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                    <span className="font-semibold text-fg">{a?.name}</span>
                    <Badge className="px-2 text-[10.5px]">{NOTE_KIND[n.kind]}</Badge>
                    <span>{formatRelative(n.at)}</span>
                  </p>
                  <p className="mt-1 text-[13.5px] whitespace-pre-line">{n.text}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(n.id)} aria-label="Delete note" className="opacity-60 group-hover:opacity-100">
                  <Trash2 />
                </Button>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
