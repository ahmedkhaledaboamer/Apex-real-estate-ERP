import { useNavigate } from '@tanstack/react-router'
import { BadgeDollarSign, CalendarClock, Columns3, Handshake, Plus, Rows3, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Segmented, Select } from '@/components/ui/Form'
import { Kanban } from '@/components/ui/Kanban'
import { PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { Modal } from '@/components/ui/Overlay'
import { StatCard } from '@/components/ui/StatCard'
import { toast } from '@/components/ui/Toast'
import { dealProperty } from '@/features/dashboard/DashboardPage'
import { useCreateParam } from '@/hooks/useCreateParam'
import { change, dealCollectionState, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney, formatMoneyCompact, formatShortDate } from '@/lib/format'
import { DEAL_STAGE, DEAL_TYPE, optionsOf } from '@/lib/labels'
import { customerById, employeeById } from '@/mocks/core'
import { deals } from '@/mocks/domain'
import type { Deal, DealType } from '@/types/domain'
import { DealDrawer } from './DealDrawer'
import { COLLECTION_STATE, COLUMN_STAGE, PIPELINE_COLUMNS, STAGE_COLUMN, type PipelineColumn } from './labels'
import { brokerOptions, PropertyThumb } from './shared'
import { useDealStage } from './useDealActions'

const DAY = 86_400_000
const isLive = (d: Deal) => d.stage !== 'closed' && d.stage !== 'cancelled'
const monthKey = (iso: string) => iso.slice(0, 7)

export function DealsPage() {
  const { data: all, isLoading } = deals.useList()
  const [creating, setCreating] = useCreateParam()
  const navigate = useNavigate()
  const { move } = useDealStage()
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline')
  const [type, setType] = useState<'all' | DealType>('all')
  const [broker, setBroker] = useState('')
  const [stage, setStage] = useState('')
  const [closing, setClosing] = useState<Deal | null>(null)

  const rows = all ?? []
  const kpi = useMemo(() => {
    const now = new Date()
    const thisMonth = monthKey(now.toISOString())
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().slice(0, 7)
    const live = rows.filter(isLive)
    const closed = rows.filter((d) => d.stage === 'closed')
    const closedThis = closed.filter((d) => d.closedAt && monthKey(d.closedAt) === thisMonth)
    const closedPrev = closed.filter((d) => d.closedAt && monthKey(d.closedAt) === prev)
    const collected = sum(closed, (d) => d.collected)
    const owed = sum(closed, (d) => d.commission - d.collected)
    return {
      live: live.length,
      liveValue: sum(live, (d) => d.price),
      pipeline: sum(live, (d) => d.commission),
      gci: sum(closedThis, (d) => d.commission),
      gciChange: change(sum(closedThis, (d) => d.commission), sum(closedPrev, (d) => d.commission)),
      closedCount: closedThis.length,
      collected,
      owed,
      collectedPct: collected + owed > 0 ? (collected / (collected + owed)) * 100 : 0,
    }
  }, [rows])

  const counts = useMemo(() => {
    const base = rows.filter((d) => !broker || d.agentId === broker)
    return { all: base.length, sale: base.filter((d) => d.type === 'sale').length, rent: base.filter((d) => d.type === 'rent').length, offplan: base.filter((d) => d.type === 'offplan').length }
  }, [rows, broker])

  const filtered = useMemo(() => rows.filter((d) => (type === 'all' || d.type === type) && (!broker || d.agentId === broker) && (!stage || d.stage === stage)), [rows, type, broker, stage])
  // Board: live deals + closed in the last 30 days (older closed deals live in the table).
  const board = useMemo(() => filtered.filter((d) => isLive(d) || (d.stage === 'closed' && d.closedAt && Date.now() - new Date(d.closedAt).getTime() < 30 * DAY)), [filtered])

  const onMove = (id: string, col: PipelineColumn) => {
    const d = rows.find((x) => x.id === id)
    if (!d) return
    const to = COLUMN_STAGE[d.type][col]
    if (!to) {
      toast.error(d.type === 'rent' ? 'Rentals go Offer → Contract → Ejari → Closed (no NOC or transfer).' : 'Off-plan deals go Offer → MOU → Closed.')
      return
    }
    if (to === 'closed') setClosing(d)
    else move(d, to)
  }

  const columns: Column<Deal>[] = [
    {
      key: 'code',
      header: 'Deal',
      sort: (d) => d.code,
      cell: (d) => (
        <div>
          <span className="font-semibold text-aura dark:text-[#d6a8e3]">{d.code}</span>
          <span className="block text-[12px] text-muted">{DEAL_TYPE[d.type]}</span>
        </div>
      ),
    },
    {
      key: 'property',
      header: 'Property',
      sort: (d) => dealProperty(d).title,
      cell: (d) => {
        const p = dealProperty(d)
        return (
          <div className="flex max-w-[280px] min-w-0 items-center gap-3">
            <PropertyThumb image={p.image} size={40} rounded="rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-medium">{p.title}</p>
              <p className="truncate text-[12px] text-muted">{p.sub}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'client',
      header: 'Client',
      hideBelow: 'md',
      sort: (d) => customerById(d.clientId)?.name ?? '',
      cell: (d) => {
        const c = customerById(d.clientId)
        return c ? <PersonCell name={c.name} hue={c.avatarHue} size={28} /> : '—'
      },
    },
    { key: 'counterparty', header: 'Counterparty', hideBelow: '2xl', sort: (d) => customerById(d.counterpartyId)?.name ?? '', cell: (d) => <span className="block max-w-[180px] truncate text-muted">{customerById(d.counterpartyId)?.name ?? '—'}</span> },
    {
      key: 'broker',
      header: 'Broker',
      hideBelow: 'lg',
      sort: (d) => employeeById(d.agentId)?.name ?? '',
      cell: (d) => {
        const b = employeeById(d.agentId)
        return b ? <PersonCell name={b.name} hue={b.avatarHue} photo={b.photo} size={28} /> : '—'
      },
    },
    { key: 'price', header: 'Price', align: 'end', sort: (d) => d.price, cell: (d) => <span className="font-semibold tabular">{formatMoneyCompact(d.price)}</span> },
    { key: 'rate', header: 'Rate', align: 'end', hideBelow: 'xl', sort: (d) => d.commissionRate, cell: (d) => <span className="tabular">{d.commissionRate}%</span> },
    { key: 'gci', header: 'GCI', align: 'end', hideBelow: 'sm', sort: (d) => d.commission, cell: (d) => <span className="tabular">{formatMoney(d.commission)}</span> },
    { key: 'collected', header: 'Collected', hideBelow: 'xl', sort: (d) => d.collected / (d.commission || 1), csv: (d) => d.collected, cell: (d) => <StatusBadge value={dealCollectionState(d)} map={COLLECTION_STATE} /> },
    { key: 'stage', header: 'Stage', sort: (d) => d.stage, cell: (d) => <StatusBadge value={d.stage} map={DEAL_STAGE} /> },
    { key: 'close', header: 'Expected close', hideBelow: 'lg', sort: (d) => d.closedAt ?? d.expectedCloseDate, cell: (d) => <span className="text-muted tabular">{d.closedAt ? `Closed ${formatShortDate(d.closedAt)}` : formatDate(d.expectedCloseDate)}</span> },
  ]

  const filters = (
    <>
      <Select value={broker} onChange={(e) => setBroker(e.target.value)} options={brokerOptions()} placeholder="All brokers" className="w-full sm:w-[190px]" aria-label="Broker" />
      <Select value={stage} onChange={(e) => setStage(e.target.value)} options={optionsOf(DEAL_STAGE)} placeholder="All stages" className="w-full sm:w-[170px]" aria-label="Stage" />
    </>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description="Sales, rentals and off-plan transactions from offer to transfer — with commission and collection status."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Deals' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New deal
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[136px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Live deals" value={kpi.live} icon={<Handshake />} footnote={`${formatMoneyCompact(kpi.liveValue)} in transaction value`} />
            <StatCard label="Commission in pipeline" value={formatMoneyCompact(kpi.pipeline)} icon={<CalendarClock />} tone="royal" footnote="GCI of deals not yet closed" />
            <StatCard label="GCI closed · this month" value={formatMoneyCompact(kpi.gci)} icon={<BadgeDollarSign />} tone="success" trend={kpi.gciChange} />
            <StatCard
              label="Commission collected"
              value={`${kpi.collectedPct.toFixed(0)}%`}
              icon={<Wallet />}
              tone={kpi.owed > 0 ? 'warning' : 'success'}
              footnote={
                <>
                  {formatMoneyCompact(kpi.collected)} in · <span className="font-semibold text-warning">{formatMoneyCompact(kpi.owed)} outstanding</span>
                </>
              }
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          value={type}
          onChange={setType}
          className="min-w-0 flex-1"
          tabs={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'sale', label: 'Sale', count: counts.sale },
            { value: 'rent', label: 'Rental', count: counts.rent },
            { value: 'offplan', label: 'Off-plan', count: counts.offplan },
          ]}
        />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'pipeline', label: <><Columns3 /> Pipeline</> },
            { value: 'table', label: <><Rows3 /> Table</> },
          ]}
        />
      </div>

      {view === 'pipeline' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {filters}
            <p className="text-[12.5px] text-muted sm:ms-auto">Drag cards between stages · closed column shows the last 30 days</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-[420px] rounded-card" />
          ) : (
            <Kanban
              columns={PIPELINE_COLUMNS.filter((c) => type === 'all' || COLUMN_STAGE[type][c.id])}
              items={board}
              getColumn={(d) => STAGE_COLUMN[d.stage] ?? 'offer'}
              onMove={onMove}
              onCardClick={(d) => navigate({ to: '/sales/deals/$dealId', params: { dealId: d.id } })}
              columnSummary={(list) => (
                <span className="tabular">
                  {formatMoneyCompact(sum(list, (d) => d.commission))} GCI · {formatMoneyCompact(sum(list, (d) => d.price))}
                </span>
              )}
              renderCard={(d) => <DealCard deal={d} />}
            />
          )}
        </div>
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          loading={isLoading}
          search={(d) => `${d.code} ${dealProperty(d).title} ${dealProperty(d).sub} ${customerById(d.clientId)?.name ?? ''} ${customerById(d.counterpartyId)?.name ?? ''} ${employeeById(d.agentId)?.name ?? ''}`}
          searchPlaceholder="Search code, property, client…"
          toolbar={filters}
          onRowClick={(d) => navigate({ to: '/sales/deals/$dealId', params: { dealId: d.id } })}
          exportName="deals"
          initialSort={{ key: 'code', dir: 'desc' }}
        />
      )}

      <DealDrawer open={creating} onClose={() => setCreating(false)} onCreated={(d) => navigate({ to: '/sales/deals/$dealId', params: { dealId: d.id } })} />
      <CloseDealModal
        deal={closing}
        onClose={() => setClosing(null)}
        onConfirm={() => {
          if (closing) move(closing, 'closed')
          setClosing(null)
        }}
      />
    </div>
  )
}

function DealCard({ deal: d }: { deal: Deal }) {
  const p = dealProperty(d)
  const c = customerById(d.clientId)
  const b = employeeById(d.agentId)
  const overdue = d.stage !== 'closed' && d.expectedCloseDate < new Date().toISOString().slice(0, 10)
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <PropertyThumb image={p.image} size={48} rounded="rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-aura dark:text-[#d6a8e3]">{d.code}</span>
            <Badge tone={d.type === 'sale' ? 'brand' : d.type === 'rent' ? 'info' : 'warning'} className="px-2 text-[10.5px]">
              {DEAL_TYPE[d.type]}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-[13.5px] font-semibold">{p.title}</p>
          <p className="truncate text-[12px] text-muted">{p.sub}</p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-muted">{c?.name ?? '—'}</p>
          <p className="text-[14px] font-bold tabular">{formatMoneyCompact(d.price)}</p>
        </div>
        <div className="text-end">
          <p className="text-[11px] text-muted">GCI</p>
          <p className="text-[13px] font-semibold text-success tabular">{formatMoneyCompact(d.commission)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="flex min-w-0 items-center gap-2">
          {b && <Avatar name={b.name} hue={b.avatarHue} photo={b.photo} size={22} />}
          <span className="truncate text-[12px] text-muted">{b?.name.split(' ')[0]}</span>
        </span>
        <span className={cn('text-[11.5px] font-medium tabular', overdue ? 'text-danger' : 'text-muted')}>{d.closedAt ? `Closed ${formatShortDate(d.closedAt)}` : `Close ${formatShortDate(d.expectedCloseDate)}`}</span>
      </div>
    </div>
  )
}

export function CloseDealModal({ deal, onClose, onConfirm }: { deal: Deal | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      open={!!deal}
      onClose={onClose}
      title={deal ? `Close ${deal.code}?` : ''}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Not yet
          </Button>
          <Button onClick={onConfirm} icon={<Handshake />}>
            Close deal
          </Button>
        </>
      }
    >
      {deal && (
        <p className="text-[13.5px] text-muted">
          {dealProperty(deal).title} will be recorded as closed today with <span className="font-semibold text-fg">{formatMoney(deal.commission)}</span> commission income
          {deal.listingId ? `, and the listing marked ${deal.type === 'rent' ? 'rented' : 'sold'}` : ''}.
        </p>
      )}
    </Modal>
  )
}
