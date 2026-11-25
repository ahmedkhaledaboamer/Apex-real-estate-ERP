import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, BadgeDollarSign, CalendarClock, Download, Layers, Pencil, Percent } from 'lucide-react'
import { useState } from 'react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DetailRow, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { toast } from '@/components/ui/Toast'
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format'
import { OFFPLAN_STATUS } from '@/lib/labels'
import { communityBySlug, developerBySlug } from '@/mocks/core'
import { deals, offplanProjects, viewings } from '@/mocks/domain'
import { PROJECT_DETAILS } from '@/mocks/site/projects'
import { OffplanDrawer } from './OffplanDrawer'
import { projectStats } from './offplanStats'
import { DealsCard, Photo, planFromString, ViewingsCard } from './shared'

export function OffplanDetailPage({ projectId }: { projectId: string }) {
  const { data: all, isLoading } = offplanProjects.useList()
  const { data: allDeals } = deals.useList()
  const { data: allViewings = [] } = viewings.useList()
  const [editing, setEditing] = useState(false)
  const p = all?.find((x) => x.id === projectId)

  if (isLoading) return <Skeleton className="h-[70vh] rounded-card" />
  if (!p)
    return (
      <Card>
        <EmptyState
          title="Project not found"
          action={
            <ButtonLink to="/services/offplan" variant="outline" icon={<ArrowLeft />}>
              Back to projects
            </ButtonLink>
          }
        />
      </Card>
    )

  const site = PROJECT_DETAILS.find((d) => `prj-${d.slug}` === p.id)
  const dev = developerBySlug(p.developerSlug)
  const community = communityBySlug(p.communitySlug)
  const s = projectStats(p, allDeals ?? [])
  const plan = site?.paymentPlan ?? planFromString(p.plan, p.handover)
  const projViewings = allViewings.filter((v) => v.projectId === p.id)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Services' }, { label: 'Off-plan projects', to: '/services/offplan' }, { label: p.name }]}
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {dev?.name} · {community?.name} · Handover {p.handover}
            </span>
            <StatusBadge value={p.status} map={OFFPLAN_STATUS} />
          </span>
        }
        actions={
          <>
            <Button variant="outline" icon={<Download />} onClick={() => toast.info(`Brochure for ${p.name} is downloading…`)}>
              Brochure
            </Button>
            <Button icon={<Pencil />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <Photo src={p.image} alt={p.name} className="aspect-[16/10] sm:aspect-[21/8]" sizes="100vw">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white md:p-7">
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-white/75">Starting from</p>
              <p className="text-[26px] leading-tight font-bold tracking-[-0.02em] tabular md:text-[32px]">{formatMoney(p.fromPrice)}</p>
              {site && <p className="mt-1 max-w-xl text-[13.5px] text-white/80">{site.summary}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-semibold backdrop-blur-sm">{p.plan} payment plan</span>
              <span className="rounded-full bg-brand-gradient px-3 py-1 text-[12.5px] font-semibold">{p.commissionRate}% commission</span>
            </div>
          </div>
        </Photo>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Units sold by us" value={`${s.sold} / ${p.allocated}`} icon={<Layers />} footnote={`${Math.round(s.pct)}% of our allocation · ${formatNumber(p.totalUnits)} in project`} />
        <StatCard label="GCI earned" value={formatMoneyCompact(s.gci)} icon={<BadgeDollarSign />} tone="success" footnote={`${s.closed} closed · ${formatMoneyCompact(s.collected)} collected`} />
        <StatCard label="Commission in pipeline" value={formatMoneyCompact(s.pipeline)} icon={<CalendarClock />} tone="warning" footnote={`${s.sold - s.closed} deal${s.sold - s.closed === 1 ? '' : 's'} in progress`} />
        <StatCard label="Sales volume" value={formatMoneyCompact(s.volume)} icon={<Percent />} tone="royal" footnote={`${p.commissionRate}% paid by ${dev?.name ?? 'developer'}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Payment plan" subtitle={`${p.plan} · amounts shown on the starting price of ${formatMoney(p.fromPrice)}`} actions={!site ? <Badge tone="info">Indicative</Badge> : undefined} />
          <CardBody>
            <ol className="relative space-y-4 border-s border-line ps-5">
              {plan.map((m, i) => (
                <li key={i} className="relative">
                  <span className="absolute -start-[27px] top-1 grid size-3.5 place-items-center rounded-full bg-surface ring-2 ring-aura" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-[13.5px] font-semibold">{m.label}</p>
                    <p className="text-[13px] tabular">
                      <span className="font-bold">{m.percent}%</span> <span className="text-muted">· {formatMoney(Math.round((p.fromPrice * m.percent) / 100))}</span>
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Progress value={m.percent} className="flex-1" />
                    <span className="w-32 shrink-0 truncate text-end text-[12px] text-muted">{m.due}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-2/60 p-3">
                <p className="text-[11.5px] text-muted">During construction</p>
                <p className="mt-0.5 text-[16px] font-bold tabular">{p.plan.split('/')[0]}%</p>
              </div>
              <div className="rounded-xl bg-surface-2/60 p-3">
                <p className="text-[11.5px] text-muted">On handover</p>
                <p className="mt-0.5 text-[16px] font-bold tabular">{p.plan.split('/')[1]}%</p>
              </div>
              <div className="rounded-xl bg-aura/10 p-3">
                <p className="text-[11.5px] text-muted">Our commission per unit</p>
                <p className="mt-0.5 text-[16px] font-bold tabular">from {formatMoneyCompact(Math.round((p.fromPrice * p.commissionRate) / 100))}</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-muted">Developer releases our {p.commissionRate}% once the buyer has paid 20% and the SPA is registered with DLD (Oqood).</p>
          </CardBody>
        </Card>

        <div className="min-w-0 space-y-4">
          {dev && (
            <Card className="overflow-hidden">
              <Photo src={dev.image} className="aspect-[16/7]" sizes="400px" />
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{dev.name}</p>
                    <p className="text-[12.5px] text-muted">
                      Since {dev.founded} · {dev.hq} · {dev.deliveredUnits} units delivered
                    </p>
                  </div>
                  <Link to="/services/developers/$slug" params={{ slug: dev.slug }} className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-aura hover:underline">
                    Profile <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
                <p className="text-[13px] text-muted">{dev.summary}</p>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Project facts" />
            <CardBody className="divide-y divide-line pt-2">
              <DetailRow label="Total units">{formatNumber(site?.totalUnits ?? p.totalUnits)}</DetailRow>
              <DetailRow label="Allocated to us">{formatNumber(p.allocated)}</DetailRow>
              {site && (
                <>
                  <DetailRow label="Launched">{site.launchDate}</DetailRow>
                  <DetailRow label="Floors">{site.floors}</DetailRow>
                  <DetailRow label="DLD project no.">{site.dldProjectNumber}</DetailRow>
                  <DetailRow label="Escrow bank">{site.escrowBank}</DetailRow>
                </>
              )}
              <DetailRow label="Community">
                <Link to="/services/communities/$slug" params={{ slug: p.communitySlug }} className="text-aura hover:underline">
                  {community?.name}
                </Link>
              </DetailRow>
            </CardBody>
          </Card>
        </div>
      </div>

      {site && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Unit types" subtitle="Developer price list" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[13.5px] whitespace-nowrap">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                  <th className="px-5 py-2.5 text-start font-semibold">Type</th>
                  <th className="px-5 py-2.5 text-end font-semibold">Size (sqft)</th>
                  <th className="px-5 py-2.5 text-end font-semibold">From</th>
                  <th className="hidden px-5 py-2.5 text-end font-semibold sm:table-cell">AED / sqft</th>
                  <th className="px-5 py-2.5 text-end font-semibold">Available</th>
                </tr>
              </thead>
              <tbody>
                {site.unitTypes.map((u) => (
                  <tr key={u.type} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3 font-semibold">{u.type}</td>
                    <td className="px-5 py-3 text-end tabular">
                      {formatNumber(u.sizeFrom)}–{formatNumber(u.sizeTo)}
                    </td>
                    <td className="px-5 py-3 text-end font-semibold tabular">{formatMoneyCompact(u.fromAed)}</td>
                    <td className="hidden px-5 py-3 text-end text-muted tabular sm:table-cell">{formatNumber(Math.round(u.fromAed / u.sizeFrom))}</td>
                    <td className="px-5 py-3 text-end">
                      <Badge tone={u.available <= 3 ? 'warning' : 'success'}>{u.available} left</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {site && (
        <Card>
          <CardHeader title="About the project" />
          <CardBody className="space-y-3 text-[13.5px] text-muted">
            {site.description.map((d, i) => (
              <p key={i}>{d}</p>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {site.amenities.map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 2xl:grid-cols-5">
        <div className="min-w-0 2xl:col-span-3">
          <DealsCard deals={s.deals} title="Deals" subtitle="Reservations and SPAs we brokered in this project" loading={!allDeals} hideProperty />
        </div>
        <ViewingsCard viewings={projViewings} title="Sales-centre viewings" className="2xl:col-span-2" />
      </div>

      <OffplanDrawer open={editing} onClose={() => setEditing(false)} project={p} />
    </div>
  )
}
