import { useNavigate } from '@tanstack/react-router'
import { Clock, Eye, Handshake, Home, KeyRound, LayoutGrid, Plus, Rows3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchInput, Segmented, Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { pricePerSqft } from '@/lib/calc'
import { formatCompact, formatMoneyCompact, formatNumber } from '@/lib/format'
import { LISTING_PURPOSE, LISTING_STATUS, optionsOf } from '@/lib/labels'
import { brokers, COMMUNITIES, communityBySlug, employeeById } from '@/mocks/core'
import { listings } from '@/mocks/domain'
import type { Listing, ListingPurpose, PropertyType } from '@/types/domain'
import { ListingCard } from './ListingCard'
import { ListingDrawer } from './ListingDrawer'
import { daysSince, ExclusiveBadge, Photo } from './shared'

const PAGE = 12

export function ListingsPage() {
  const { data, isLoading } = listings.useList()
  const [creating, setCreating] = useCreateParam()
  const navigate = useNavigate()
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [purpose, setPurpose] = useState<'all' | ListingPurpose>('all')
  const [status, setStatus] = useState('')
  const [community, setCommunity] = useState('')
  const [type, setType] = useState('')
  const [agent, setAgent] = useState('')
  const [beds, setBeds] = useState('')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (data ?? []).filter(
      (l) =>
        (purpose === 'all' || l.purpose === purpose) &&
        (!status || l.status === status) &&
        (!community || l.communitySlug === community) &&
        (!type || l.propertyType === type) &&
        (!agent || l.agentId === agent) &&
        (!beds || (beds === '4' ? l.beds >= 4 : l.beds === Number(beds))) &&
        (!term || `${l.ref} ${l.title} ${l.building} ${communityBySlug(l.communitySlug)?.name}`.toLowerCase().includes(term)),
    )
  }, [data, purpose, status, community, type, agent, beds, q])

  const kpi = useMemo(() => {
    const all = data ?? []
    const active = all.filter((l) => l.status === 'active')
    return {
      sale: active.filter((l) => l.purpose === 'sale'),
      rent: active.filter((l) => l.purpose === 'rent'),
      underOffer: all.filter((l) => l.status === 'under-offer').length,
      dom: active.length ? Math.round(active.reduce((a, l) => a + daysSince(l.listedAt), 0) / active.length) : 0,
      views: all.filter((l) => l.status === 'active' || l.status === 'under-offer').reduce((a, l) => a + l.views, 0),
      enquiries: all.filter((l) => l.status === 'active' || l.status === 'under-offer').reduce((a, l) => a + l.enquiries, 0),
    }
  }, [data])

  const filtersOn = purpose !== 'all' || status || community || type || agent || beds || q
  const resetFilters = () => {
    setPurpose('all')
    setStatus('')
    setCommunity('')
    setType('')
    setAgent('')
    setBeds('')
    setQ('')
  }
  const changed = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setShown(PAGE)
  }

  const columns: Column<Listing>[] = [
    {
      key: 'listing',
      header: 'Listing',
      sort: (l) => l.title,
      csv: (l) => `${l.ref} ${l.title}`,
      cell: (l) => (
        <div className="flex max-w-[320px] min-w-0 items-center gap-3">
          <Photo src={l.images[0]} className="h-11 w-14 shrink-0 rounded-lg" sizes="56px" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{l.title}</span>
            </div>
            <div className="truncate text-[12px] text-muted">
              {l.ref} · {l.building}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'purpose', header: 'Purpose', sort: (l) => l.purpose, csv: (l) => LISTING_PURPOSE[l.purpose], hideBelow: 'md', cell: (l) => <span className="font-medium">{LISTING_PURPOSE[l.purpose]}</span> },
    { key: 'status', header: 'Status', sort: (l) => l.status, cell: (l) => <span className="inline-flex items-center gap-1.5"><StatusBadge value={l.status} map={LISTING_STATUS} />{l.exclusive && <ExclusiveBadge />}</span> },
    { key: 'price', header: 'Price', align: 'end', sort: (l) => l.price, cell: (l) => <span className="font-semibold tabular">{l.purpose === 'rent' ? `${formatMoneyCompact(l.price)}/yr` : formatMoneyCompact(l.price)}</span> },
    { key: 'beds', header: 'Beds', align: 'end', sort: (l) => l.beds, hideBelow: 'lg', cell: (l) => <span className="tabular">{l.beds === 0 ? 'Studio' : l.beds}</span> },
    { key: 'sqft', header: 'Sqft', align: 'end', sort: (l) => l.sqft, hideBelow: 'lg', cell: (l) => <span className="tabular">{formatNumber(l.sqft)}</span> },
    { key: 'ppsf', header: 'AED/sqft', align: 'end', sort: (l) => pricePerSqft(l.price, l.sqft), hideBelow: 'xl', cell: (l) => <span className="text-muted tabular">{l.purpose === 'sale' ? formatNumber(pricePerSqft(l.price, l.sqft)) : '—'}</span> },
    { key: 'community', header: 'Community', sort: (l) => communityBySlug(l.communitySlug)?.name ?? '', hideBelow: 'md', cell: (l) => communityBySlug(l.communitySlug)?.name },
    {
      key: 'agent',
      header: 'Broker',
      sort: (l) => employeeById(l.agentId)?.name ?? '',
      hideBelow: 'xl',
      cell: (l) => {
        const a = employeeById(l.agentId)
        return a ? (
          <span className="flex items-center gap-2">
            <Avatar name={a.name} hue={a.avatarHue} photo={a.photo} size={24} />
            {a.name}
          </span>
        ) : (
          '—'
        )
      },
    },
    { key: 'views', header: 'Views', align: 'end', sort: (l) => l.views, hideBelow: '2xl', cell: (l) => <span className="tabular">{formatCompact(l.views)}</span> },
    { key: 'enq', header: 'Enquiries', align: 'end', sort: (l) => l.enquiries, hideBelow: '2xl', cell: (l) => <span className="tabular">{l.enquiries}</span> },
    { key: 'dom', header: 'Days listed', align: 'end', sort: (l) => daysSince(l.listedAt), hideBelow: 'sm', cell: (l) => <span className="text-muted tabular">{daysSince(l.listedAt)}</span> },
  ]

  const filters = (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <Select aria-label="Status" value={status} onChange={(e) => changed(setStatus)(e.target.value)} options={optionsOf(LISTING_STATUS)} placeholder="All statuses" className="sm:w-[150px]" />
      <Select aria-label="Community" value={community} onChange={(e) => changed(setCommunity)(e.target.value)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} placeholder="All communities" className="sm:w-[170px]" />
      <Select aria-label="Property type" value={type} onChange={(e) => changed(setType)(e.target.value)} options={(['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio', 'Office'] as PropertyType[]).map((t) => ({ value: t, label: t }))} placeholder="All types" className="sm:w-[140px]" />
      <Select aria-label="Beds" value={beds} onChange={(e) => changed(setBeds)(e.target.value)} options={[{ value: '0', label: 'Studio' }, { value: '1', label: '1 bed' }, { value: '2', label: '2 beds' }, { value: '3', label: '3 beds' }, { value: '4', label: '4+ beds' }]} placeholder="Any beds" className="sm:w-[120px]" />
      <Select aria-label="Broker" value={agent} onChange={(e) => changed(setAgent)(e.target.value)} options={brokers().map((b) => ({ value: b.id, label: b.name }))} placeholder="All brokers" className="col-span-2 sm:w-[170px]" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Secondary-market and rental stock across Property Finder, Bayut and Dubizzle."
        breadcrumbs={[{ label: 'Services' }, { label: 'Listings' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New listing
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {!data ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Active for sale" value={formatNumber(kpi.sale.length)} icon={<Home />} footnote={`${formatMoneyCompact(kpi.sale.reduce((a, l) => a + l.price, 0))} asking value`} />
            <StatCard label="Active for rent" value={formatNumber(kpi.rent.length)} icon={<KeyRound />} tone="royal" footnote={`${formatMoneyCompact(kpi.rent.reduce((a, l) => a + l.price, 0))} annual rent`} />
            <StatCard label="Under offer" value={formatNumber(kpi.underOffer)} icon={<Handshake />} tone="warning" footnote="Offers being negotiated" />
            <StatCard label="Avg days on market" value={`${kpi.dom} d`} icon={<Clock />} tone="cyan" footnote="Active listings" />
            <StatCard label="Portal views" value={formatCompact(kpi.views)} icon={<Eye />} tone="success" footnote={`${formatNumber(kpi.enquiries)} enquiries · live stock`} className="sm:col-span-2 xl:col-span-1" />
          </>
        )}
      </div>

      {view === 'grid' ? (
        <>
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <SearchInput value={q} onChange={(e) => changed(setQ)(e.target.value)} placeholder="Search ref, title, building…" className="w-full sm:w-[240px]" aria-label="Search listings" />
            <Segmented
              value={purpose}
              onChange={changed(setPurpose)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'sale', label: 'For sale' },
                { value: 'rent', label: 'For rent' },
              ]}
            />
            {filters}
            <div className="ms-auto flex items-center gap-2">
              {filtersOn && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Clear
                </Button>
              )}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </Card>
          <p className="-mt-3 text-[12.5px] text-muted">
            <span className="font-semibold text-fg tabular">{rows.length}</span> listings
          </p>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[360px] rounded-card" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Home />}
                title="No listings match"
                message="Try clearing a filter."
                action={
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {rows.slice(0, shown).map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
              {rows.length > shown && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShown((s) => s + PAGE)}>
                    Show more ({rows.length - shown} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          loading={isLoading}
          onRowClick={(l) => navigate({ to: '/services/listings/$listingId', params: { listingId: l.id } })}
          exportName="listings"
          initialSort={{ key: 'dom', dir: 'asc' }}
          toolbar={
            <>
              <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, title, building…" className="w-full sm:w-[240px]" aria-label="Search listings" />
              <Segmented
                value={purpose}
                onChange={setPurpose}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'sale', label: 'For sale' },
                  { value: 'rent', label: 'For rent' },
                ]}
              />
              {filters}
              <div className="flex items-center gap-2">
                {filtersOn && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Clear
                  </Button>
                )}
                <ViewToggle view={view} onChange={setView} />
              </div>
            </>
          }
        />
      )}

      <ListingDrawer open={creating} onClose={() => setCreating(false)} onCreated={(l) => navigate({ to: '/services/listings/$listingId', params: { listingId: l.id } })} />
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: 'grid' | 'table'; onChange: (v: 'grid' | 'table') => void }) {
  return (
    <Segmented
      value={view}
      onChange={onChange}
      options={[
        { value: 'grid', label: <><LayoutGrid /> <span className="sr-only sm:not-sr-only">Cards</span></> },
        { value: 'table', label: <><Rows3 /> <span className="sr-only sm:not-sr-only">Table</span></> },
      ]}
    />
  )
}

