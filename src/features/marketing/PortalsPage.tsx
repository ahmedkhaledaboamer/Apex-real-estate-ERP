import { Eye, MessageSquare } from 'lucide-react'
import { useMemo } from 'react'
import { BarsChart, TrendChart } from '@/components/charts/Charts'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { change, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatMoney, formatNumber } from '@/lib/format'
import { LISTING_PURPOSE } from '@/lib/labels'
import { communityBySlug } from '@/mocks/core'
import { today } from '@/lib/random'
import { listings } from '@/mocks/domain'
import { PORTALS, portalStats } from '@/mocks/marketing'
import type { Listing } from '@/types/domain'
import type { Portal, PortalStat } from '@/types/marketing'
import { PORTAL_LABEL } from './labels'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`
const cplOf = (s: Pick<PortalStat, 'cost' | 'leads'> | undefined) => (s && s.leads ? s.cost / s.leads : 0)

function Trend({ value, inverse }: { value: number; inverse?: boolean }) {
  const good = inverse ? value <= 0 : value >= 0
  return <span className={cn('rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular', good ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>{`${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(0)}%`}</span>
}

/** Share of the current month elapsed — the current month's stats are month-to-date. */
function monthFraction() {
  const t = today()
  return t.getDate() / new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
}

function PortalCard({ portal, cur, prev }: { portal: Portal; cur: PortalStat; prev?: PortalStat }) {
  const p = PORTAL_LABEL[portal]
  const frac = monthFraction()
  // Pro-rate: package cost accrues over the month; compare leads against last month at the same pace.
  const curCpl = cplOf({ cost: cur.cost * frac, leads: cur.leads })
  const prevPaced = prev ? prev.leads * frac : 0
  const quotaPct = (cur.listingsLive / cur.quota) * 100
  const creditPct = (cur.creditsUsed / cur.creditsTotal) * 100
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white" style={{ background: p.color }}>
          {p.short}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold">{p.label}</h3>
          <p className="text-[12px] text-muted">{formatMoney(cur.cost)} / month package</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12px] text-muted">Leads · month to date</p>
          <p className="mt-1 text-[22px] leading-none font-bold tabular">{formatNumber(cur.leads)}</p>
          {prev && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
              <Trend value={change(cur.leads, prevPaced)} /> <span title="Compared with last month at the same point in the month">vs last month</span>
            </p>
          )}
        </div>
        <div>
          <p className="text-[12px] text-muted">Cost per lead</p>
          <p className="mt-1 text-[22px] leading-none font-bold tabular">{formatMoney(curCpl)}</p>
          {prev && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
              <Trend value={change(curCpl, cplOf(prev))} inverse /> vs last month
            </p>
          )}
        </div>
      </div>
      <div className="mt-5 space-y-3 border-t border-line pt-4 text-[12.5px]">
        <div>
          <div className="flex justify-between">
            <span className="text-muted">Live listings vs quota</span>
            <span className="font-semibold tabular">
              {cur.listingsLive} / {cur.quota}
            </span>
          </div>
          <Progress value={quotaPct} tone={quotaPct >= 95 ? 'danger' : quotaPct >= 85 ? 'warning' : 'brand'} className="mt-1.5" />
        </div>
        <div>
          <div className="flex justify-between">
            <span className="text-muted">Credits used</span>
            <span className="font-semibold tabular">
              {formatNumber(cur.creditsUsed)} / {formatNumber(cur.creditsTotal)}
            </span>
          </div>
          <Progress value={creditPct} tone={creditPct >= 90 ? 'warning' : 'success'} className="mt-1.5" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge tone="brand">{cur.featured} featured</Badge>
          <Badge tone="info">{cur.premium} premium</Badge>
          <Badge tone="neutral">{formatNumber(cur.views)} views</Badge>
        </div>
      </div>
    </Card>
  )
}

export function PortalsPage() {
  const { data: stats, isLoading } = portalStats.useList()
  const { data: lst, isLoading: lLoading } = listings.useList()

  const view = useMemo(() => {
    if (!stats) return null
    const months = [...new Set(stats.map((s) => s.month))].sort()
    const curKey = months[months.length - 1]!
    const prevKey = months[months.length - 2]
    const get = (portal: Portal, month: string | undefined) => stats.find((s) => s.portal === portal && s.month === month)
    const trend = months.map((m) => {
      const row: Record<string, string | number> = { month: m === curKey ? `${monthLabel(m)} MTD` : monthLabel(m) }
      for (const p of PORTALS) row[p] = get(p, m)?.leads ?? 0
      return row
    })
    // CPL over the last 3 full months (the current month is month-to-date)
    const full = months.slice(-4, -1)
    const cpl = PORTALS.map((p) => {
      const rows = stats.filter((s) => s.portal === p && full.includes(s.month))
      const yr = stats.filter((s) => s.portal === p)
      return { name: PORTAL_LABEL[p].label, last3: cplOf({ cost: sum(rows, (s) => s.cost), leads: sum(rows, (s) => s.leads) }), year: cplOf({ cost: sum(yr, (s) => s.cost), leads: sum(yr, (s) => s.leads) }) }
    })
    const table = PORTALS.map((p) => {
      const yr = stats.filter((s) => s.portal === p)
      const cost = sum(yr, (s) => s.cost)
      const leads = sum(yr, (s) => s.leads)
      const views = sum(yr, (s) => s.views)
      return { id: p, portal: p, cost, leads, views, cpl: leads ? cost / leads : 0, leadRate: views ? (leads / views) * 100 : 0 }
    })
    return { curKey, prevKey, get, trend, cpl, table, total: { cost: sum(table, (t) => t.cost), leads: sum(table, (t) => t.leads) } }
  }, [stats])

  const top = useMemo(() => [...(lst ?? [])].filter((l) => l.status === 'active' || l.status === 'under-offer').sort((a, b) => b.enquiries - a.enquiries).slice(0, 25), [lst])

  const columns: Column<Listing>[] = [
    {
      key: 'listing',
      header: 'Listing',
      cell: (l) => (
        <div className="flex min-w-0 max-w-[340px] items-center gap-3">
          {l.images[0] ? <img src={l.images[0]} alt="" loading="lazy" className="h-11 w-16 shrink-0 rounded-lg object-cover" /> : <span className="h-11 w-16 shrink-0 rounded-lg bg-surface-2" />}
          <div className="min-w-0">
            <div className="truncate font-semibold">{l.title}</div>
            <div className="truncate text-[12px] text-muted">
              {l.ref} · {communityBySlug(l.communitySlug)?.name}
            </div>
          </div>
        </div>
      ),
      sort: (l) => l.title,
    },
    { key: 'purpose', header: 'Purpose', cell: (l) => <Badge tone={l.purpose === 'sale' ? 'brand' : 'info'}>{LISTING_PURPOSE[l.purpose]}</Badge>, sort: (l) => l.purpose, hideBelow: 'lg' },
    { key: 'price', header: 'Price', align: 'end', cell: (l) => <span className="tabular">{formatMoney(l.price)}</span>, sort: (l) => l.price, hideBelow: 'md' },
    { key: 'views', header: 'Views', align: 'end', cell: (l) => <span className="tabular">{formatNumber(l.views)}</span>, sort: (l) => l.views, hideBelow: 'sm' },
    { key: 'enquiries', header: 'Enquiries', align: 'end', cell: (l) => <span className="font-semibold tabular">{l.enquiries}</span>, sort: (l) => l.enquiries },
    { key: 'conv', header: 'Conversion', align: 'end', cell: (l) => <span className="tabular">{l.views ? ((l.enquiries / l.views) * 100).toFixed(1) : '0.0'}%</span>, sort: (l) => (l.views ? l.enquiries / l.views : 0), hideBelow: 'md' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portals"
        description="Property Finder, Bayut and Dubizzle — listings live against quota, credits, leads and cost per lead."
        breadcrumbs={[{ label: 'Marketing', to: '/marketing' }, { label: 'Portals' }]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {!view || isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[330px] rounded-card" />)
          : PORTALS.map((p) => {
              const cur = view.get(p, view.curKey)
              return cur ? <PortalCard key={p} portal={p} cur={cur} prev={view.get(p, view.prevKey)} /> : null
            })}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Monthly leads by portal" subtitle="Last 12 months · current month to date" />
          <CardBody>
            {view ? (
              <TrendChart data={view.trend} x="month" series={PORTALS.map((p) => ({ key: p, label: PORTAL_LABEL[p].label, color: PORTAL_LABEL[p].color }))} format={(v) => `${formatNumber(v)} leads`} />
            ) : (
              <Skeleton className="h-[280px]" />
            )}
          </CardBody>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Cost per lead" subtitle="Last 3 full months vs 12-month average" />
          <CardBody>
            {view ? (
              <BarsChart data={view.cpl} x="name" series={[{ key: 'last3', label: 'Last 3 months', color: '#843f96' }, { key: 'year', label: '12-month avg', color: '#3cb4e8' }]} format={(v) => formatMoney(v)} />
            ) : (
              <Skeleton className="h-[280px]" />
            )}
          </CardBody>
        </Card>
      </div>

      {view && (
        <Card>
          <CardHeader title="12-month portal economics" subtitle={`${formatMoney(view.total.cost)} spent · ${formatNumber(view.total.leads)} leads · blended CPL ${formatMoney(view.total.leads ? view.total.cost / view.total.leads : 0)}`} />
          <CardBody className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] tracking-[0.04em] text-muted uppercase">
                  <th className="py-2 text-start font-semibold">Portal</th>
                  <th className="py-2 ps-4 text-end font-semibold">Cost</th>
                  <th className="py-2 ps-4 text-end font-semibold">Leads</th>
                  <th className="hidden py-2 ps-4 text-end font-semibold sm:table-cell">Views</th>
                  <th className="hidden py-2 ps-4 text-end font-semibold sm:table-cell">Lead rate</th>
                  <th className="py-2 ps-4 text-end font-semibold">CPL</th>
                </tr>
              </thead>
              <tbody>
                {view.table.map((t) => (
                  <tr key={t.id} className="border-b border-line/70 last:border-0">
                    <td className="py-3">
                      <span className="flex items-center gap-2 font-semibold whitespace-nowrap">
                        <span className="size-2.5 rounded-full" style={{ background: PORTAL_LABEL[t.portal].color }} />
                        {PORTAL_LABEL[t.portal].label}
                      </span>
                    </td>
                    <td className="py-3 ps-4 text-end tabular">{formatMoney(t.cost)}</td>
                    <td className="py-3 ps-4 text-end tabular">{formatNumber(t.leads)}</td>
                    <td className="hidden py-3 ps-4 text-end tabular sm:table-cell">{formatNumber(t.views)}</td>
                    <td className="hidden py-3 ps-4 text-end tabular sm:table-cell">{t.leadRate.toFixed(2)}%</td>
                    <td className="py-3 ps-4 text-end font-semibold tabular">{formatMoney(t.cpl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Top listings by enquiries</h2>
          <span className="flex items-center gap-3 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" /> views
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" /> enquiries across all portals
            </span>
          </span>
        </div>
        <DataTable rows={top} columns={columns} loading={lLoading} search={(l) => `${l.title} ${l.ref} ${communityBySlug(l.communitySlug)?.name}`} searchPlaceholder="Search listings…" exportName="top-listings" initialSort={{ key: 'enquiries', dir: 'desc' }} />
      </div>
    </div>
  )
}
