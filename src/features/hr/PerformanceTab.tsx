import { Link, useNavigate } from '@tanstack/react-router'
import { BadgeDollarSign, Building2, CalendarClock, Handshake, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { BarsChart } from '@/components/charts/Charts'
import { StatusBadge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { formatDate, formatDateTime, formatMoney, formatMoneyCompact, formatShortDate } from '@/lib/format'
import { DEAL_TYPE, LISTING_STATUS, VIEWING_STATUS } from '@/lib/labels'
import { communityBySlug, customerById } from '@/mocks/core'
import { brokerShare, deals, leadById, listingById, listings, offplanById, viewings } from '@/mocks/domain'
import type { Employee } from '@/types/core'
import type { Deal, Listing, Viewing } from '@/types/domain'

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const dealTitle = (d: Deal) => listingById(d.listingId)?.title ?? offplanById(d.projectId)?.name ?? communityBySlug(d.communitySlug)?.name ?? d.code

/** Broker performance: closed deals, GCI, earned commission, listings and viewings. */
export function PerformanceTab({ emp }: { emp: Employee }) {
  const navigate = useNavigate()
  const { data: allDeals, isLoading } = deals.useList()
  const { data: allListings } = listings.useList()
  const { data: allViewings } = viewings.useList()

  const yearAgo = useMemo(() => new Date(Date.now() - 365 * 86_400_000).toISOString(), [])
  const mine = useMemo(() => (allDeals ?? []).filter((d) => d.agentId === emp.id), [allDeals, emp.id])
  const closed = useMemo(() => mine.filter((d) => d.stage === 'closed' && d.closedAt && d.closedAt >= yearAgo).sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? '')), [mine, yearAgo])
  const pipeline = useMemo(() => mine.filter((d) => d.stage !== 'closed' && d.stage !== 'cancelled'), [mine])
  const active = useMemo(() => (allListings ?? []).filter((l) => l.agentId === emp.id && (l.status === 'active' || l.status === 'under-offer')), [allListings, emp.id])
  const upcoming = useMemo(() => {
    const now = new Date().toISOString()
    return (allViewings ?? []).filter((v) => v.agentId === emp.id && v.status === 'scheduled' && v.at >= now).sort((a, b) => a.at.localeCompare(b.at))
  }, [allViewings, emp.id])

  const gci = closed.reduce((a, d) => a + d.commission, 0)
  const earned = closed.reduce((a, d) => a + brokerShare(d), 0)
  const pipelineGci = pipeline.reduce((a, d) => a + d.commission, 0)

  const monthly = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = monthKey(m)
      const ds = closed.filter((d) => d.closedAt?.startsWith(key))
      const g = ds.reduce((a, d) => a + d.commission, 0)
      const e = ds.reduce((a, d) => a + brokerShare(d), 0)
      return { month: m.toLocaleString('en', { month: 'short' }), agency: g - e, broker: e }
    })
  }, [closed])

  if (isLoading) return <Skeleton className="h-[420px] rounded-card" />

  const dealCols: Column<Deal>[] = [
    {
      key: 'deal',
      header: 'Deal',
      cell: (d) => (
        <span className="block min-w-0">
          <span className="block max-w-[260px] truncate font-semibold">{dealTitle(d)}</span>
          <span className="block text-[12px] text-muted">
            {d.code} · {DEAL_TYPE[d.type]} · {customerById(d.clientId)?.name ?? '—'}
          </span>
        </span>
      ),
      sort: (d) => d.code,
    },
    { key: 'closed', header: 'Closed', cell: (d) => <span className="text-muted">{d.closedAt ? formatDate(d.closedAt) : '—'}</span>, sort: (d) => d.closedAt ?? '', hideBelow: 'md' },
    { key: 'price', header: 'Price', align: 'end', cell: (d) => <span className="tabular">{formatMoneyCompact(d.price)}</span>, sort: (d) => d.price, hideBelow: 'lg' },
    { key: 'gci', header: 'GCI', align: 'end', cell: (d) => <span className="tabular">{formatMoney(d.commission)}</span>, sort: (d) => d.commission, hideBelow: 'sm' },
    { key: 'earned', header: `Earned (${emp.commissionSplit ?? 0}%)`, align: 'end', cell: (d) => <span className="font-semibold text-success tabular">{formatMoney(brokerShare(d))}</span>, sort: (d) => brokerShare(d) },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Deals closed" value={closed.length} icon={<Handshake />} footnote={`Last 12 months · ${pipeline.length} in progress`} />
        <StatCard label="GCI generated" value={formatMoneyCompact(gci)} icon={<BadgeDollarSign />} tone="royal" footnote={`Last 12 months · pipeline ${formatMoneyCompact(pipelineGci)}`} />
        <StatCard label="Commission earned" value={formatMoneyCompact(earned)} icon={<Wallet />} tone="success" footnote={`${emp.commissionSplit ?? 0}% split · paid via payroll`} />
        <StatCard label="Active listings" value={active.length} icon={<Building2 />} tone="cyan" footnote={`${active.filter((l) => l.exclusive).length} exclusive`} />
        <StatCard label="Upcoming viewings" value={upcoming.length} icon={<CalendarClock />} tone="warning" footnote={upcoming[0] ? `Next ${formatShortDate(upcoming[0].at)}` : 'None scheduled'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader title="Commission by month" subtitle="GCI on closed deals · broker vs agency share" />
          <CardBody className="pt-3">
            <BarsChart
              data={monthly}
              x="month"
              stacked
              series={[
                { key: 'broker', label: 'Broker share', color: '#1f9d64' },
                { key: 'agency', label: 'Agency share', color: '#843f96' },
              ]}
              format={(v) => formatMoney(v)}
              height={240}
            />
          </CardBody>
        </Card>
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader title="Upcoming viewings" subtitle="Scheduled appointments" actions={<Link to="/sales/viewings" className="text-[12.5px] font-semibold text-aura hover:underline">All viewings</Link>} />
          <CardBody className="pt-3">
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarClock />} title="No viewings scheduled" />
            ) : (
              <ul className="-my-1 space-y-1">
                {upcoming.slice(0, 6).map((v) => (
                  <ViewingRow key={v.id} v={v} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader title="Active listings" subtitle={`${active.length} units on the market`} />
        <CardBody className="pt-3">
          {active.length === 0 ? (
            <EmptyState icon={<Building2 />} title="No active listings" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {active.slice(0, 9).map((l) => (
                <ListingTile key={l.id} l={l} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <DataTable rows={closed} columns={dealCols} pageSize={8} onRowClick={(d) => navigate({ to: '/sales/deals/$dealId', params: { dealId: d.id } })} exportName={`deals-${emp.code}`} initialSort={{ key: 'closed', dir: 'desc' }} empty={<EmptyState icon={<Handshake />} title="No closed deals in the last 12 months" />} />
    </div>
  )
}

function ViewingRow({ v }: { v: Viewing }) {
  const l = listingById(v.listingId)
  const p = offplanById(v.projectId)
  const who = leadById(v.leadId)?.name ?? customerById(v.clientId)?.name ?? '—'
  const img = l?.images[0] ?? p?.image
  return (
    <li className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
      {img ? <img src={img} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" /> : <span className="size-10 shrink-0 rounded-lg bg-surface-2" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{l?.title ?? p?.name ?? 'Viewing'}</span>
        <span className="block truncate text-[12px] text-muted">
          {formatDateTime(v.at)} · {who}
        </span>
      </span>
      <StatusBadge value={v.status} map={VIEWING_STATUS} />
    </li>
  )
}

function ListingTile({ l }: { l: Listing }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line p-2.5">
      <img src={l.images[0]} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{l.title}</p>
        <p className="truncate text-[12px] text-muted">
          {l.ref} · {communityBySlug(l.communitySlug)?.name}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-semibold tabular">
            {formatMoneyCompact(l.price)}
            {l.purpose === 'rent' && <span className="font-normal text-muted"> /yr</span>}
          </span>
          <StatusBadge value={l.status} map={LISTING_STATUS} />
        </div>
      </div>
    </div>
  )
}

