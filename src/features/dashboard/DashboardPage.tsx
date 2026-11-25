import { Link } from '@tanstack/react-router'
import { ArrowUpRight, BadgeDollarSign, CalendarCheck2, Download, Eye, Handshake, Plus, Target, Wallet } from 'lucide-react'
import { useState } from 'react'
import { BarsChart, DonutChart, TrendChart } from '@/components/charts/Charts'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { ButtonLink, buttonClass } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Form'
import { EmptyState, Progress, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/cn'
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format'
import { DEAL_STAGE, DEAL_TYPE, LEAD_STAGE } from '@/lib/labels'
import { currentUserId } from '@/lib/auth'
import { communityBySlug, customerById, employeeById } from '@/mocks/core'
import { leadById, listingById, offplanById } from '@/mocks/domain'
import type { Deal } from '@/types/domain'
import { TasksDueCard, UpcomingEventsCard } from './AgendaCards'
import { useDashboard } from './useDashboard'

/** "Marina Gate 1 · Dubai Marina" or the off-plan project name. */
export function dealProperty(d: Pick<Deal, 'listingId' | 'projectId' | 'communitySlug'>) {
  const l = listingById(d.listingId)
  if (l) return { title: l.title, sub: communityBySlug(l.communitySlug)?.name ?? '', image: l.images[0] }
  const p = offplanById(d.projectId)
  if (p) return { title: p.name, sub: communityBySlug(p.communitySlug)?.name ?? '', image: p.image }
  return { title: communityBySlug(d.communitySlug)?.name ?? '—', sub: '', image: undefined }
}

export function DashboardPage() {
  const { loading, data } = useDashboard()
  const [range, setRange] = useState<'6' | '12'>('12')
  const me = employeeById(currentUserId())
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Welcome band */}
      <section className="relative overflow-hidden rounded-[20px] bg-brand-gradient p-6 text-white shadow-lift md:p-8">
        <div className="pointer-events-none absolute -end-16 -top-20 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <svg className="pointer-events-none absolute end-6 bottom-0 hidden h-40 opacity-15 md:block" viewBox="0 0 64 32" fill="none" aria-hidden="true">
          <path d="M32 16c-4-5-8-8-12-8-5 0-8 3.5-8 8s3 8 8 8c4 0 8-3 12-8s8-8 12-8c5 0 8 3.5 8 8s-3 8-8 8c-4 0-8-3-12-8z" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[13px] font-medium text-white/70">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <h1 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] md:text-[30px]">
              {greeting}, {me?.name.split(' ')[0]}
            </h1>
            <p className="mt-1.5 max-w-xl text-[14px] text-white/75">
              {data ? (
                <>
                  {data.kpi.liveDeals} deals in progress worth {formatMoneyCompact(data.kpi.liveCommission)} in commission · {data.upcomingViewings.length} viewings this week · {data.kpi.activeSale + data.kpi.activeRent} live listings.
                </>
              ) : (
                'Loading today’s overview…'
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/sales/deals" search={{ new: 1 } as never} className={buttonClass('secondary', 'md', 'bg-white text-plum hover:bg-white/90 dark:bg-white dark:hover:bg-white/90')}>
              <Plus /> New deal
            </Link>
            <ButtonLink to="/finance/reports" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" icon={<Download />}>
              Reports
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Commission income (GCI) · this month" value={formatMoneyCompact(data.kpi.gci)} trend={data.kpi.gciChange} icon={<BadgeDollarSign />} spark={data.kpi.gciSpark} />
            <StatCard label="Deals closed · this month" value={formatNumber(data.kpi.deals)} trend={data.kpi.dealsChange} icon={<Handshake />} tone="royal" spark={data.kpi.dealsSpark} />
            <StatCard label="New leads (30 days)" value={formatNumber(data.kpi.newLeads30)} trend={data.kpi.newLeadsChange} trendLabel="vs previous 30 days" icon={<Target />} tone="cyan" />
            <StatCard
              label="Outstanding commissions"
              value={formatMoneyCompact(data.kpi.receivable)}
              icon={<Wallet />}
              tone={data.kpi.overdueCount ? 'warning' : 'success'}
              footnote={
                data.kpi.overdueCount ? (
                  <Link to="/finance/invoices" className="font-semibold text-danger hover:underline">
                    {data.kpi.overdueCount} overdue · {formatMoneyCompact(data.kpi.overdueAmount)}
                  </Link>
                ) : (
                  'Nothing overdue'
                )
              }
            />
          </>
        )}
      </div>

      {/* GCI trend + deal mix */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Commission income"
            subtitle={data ? `This month: ${formatMoney(data.kpi.volume)} transacted · agency net ${formatMoney(data.kpi.net)} after broker splits` : ' '}
            actions={
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: '6', label: '6 months' },
                  { value: '12', label: '12 months' },
                ]}
              />
            }
          />
          <CardBody className="pt-3">
            {data ? (
              <TrendChart
                data={data.monthly.slice(range === '6' ? -6 : -12)}
                x="month"
                series={[
                  { key: 'gci', label: 'Gross commission (GCI)' },
                  { key: 'net', label: 'Agency net', color: '#3cb4e8' },
                ]}
                format={(v) => formatMoney(v)}
                height={290}
              />
            ) : (
              <Skeleton className="h-[290px]" />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="GCI by deal type" subtitle="Last 12 months" />
          <CardBody>{data ? <DonutChart data={data.byType} format={(v) => formatMoneyCompact(v)} centerLabel="total GCI" height={190} /> : <Skeleton className="h-[190px]" />}</CardBody>
        </Card>
      </div>

      {/* Pipeline + communities + viewings */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Leads pipeline"
            subtitle={data ? `${data.kpi.openLeads} open leads · ${formatMoneyCompact(data.kpi.pipelineValue)} potential commission` : ' '}
            actions={
              <Link to="/sales/leads" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-aura hover:underline">
                Open <ArrowUpRight className="size-3.5" />
              </Link>
            }
          />
          <CardBody className="space-y-3.5">
            {data
              ? data.funnel.map((f) => {
                  const max = Math.max(...data.funnel.map((x) => x.count), 1)
                  return (
                    <div key={f.stage}>
                      <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                        <span className="font-medium">{LEAD_STAGE[f.stage][0]}</span>
                        <span className="text-muted tabular">
                          <span className="font-semibold text-fg">{f.count}</span> · {formatMoneyCompact(f.value)}
                        </span>
                      </div>
                      <Progress value={(f.count / max) * 100} tone={f.stage === 'won' ? 'success' : 'brand'} />
                    </div>
                  )
                })
              : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
            {data && (
              <p className="border-t border-line pt-3 text-[12.5px] text-muted">
                Win rate <span className="font-semibold text-success">{data.winRate.toFixed(0)}%</span> on closed leads
              </p>
            )}
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Top communities" subtitle="Commission income, last 12 months" />
          <CardBody className="pt-2">{data ? <BarsChart data={data.topCommunities} x="name" series={[{ key: 'gci', label: 'GCI' }]} horizontal height={260} format={(v) => formatMoney(v)} /> : <Skeleton className="h-[260px]" />}</CardBody>
        </Card>

        <Card className="min-w-0 lg:col-span-2 xl:col-span-1">
          <CardHeader
            title="Upcoming viewings"
            subtitle="Next 7 days"
            actions={
              <Link to="/sales/viewings" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-aura hover:underline">
                All <ArrowUpRight className="size-3.5" />
              </Link>
            }
          />
          <CardBody className="pt-3">
            {!data ? (
              <Skeleton className="h-[260px]" />
            ) : data.upcomingViewings.length === 0 ? (
              <EmptyState icon={<Eye />} title="No viewings this week" />
            ) : (
              <ul className="-my-1 max-h-[300px] space-y-1 overflow-y-auto pe-1">
                {data.upcomingViewings.slice(0, 8).map((v) => {
                  const d = new Date(v.at)
                  const prop = dealProperty({ listingId: v.listingId, projectId: v.projectId, communitySlug: '' })
                  const who = leadById(v.leadId)?.name ?? customerById(v.clientId)?.name ?? 'Client'
                  const agent = employeeById(v.agentId)
                  return (
                    <li key={v.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                      {prop.image ? (
                        <img src={prop.image} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2">
                          <CalendarCheck2 className="size-5 text-muted" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{prop.title}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {who}
                        </span>
                      </span>
                      {agent && <Avatar name={agent.name} hue={agent.avatarHue} photo={agent.photo} size={28} />}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Agenda: tasks + events */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TasksDueCard />
        <UpcomingEventsCard />
      </div>

      {/* Recent deals + brokers */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="min-w-0 overflow-hidden xl:col-span-2">
          <CardHeader
            title="Recent deals"
            actions={
              <ButtonLink to="/sales/deals" variant="outline" size="sm">
                View all
              </ButtonLink>
            }
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[13.5px] whitespace-nowrap">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                  <th className="px-5 py-2.5 text-start font-semibold">Deal</th>
                  <th className="px-5 py-2.5 text-start font-semibold">Property</th>
                  <th className="hidden px-5 py-2.5 text-start font-semibold 2xl:table-cell">Client</th>
                  <th className="px-5 py-2.5 text-end font-semibold">Price</th>
                  <th className="hidden px-5 py-2.5 text-end font-semibold sm:table-cell">Commission</th>
                  <th className="px-5 py-2.5 text-start font-semibold">Stage</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent ?? []).map((d) => {
                  const c = customerById(d.clientId)
                  const prop = dealProperty(d)
                  return (
                    <tr key={d.id} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-aura">{d.code}</span>
                        <span className="block text-[12px] text-muted">{DEAL_TYPE[d.type]}</span>
                      </td>
                      <td className="max-w-[260px] px-5 py-3">
                        <span className="block truncate font-medium">{prop.title}</span>
                        <span className="block truncate text-[12px] text-muted">{prop.sub}</span>
                      </td>
                      <td className="hidden px-5 py-3 2xl:table-cell">{c && <PersonCell name={c.name} hue={c.avatarHue} size={28} />}</td>
                      <td className="px-5 py-3 text-end font-semibold tabular">{formatMoneyCompact(d.price)}</td>
                      <td className="hidden px-5 py-3 text-end tabular sm:table-cell">{formatMoney(d.commission)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge value={d.stage} map={DEAL_STAGE} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!data && <Skeleton className="m-5 h-[220px]" />}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Top brokers" subtitle="Commission income, last 90 days" />
          <CardBody>
            {!data ? (
              <Skeleton className="h-[260px]" />
            ) : (
              <ol className="space-y-4">
                {data.brokers.map((c, i) => {
                  const max = data.brokers[0]!.gci
                  return (
                    <li key={c.employee.id} className="flex items-center gap-3">
                      <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', i === 0 ? 'bg-brand-gradient text-white' : 'bg-surface-2 text-muted')}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <PersonCell name={c.employee.name} hue={c.employee.avatarHue} photo={c.employee.photo} sub={`${c.count} deals · ${c.employee.title}`} size={32} />
                          <span className="shrink-0 text-[13px] font-semibold tabular">{formatMoneyCompact(c.gci)}</span>
                        </div>
                        <Progress value={(c.gci / max) * 100} className="mt-2" />
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
