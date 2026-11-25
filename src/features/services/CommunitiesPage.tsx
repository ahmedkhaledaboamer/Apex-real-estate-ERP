import { Link } from '@tanstack/react-router'
import { BadgeDollarSign, Home, MapPin, TrendingUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Segmented } from '@/components/ui/Form'
import { PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { formatMoneyCompact, formatNumber } from '@/lib/format'
import { COMMUNITIES } from '@/mocks/core'
import { deals, listings } from '@/mocks/domain'
import type { Community } from '@/types/core'
import { communityStats } from './communityStats'
import { Photo } from './shared'

type Zone = 'all' | Community['zone']

export function CommunitiesPage() {
  const { data: allListings } = listings.useList()
  const { data: allDeals } = deals.useList()
  const [zone, setZone] = useState<Zone>('all')
  const ready = allListings && allDeals

  const rows = useMemo(() => (ready ? COMMUNITIES.map((c) => ({ c, s: communityStats(c, allListings, allDeals) })).sort((a, b) => b.s.gci12 - a.s.gci12) : []), [ready, allListings, allDeals])
  const shown = rows.filter((r) => zone === 'all' || r.c.zone === zone)
  const top = rows[0]
  const totals = {
    active: rows.reduce((a, r) => a + r.s.active.length, 0),
    gci: rows.reduce((a, r) => a + r.s.gci12, 0),
    bestYield: [...rows].filter((r) => r.s.yieldPct).sort((a, b) => (b.s.yieldPct ?? 0) - (a.s.yieldPct ?? 0))[0],
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Communities" description="Market snapshot and our activity in each Dubai community we cover." breadcrumbs={[{ label: 'Services' }, { label: 'Communities' }]} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!ready ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Communities covered" value={COMMUNITIES.length} icon={<MapPin />} footnote="4 zones" />
            <StatCard label="Live listings" value={formatNumber(totals.active)} icon={<Home />} tone="royal" footnote="Active + under offer" />
            <StatCard label="GCI · 12 months" value={formatMoneyCompact(totals.gci)} icon={<BadgeDollarSign />} tone="success" footnote={top ? `Top: ${top.c.name}` : ''} />
            <StatCard label="Best gross yield" value={totals.bestYield ? `${totals.bestYield.s.yieldPct}%` : '—'} icon={<TrendingUp />} tone="cyan" footnote={totals.bestYield?.c.name} />
          </>
        )}
      </div>

      <div className="max-w-full overflow-x-auto">
        <Segmented<Zone>
          value={zone}
          onChange={setZone}
          options={[
            { value: 'all', label: 'All zones' },
            { value: 'Coastal', label: 'Coastal' },
            { value: 'Central', label: 'Central' },
            { value: 'Suburban', label: 'Suburban' },
            { value: 'Waterfront', label: 'Waterfront' },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {!ready
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[330px] rounded-card" />)
          : shown.map(({ c, s }) => (
              <Link
                key={c.slug}
                to="/services/communities/$slug"
                params={{ slug: c.slug }}
                className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[box-shadow,border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-aura/30 hover:shadow-lift"
              >
                <Photo src={c.image} alt={c.name} className="aspect-[4/3]" sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" imgClassName="transition-transform duration-500 group-hover:scale-[1.03]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute start-3 top-3 rounded-full bg-surface/95 shadow-sm">
                    <Badge tone="brand">{c.zone}</Badge>
                  </span>
                  <p className="absolute inset-x-0 bottom-0 truncate p-4 text-[18px] font-bold tracking-[-0.01em] text-white">{c.name}</p>
                </Photo>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-4 text-[12px]">
                  <Cell label="Avg AED / sqft" value={s.ppsf ? formatNumber(s.ppsf) : '—'} est={s.ppsfEstimated} />
                  <Cell label="Gross yield" value={s.yieldPct ? `${s.yieldPct}%` : '—'} est={s.yieldEstimated} />
                  <Cell label="Live listings" value={s.active.length} />
                  <Cell label="Deals · 12 mo" value={s.closed12.length} />
                  <div className="col-span-2 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-muted">GCI · 12 months</span>
                    <span className="text-[14px] font-bold tabular">{formatMoneyCompact(s.gci12)}</span>
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </div>
  )
}

function Cell({ label, value, est }: { label: string; value: ReactNode; est?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-muted">{label}</p>
      <p className="truncate text-[15px] font-bold tabular">
        {value}
        {est && <span className="ms-1 text-[10.5px] font-semibold text-muted" title="Estimated from our listings">est.</span>}
      </p>
    </div>
  )
}
