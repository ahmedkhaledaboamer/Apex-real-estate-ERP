import { Link, useNavigate } from '@tanstack/react-router'
import { BadgeDollarSign, Building2, CalendarClock, Layers, Plus, Rocket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchInput, Segmented, Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { formatMoneyCompact, formatNumber } from '@/lib/format'
import { OFFPLAN_STATUS } from '@/lib/labels'
import { communityBySlug, DEVELOPERS, developerBySlug } from '@/mocks/core'
import { deals, offplanProjects } from '@/mocks/domain'
import type { Deal, OffPlanProject, OffPlanStatus } from '@/types/domain'
import { OffplanDrawer } from './OffplanDrawer'
import { projectStats } from './offplanStats'
import { closedWithin, Photo } from './shared'

export function OffplanPage() {
  const { data, isLoading } = offplanProjects.useList()
  const { data: allDeals = [] } = deals.useList()
  const [creating, setCreating] = useCreateParam()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'all' | OffPlanStatus>('all')
  const [developer, setDeveloper] = useState('')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (data ?? []).filter((p) => (status === 'all' || p.status === status) && (!developer || p.developerSlug === developer) && (!term || `${p.name} ${developerBySlug(p.developerSlug)?.name} ${communityBySlug(p.communitySlug)?.name}`.toLowerCase().includes(term)))
  }, [data, status, developer, q])

  const kpi = useMemo(() => {
    const all = data ?? []
    const live = all.filter((p) => p.status === 'launching' || p.status === 'selling')
    const op = allDeals.filter((d) => d.type === 'offplan')
    return {
      live: live.length,
      allocated: live.reduce((a, p) => a + p.allocated, 0),
      sold: op.filter((d) => d.stage !== 'cancelled' && live.some((p) => p.id === d.projectId)).length,
      gci: op.filter((d) => closedWithin(d, 365)).reduce((a, d) => a + d.commission, 0),
      pipeline: op.filter((d) => d.stage !== 'cancelled' && d.stage !== 'closed').reduce((a, d) => a + d.commission, 0),
    }
  }, [data, allDeals])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Off-plan projects"
        description="Developer launches we hold allocations in — sell-through, payment plans and developer commission."
        breadcrumbs={[{ label: 'Services' }, { label: 'Off-plan projects' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New project
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Live projects" value={kpi.live} icon={<Rocket />} footnote="Launching or selling" />
            <StatCard label="Units allocated" value={formatNumber(kpi.allocated)} icon={<Layers />} tone="royal" footnote={`${formatNumber(kpi.sold)} sold by us · ${kpi.allocated ? Math.round((kpi.sold / kpi.allocated) * 100) : 0}% sell-through`} />
            <StatCard label="Off-plan GCI · 12 months" value={formatMoneyCompact(kpi.gci)} icon={<BadgeDollarSign />} tone="success" footnote="Developer commission on closed deals" />
            <StatCard label="Commission in pipeline" value={formatMoneyCompact(kpi.pipeline)} icon={<CalendarClock />} tone="warning" footnote="Offers and MOUs not yet closed" />
          </>
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project, developer…" className="w-full sm:w-[240px]" aria-label="Search projects" />
        <div className="max-w-full overflow-x-auto">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[{ value: 'all' as const, label: 'All' }, ...(Object.keys(OFFPLAN_STATUS) as OffPlanStatus[]).map((s) => ({ value: s, label: OFFPLAN_STATUS[s][0] }))]}
          />
        </div>
        <Select aria-label="Developer" value={developer} onChange={(e) => setDeveloper(e.target.value)} options={DEVELOPERS.map((d) => ({ value: d.slug, label: d.name }))} placeholder="All developers" className="w-full sm:w-[180px]" />
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[380px] rounded-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Building2 />} title="No projects match" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <ProjectCard key={p.id} project={p} deals={allDeals} />
          ))}
        </div>
      )}

      <OffplanDrawer open={creating} onClose={() => setCreating(false)} onCreated={(p) => navigate({ to: '/services/offplan/$projectId', params: { projectId: p.id } })} />
    </div>
  )
}

export function ProjectCard({ project: p, deals }: { project: OffPlanProject; deals: Deal[] }) {
  const s = projectStats(p, deals)
  const dev = developerBySlug(p.developerSlug)
  return (
    <Link
      to="/services/offplan/$projectId"
      params={{ projectId: p.id }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[box-shadow,border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-aura/30 hover:shadow-lift"
    >
      <Photo src={p.image} alt={p.name} className="aspect-[16/10]" sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" imgClassName="transition-transform duration-500 group-hover:scale-[1.03]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full bg-surface/95 shadow-sm">
            <StatusBadge value={p.status} map={OFFPLAN_STATUS} />
          </span>
          <span className="rounded-full bg-brand-gradient px-2.5 py-1 text-[11.5px] font-bold text-white shadow-sm">{p.commissionRate}% commission</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="truncate text-[17px] font-bold tracking-[-0.01em]">{p.name}</p>
          <p className="truncate text-[12.5px] text-white/80">
            {dev?.name} · {communityBySlug(p.communitySlug)?.name}
          </p>
        </div>
      </Photo>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid grid-cols-3 gap-2 text-[12px]">
          <div className="min-w-0">
            <p className="text-muted">From</p>
            <p className="truncate text-[14px] font-bold tabular">{formatMoneyCompact(p.fromPrice)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted">Plan</p>
            <p className="truncate text-[14px] font-bold tabular">{p.plan}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted">Handover</p>
            <p className="truncate text-[14px] font-bold">{p.handover}</p>
          </div>
        </div>
        <div className="mt-auto">
          <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
            <span className="font-medium">Allocation sold</span>
            <span className="text-muted tabular">
              <span className="font-semibold text-fg">{s.sold}</span> / {p.allocated} units · {Math.round(s.pct)}%
            </span>
          </div>
          <Progress value={s.pct} tone={s.pct >= 90 ? 'success' : 'brand'} />
          <p className="mt-2.5 flex justify-between text-[12px] text-muted">
            <span>{formatNumber(p.totalUnits)} units in project</span>
            <span>
              GCI <span className="font-semibold text-fg tabular">{formatMoneyCompact(s.gci)}</span>
            </span>
          </p>
        </div>
      </div>
    </Link>
  )
}
