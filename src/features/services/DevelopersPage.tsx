import { Link } from '@tanstack/react-router'
import { BadgeDollarSign, Building2, Handshake, Wallet } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { SearchInput, Segmented } from '@/components/ui/Form'
import { PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/cn'
import { formatMoneyCompact, formatNumber } from '@/lib/format'
import { DEVELOPERS } from '@/mocks/core'
import { deals, invoices, offplanProjects } from '@/mocks/domain'
import { developerStats } from './developerStats'
import { Photo } from './shared'

export function DevelopersPage() {
  const { data: projects } = offplanProjects.useList()
  const { data: allDeals } = deals.useList()
  const { data: allInvoices } = invoices.useList()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'gci' | 'name' | 'outstanding'>('gci')
  const ready = projects && allDeals && allInvoices

  const rows = useMemo(() => {
    if (!ready) return []
    const term = q.trim().toLowerCase()
    return DEVELOPERS.map((d) => ({ dev: d, s: developerStats(d.slug, projects, allDeals, allInvoices) }))
      .filter((r) => !term || `${r.dev.name} ${r.dev.signatureProjects.join(' ')}`.toLowerCase().includes(term))
      .sort((a, b) => (sort === 'name' ? a.dev.name.localeCompare(b.dev.name) : sort === 'gci' ? b.s.gci - a.s.gci : b.s.outstanding - a.s.outstanding))
  }, [ready, projects, allDeals, allInvoices, q, sort])

  const totals = useMemo(
    () => ({
      partners: rows.filter((r) => r.s.projects.length > 0).length,
      deals: rows.reduce((a, r) => a + r.s.live.length, 0),
      gci: rows.reduce((a, r) => a + r.s.gci, 0),
      outstanding: rows.reduce((a, r) => a + r.s.outstanding, 0),
      overdue: rows.reduce((a, r) => a + r.s.overdue, 0),
    }),
    [rows],
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Developers" description="Master developers we are registered with as a broker, and the commission they owe us." breadcrumbs={[{ label: 'Services' }, { label: 'Developers' }]} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!ready ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Active partners" value={totals.partners} icon={<Building2 />} footnote={`${DEVELOPERS.length} developers registered`} />
            <StatCard label="Off-plan deals" value={formatNumber(totals.deals)} icon={<Handshake />} tone="royal" footnote="Not cancelled, all time" />
            <StatCard label="Developer GCI" value={formatMoneyCompact(totals.gci)} icon={<BadgeDollarSign />} tone="success" footnote="Closed off-plan deals" />
            <StatCard label="Outstanding commission" value={formatMoneyCompact(totals.outstanding)} icon={<Wallet />} tone={totals.overdue ? 'warning' : 'cyan'} footnote={totals.overdue ? `${formatMoneyCompact(totals.overdue)} overdue` : 'Nothing overdue'} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search developers or projects…" className="w-full sm:w-[280px]" aria-label="Search developers" />
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { value: 'gci', label: 'Top GCI' },
            { value: 'outstanding', label: 'Outstanding' },
            { value: 'name', label: 'A–Z' },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!ready
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[340px] rounded-card" />)
          : rows.map(({ dev, s }) => (
              <Link
                key={dev.slug}
                to="/services/developers/$slug"
                params={{ slug: dev.slug }}
                className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[box-shadow,border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-aura/30 hover:shadow-lift"
              >
                <Photo src={dev.image} alt="" className="aspect-[16/8]" sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" imgClassName="transition-transform duration-500 group-hover:scale-[1.03]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="text-[19px] font-bold tracking-[-0.01em]">{dev.name}</p>
                    <p className="text-[12.5px] text-white/80">
                      Founded {dev.founded} · {dev.hq} · {dev.deliveredUnits} units delivered
                    </p>
                  </div>
                </Photo>
                <div className="flex flex-1 flex-col p-4">
                  <p className="line-clamp-2 text-[13px] text-muted">{dev.summary}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
                    <Metric label="Projects" value={s.projects.length} />
                    <Metric label="Deals" value={s.live.length} />
                    <Metric label="GCI" value={formatMoneyCompact(s.gci).replace('AED ', '')} />
                  </div>
                  <div className={cn('mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px]', s.overdue ? 'bg-danger/10' : 'bg-surface-2')}>
                    <span className="text-muted">Outstanding commission</span>
                    <span className={cn('font-semibold tabular', s.overdue ? 'text-danger' : 'text-fg')}>{formatMoneyCompact(s.outstanding)}</span>
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className="truncate text-[15px] font-bold tabular">{value}</p>
    </div>
  )
}
