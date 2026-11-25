import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, BadgeDollarSign, Car, GraduationCap, Handshake, Home, KeyRound, Ruler, TrendingUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { BarsChart } from '@/components/charts/Charts'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Form'
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format'
import { communityBySlug } from '@/mocks/core'
import { deals, listings, offplanProjects } from '@/mocks/domain'
import { COMMUNITY_DETAILS } from '@/mocks/site/communities'
import { communityStats } from './communityStats'
import { ListingCard } from './ListingCard'
import { ProjectCard } from './OffplanPage'
import { lastMonths, monthKey, Photo } from './shared'

export function CommunityDetailPage({ slug }: { slug: string }) {
  const { data: allListings } = listings.useList()
  const { data: allDeals } = deals.useList()
  const { data: projects = [] } = offplanProjects.useList()
  const [metric, setMetric] = useState<'count' | 'gci'>('count')
  const c = communityBySlug(slug)
  const site = COMMUNITY_DETAILS.find((d) => d.slug === slug)
  const s = useMemo(() => (c && allListings && allDeals ? communityStats(c, allListings, allDeals) : null), [c, allListings, allDeals])

  const monthly = useMemo(() => {
    if (!s) return []
    const months = lastMonths(12)
    const rows = months.map((m) => ({ month: m.month, key: m.key, sale: 0, rent: 0, offplan: 0 }))
    for (const d of s.closed12) {
      const row = rows.find((r) => r.key === monthKey(d.closedAt!))
      if (row) row[d.type] += metric === 'count' ? 1 : d.commission
    }
    return rows
  }, [s, metric])

  if (!c)
    return (
      <Card>
        <EmptyState
          title="Community not found"
          action={
            <ButtonLink to="/services/communities" variant="outline" icon={<ArrowLeft />}>
              Back to communities
            </ButtonLink>
          }
        />
      </Card>
    )

  const live = s?.active ?? []
  const communityProjects = projects.filter((p) => p.communitySlug === slug)

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: 'Services' }, { label: 'Communities', to: '/services/communities' }, { label: c.name }]} title={c.name} description={site?.summary} actions={<Badge tone="brand">{c.zone}</Badge>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <Photo src={c.image} alt={c.name} className="aspect-[16/8]" sizes="(min-width: 1024px) 60vw, 100vw" />
          {site && (
            <CardBody className="space-y-3 text-[13.5px] leading-relaxed">
              {site.description.map((p, i) => (
                <p key={i} className={i ? 'text-muted' : ''}>
                  {p}
                </p>
              ))}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {site.lifestyle.map((l) => (
                  <Badge key={l} tone="brand">
                    {l}
                  </Badge>
                ))}
              </div>
            </CardBody>
          )}
        </Card>
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Market" subtitle={site?.freehold ? 'Freehold — open to all nationalities' : undefined} />
            <CardBody className="grid grid-cols-2 gap-3 pt-3">
              <MarketTile icon={<Ruler />} label="Avg AED / sqft" value={s?.ppsf ? formatNumber(s.ppsf) : '—'} est={s?.ppsfEstimated} />
              <MarketTile icon={<TrendingUp />} label="Gross yield" value={s?.yieldPct ? `${s.yieldPct}%` : '—'} est={s?.yieldEstimated} />
              <MarketTile icon={<KeyRound />} label="1-bed rent / yr" value={site?.avgRent1Bed ? formatMoneyCompact(site.avgRent1Bed) : '—'} />
              <MarketTile icon={<KeyRound />} label="2-bed rent / yr" value={site?.avgRent2Bed ? formatMoneyCompact(site.avgRent2Bed) : '—'} />
            </CardBody>
          </Card>
          {site && (
            <Card>
              <CardBody className="space-y-4 text-[13px]">
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold tracking-[0.04em] text-muted uppercase">Property types</p>
                  <p>{site.propertyTypes.join(' · ')}</p>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.04em] text-muted uppercase">
                    <GraduationCap className="size-3.5" /> Schools nearby
                  </p>
                  <ul className="space-y-0.5">
                    {site.schools.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.04em] text-muted uppercase">
                    <Car className="size-3.5" /> Commute
                  </p>
                  <ul className="space-y-1">
                    {site.commute.map((x) => (
                      <li key={x.to} className="flex justify-between gap-3">
                        <span>{x.to}</span>
                        <span className="text-muted tabular">{x.minutes} min</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!s ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Live listings" value={live.length} icon={<Home />} footnote={`${live.filter((l) => l.purpose === 'sale').length} for sale · ${live.filter((l) => l.purpose === 'rent').length} for rent`} />
            <StatCard label="Deals closed · 12 months" value={s.closed12.length} icon={<Handshake />} tone="royal" footnote={`${s.deals.filter((d) => d.stage !== 'closed' && d.stage !== 'cancelled').length} in progress`} />
            <StatCard label="GCI · 12 months" value={formatMoneyCompact(s.gci12)} icon={<BadgeDollarSign />} tone="success" footnote={`${formatMoneyCompact(s.volume12)} transacted`} />
            <StatCard label="Avg deal size" value={s.closed12.length ? formatMoneyCompact(s.volume12 / s.closed12.length) : '—'} icon={<TrendingUp />} tone="cyan" footnote="Closed, all types" />
          </>
        )}
      </div>

      <Card className="min-w-0">
        <CardHeader
          title="Deals by month"
          subtitle="Closed deals in the last 12 months, by type"
          actions={
            <Segmented
              size="sm"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'count', label: 'Deals' },
                { value: 'gci', label: 'GCI' },
              ]}
            />
          }
        />
        <CardBody className="pt-3">
          {s ? (
            <BarsChart
              data={monthly}
              x="month"
              stacked
              height={280}
              format={(v) => (metric === 'count' ? String(v) : formatMoney(v))}
              series={[
                { key: 'sale', label: 'Sale' },
                { key: 'rent', label: 'Rental', color: '#3cb4e8' },
                { key: 'offplan', label: 'Off-plan', color: '#563d96' },
              ]}
            />
          ) : (
            <Skeleton className="h-[280px]" />
          )}
        </CardBody>
      </Card>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Live listings</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">{live.length} units on the market</p>
          </div>
          <Link to="/services" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-aura hover:underline">
            All listings <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        {live.length === 0 ? (
          <Card>
            <EmptyState icon={<Home />} title="No live listings here" />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {live.slice(0, 8).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {communityProjects.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Off-plan projects</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {communityProjects.map((p) => (
              <ProjectCard key={p.id} project={p} deals={allDeals ?? []} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MarketTile({ icon, label, value, est }: { icon: ReactNode; label: string; value: ReactNode; est?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2/50 p-3">
      <span className="text-muted [&_svg]:size-4">{icon}</span>
      <p className="mt-1.5 truncate text-[11.5px] text-muted">{label}</p>
      <p className="truncate text-[16px] font-bold tabular">
        {value}
        {est && <span className="ms-1 text-[10.5px] font-semibold text-muted">est.</span>}
      </p>
    </div>
  )
}
