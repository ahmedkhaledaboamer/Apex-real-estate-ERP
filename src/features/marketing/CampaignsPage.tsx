import { Megaphone, Pause, Pencil, Play, Plus, Target, TrendingUp, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarsChart, DonutChart } from '@/components/charts/Charts'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Form'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { PageHeader, Progress, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { toast } from '@/components/ui/Toast'
import { useCreateParam } from '@/hooks/useCreateParam'
import { sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatCompact, formatMoney, formatMoneyCompact, formatNumber, formatShortDate } from '@/lib/format'
import { LEAD_SOURCE } from '@/lib/labels'
import { communityBySlug } from '@/mocks/core'
import { leads, offplanById } from '@/mocks/domain'
import { campaigns } from '@/mocks/marketing'
import type { LeadSource } from '@/types/domain'
import type { Campaign, CampaignChannel, CampaignStatus } from '@/types/marketing'
import { CampaignDrawer } from './CampaignDrawer'
import { CAMPAIGN_CHANNEL, CAMPAIGN_STATUS, CHANNEL_OPTIONS } from './labels'

type Filter = 'all' | CampaignStatus

const ctr = (c: Campaign) => (c.impressions ? (c.clicks / c.impressions) * 100 : 0)
const cpl = (c: Campaign) => (c.leads ? c.spent / c.leads : 0)
const roi = (c: Campaign) => (c.spent ? c.gciAttributed / c.spent : 0)

export function ChannelBadge({ channel }: { channel: CampaignChannel }) {
  const ch = CAMPAIGN_CHANNEL[channel]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-fg/80 ring-1 ring-line ring-inset">
      <span className="size-2 rounded-full" style={{ background: ch.color }} />
      {ch.label}
    </span>
  )
}

function target(c: Campaign) {
  const p = offplanById(c.offplanProjectId)
  if (p) return p.name
  return communityBySlug(c.communitySlug)?.name ?? 'Brand / all areas'
}

export function CampaignsPage() {
  const { data, isLoading } = campaigns.useList()
  const { data: allLeads } = leads.useList()
  const update = campaigns.useUpdate({ silent: true })
  const [creating, setCreating] = useCreateParam()
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [status, setStatus] = useState<Filter>('all')
  const [channel, setChannel] = useState<'' | CampaignChannel>('')

  const list = data ?? []
  const stats = useMemo(() => {
    const spend = sum(list, (c) => c.spent)
    const lds = sum(list, (c) => c.leads)
    const dls = sum(list, (c) => c.deals)
    const gci = sum(list, (c) => c.gciAttributed)
    const budget = sum(list.filter((c) => c.status === 'active' || c.status === 'scheduled' || c.status === 'paused'), (c) => c.budget)
    const byChannel = (Object.keys(CAMPAIGN_CHANNEL) as CampaignChannel[])
      .map((ch) => {
        const rows = list.filter((c) => c.channel === ch)
        return { name: CAMPAIGN_CHANNEL[ch].label, color: CAMPAIGN_CHANNEL[ch].color, spend: sum(rows, (c) => c.spent), gci: sum(rows, (c) => c.gciAttributed) }
      })
      .filter((r) => r.spend > 0 || r.gci > 0)
      .sort((a, b) => b.gci - a.gci)
    return { spend, leads: lds, deals: dls, gci, budget, byChannel, active: list.filter((c) => c.status === 'active').length }
  }, [list])

  const leadSources = useMemo(() => {
    const m = new Map<LeadSource, number>()
    for (const l of allLeads ?? []) m.set(l.source, (m.get(l.source) ?? 0) + 1)
    return [...m.entries()].map(([s, value]) => ({ name: LEAD_SOURCE[s], value })).sort((a, b) => b.value - a.value)
  }, [allLeads])

  const rows = useMemo(() => list.filter((c) => (status === 'all' || c.status === status) && (!channel || c.channel === channel)), [list, status, channel])
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: list.length }
    for (const c of list) m[c.status] = (m[c.status] ?? 0) + 1
    return m
  }, [list])

  const toggle = (c: Campaign) => {
    const next: CampaignStatus = c.status === 'paused' ? 'active' : 'paused'
    update.mutate({ id: c.id, patch: { status: next } }, { onSuccess: () => toast.success(`${c.name} ${next === 'paused' ? 'paused' : 'resumed'}`) })
  }

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      cell: (c) => (
        <div className="min-w-0 max-w-[260px]">
          <div className="truncate font-semibold">{c.name}</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
            <ChannelBadge channel={c.channel} />
            <span className="truncate">{target(c)}</span>
          </div>
        </div>
      ),
      sort: (c) => c.name,
    },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge value={c.status} map={CAMPAIGN_STATUS} />, sort: (c) => c.status },
    { key: 'dates', header: 'Dates', cell: (c) => <span className="text-muted tabular">{formatShortDate(c.startDate)} – {formatShortDate(c.endDate)}</span>, sort: (c) => c.startDate, csv: (c) => `${c.startDate} – ${c.endDate}`, hideBelow: '2xl' },
    {
      key: 'budget',
      header: 'Spent / budget',
      cell: (c) => {
        const pct = c.budget ? (c.spent / c.budget) * 100 : 0
        return (
          <div className="w-[140px]">
            <div className="flex justify-between text-[12px] tabular">
              <span className="font-semibold">{formatMoneyCompact(c.spent)}</span>
              <span className="text-muted">{formatCompact(c.budget)}</span>
            </div>
            <Progress value={pct} tone={pct > 100 ? 'danger' : 'brand'} className="mt-1.5" />
          </div>
        )
      },
      sort: (c) => c.spent,
      csv: (c) => `${c.spent} / ${c.budget}`,
      hideBelow: 'md',
    },
    { key: 'ctr', header: 'CTR', align: 'end', cell: (c) => <span className="tabular">{c.impressions ? `${ctr(c).toFixed(2)}%` : '—'}</span>, sort: ctr, hideBelow: 'xl' },
    { key: 'leads', header: 'Leads', align: 'end', cell: (c) => <span className="font-semibold tabular">{formatNumber(c.leads)}</span>, sort: (c) => c.leads },
    { key: 'cpl', header: 'CPL', align: 'end', cell: (c) => <span className="tabular">{c.leads ? formatMoney(cpl(c)) : '—'}</span>, sort: cpl, hideBelow: 'md' },
    { key: 'deals', header: 'Deals', align: 'end', cell: (c) => <span className="tabular">{c.deals}</span>, sort: (c) => c.deals, hideBelow: '2xl' },
    {
      key: 'roi',
      header: 'ROI',
      align: 'end',
      cell: (c) => (c.spent ? <span className={cn('font-semibold tabular', roi(c) >= 5 ? 'text-success' : roi(c) >= 1 ? 'text-fg' : 'text-danger')}>{roi(c).toFixed(1)}×</span> : <span className="text-muted">—</span>),
      sort: roi,
      hideBelow: 'sm',
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (c) => {
        const items: MenuItem[] = [{ label: 'Edit', icon: <Pencil />, onSelect: () => setEditing(c) }]
        if (c.status === 'active' || c.status === 'paused') items.push({ label: c.status === 'paused' ? 'Resume' : 'Pause', icon: c.status === 'paused' ? <Play /> : <Pause />, onSelect: () => toggle(c) })
        if (c.status === 'draft' || c.status === 'scheduled') items.push({ label: 'Launch now', icon: <Play />, onSelect: () => update.mutate({ id: c.id, patch: { status: 'active' } }, { onSuccess: () => toast.success(`${c.name} is live`) }) })
        return <Menu items={items} />
      },
    },
  ]

  const tabs = (['all', 'active', 'scheduled', 'paused', 'completed', 'draft'] as const)
    .filter((t) => t === 'all' || counts[t])
    .map((t) => ({ value: t, label: t === 'all' ? 'All' : CAMPAIGN_STATUS[t][0], count: counts[t] ?? 0 }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Paid campaigns across Meta, Google, TikTok, portals and offline — spend, leads and the commission they bring in."
        breadcrumbs={[{ label: 'Marketing' }, { label: 'Campaigns' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New campaign
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Total spend · 12 months" value={formatMoneyCompact(stats.spend)} icon={<Megaphone />} footnote={`${stats.active} active · ${formatMoneyCompact(stats.budget)} live budget`} />
            <StatCard label="Leads generated" value={formatNumber(stats.leads)} icon={<Target />} tone="royal" footnote={`Cost per lead ${formatMoney(stats.leads ? stats.spend / stats.leads : 0)}`} />
            <StatCard label="Cost per deal" value={formatMoneyCompact(stats.deals ? stats.spend / stats.deals : 0)} icon={<Trophy />} tone="cyan" footnote={`${stats.deals} deals closed from campaigns`} />
            <StatCard label="Marketing ROI" value={`${(stats.spend ? stats.gci / stats.spend : 0).toFixed(1)}×`} icon={<TrendingUp />} tone="success" footnote={`${formatMoneyCompact(stats.gci)} GCI attributed`} />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Spend vs GCI by channel" subtitle="Commission attributed to each channel's closed deals" />
          <CardBody>
            {isLoading ? <Skeleton className="h-[280px]" /> : <BarsChart data={stats.byChannel} x="name" series={[{ key: 'spend', label: 'Spend' }, { key: 'gci', label: 'GCI attributed', color: '#1f9d64' }]} format={(v) => formatMoney(v)} />}
            {!isLoading && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-2.5 text-[12px] font-semibold tracking-[0.04em] text-muted uppercase">Return on spend</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {stats.byChannel.map((r) => (
                    <div key={r.name} className="rounded-xl bg-surface-2/70 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 truncate text-[12px] text-muted">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />
                        {r.name}
                      </p>
                      <p className="mt-0.5 text-[15px] font-bold tabular">{r.spend ? `${(r.gci / r.spend).toFixed(1)}×` : '—'}</p>
                      <p className="text-[11.5px] text-muted tabular">{formatMoneyCompact(r.spend)} spent</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Leads by source" subtitle={`All ${allLeads?.length ?? 0} leads in the CRM`} />
          <CardBody>{allLeads ? <DonutChart data={leadSources} format={(v) => formatNumber(v)} centerLabel="leads" /> : <Skeleton className="h-[220px]" />}</CardBody>
        </Card>
      </div>

      <div className="space-y-3">
        <Tabs value={status} onChange={setStatus} tabs={tabs} />
        <DataTable
          rows={rows}
          columns={columns}
          loading={isLoading}
          search={(c) => `${c.name} ${c.code} ${target(c)} ${CAMPAIGN_CHANNEL[c.channel].label}`}
          searchPlaceholder="Search campaigns…"
          toolbar={<Select value={channel} onChange={(e) => setChannel(e.target.value as '' | CampaignChannel)} options={CHANNEL_OPTIONS} placeholder="All channels" className="w-full sm:w-[180px]" aria-label="Channel" />}
          onRowClick={setEditing}
          exportName="campaigns"
          initialSort={{ key: 'dates', dir: 'desc' }}
        />
      </div>

      <CampaignDrawer open={creating || !!editing} onClose={() => (editing ? setEditing(null) : setCreating(false))} campaign={editing} />
    </div>
  )
}
