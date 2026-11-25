import { Columns3, Plus, Rows3, Sparkles, Target, Trophy, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchInput, Segmented, Select } from '@/components/ui/Form'
import { Kanban, type KanbanColumn } from '@/components/ui/Kanban'
import { PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatMoney, formatMoneyCompact, formatRelative } from '@/lib/format'
import { LEAD_INTEREST, LEAD_SOURCE, LEAD_STAGE, optionsOf, PRIORITY } from '@/lib/labels'
import { communityBySlug, COMMUNITIES, employeeById } from '@/mocks/core'
import { leads } from '@/mocks/domain'
import type { Lead, LeadStage } from '@/types/domain'
import { LeadDetailDrawer } from './LeadDetailDrawer'
import { LeadDrawer } from './LeadDrawer'
import { ConvertModal, LostModal } from './LeadModals'
import { brokerOptions, SourceChip } from './shared'

const DAY = 86_400_000
const STAGE_DOT: Record<LeadStage, string> = { new: 'bg-info', contacted: 'bg-royal', qualified: 'bg-aura', viewing: 'bg-cyan', negotiation: 'bg-warning', won: 'bg-success', lost: 'bg-danger' }
const COLUMNS: KanbanColumn<LeadStage>[] = (Object.keys(LEAD_STAGE) as LeadStage[]).map((s) => ({ id: s, title: LEAD_STAGE[s][0], dot: STAGE_DOT[s] }))
const PRIORITY_DOT = { high: 'bg-danger', medium: 'bg-warning', low: 'bg-muted/50' } as const

const lookingFor = (l: Lead) => `${LEAD_INTEREST[l.interest]} · ${l.beds ? `${l.beds} BR ` : ''}${l.propertyType} · ${communityBySlug(l.communitySlug)?.name ?? ''}`

export function LeadsPage() {
  const { data: all, isLoading } = leads.useList()
  const update = leads.useUpdate({ silent: true })
  const [creating, setCreating] = useCreateParam()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [q, setQ] = useState('')
  const [owner, setOwner] = useState('')
  const [source, setSource] = useState('')
  const [interest, setInterest] = useState('')
  const [community, setCommunity] = useState('')
  const [priority, setPriority] = useState('')
  const [editing, setEditing] = useState<Lead | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [losing, setLosing] = useState<Lead | null>(null)
  const [converting, setConverting] = useState<Lead | null>(null)

  const rows = all ?? []
  const open = rows.find((l) => l.id === openId) ?? null

  const kpi = useMemo(() => {
    const openLeads = rows.filter((l) => l.stage !== 'won' && l.stage !== 'lost')
    const won = rows.filter((l) => l.stage === 'won').length
    const lost = rows.filter((l) => l.stage === 'lost').length
    const week = rows.filter((l) => Date.now() - new Date(l.createdAt).getTime() < 7 * DAY)
    return { open: openLeads.length, hot: openLeads.filter((l) => l.priority === 'high').length, value: sum(openLeads, (l) => l.value), winRate: won + lost ? (won / (won + lost)) * 100 : 0, won, lost, week: week.length, portals: week.filter((l) => l.source === 'property-finder' || l.source === 'bayut' || l.source === 'dubizzle').length }
  }, [rows])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter(
      (l) =>
        (!owner || l.ownerId === owner) &&
        (!source || l.source === source) &&
        (!interest || l.interest === interest) &&
        (!community || l.communitySlug === community) &&
        (!priority || l.priority === priority) &&
        (!term || `${l.name} ${l.code} ${l.email} ${l.phone}`.toLowerCase().includes(term)),
    )
  }, [rows, q, owner, source, interest, community, priority])

  const onMove = (id: string, to: LeadStage) => {
    const l = rows.find((x) => x.id === id)
    if (!l) return
    if (to === 'lost') return setLosing(l)
    if (to === 'won' && !l.customerId) return setConverting(l)
    update.mutate({ id, patch: { stage: to, lastActivityAt: new Date().toISOString(), ...(l.stage === 'lost' ? { lostReason: undefined } : {}) } })
  }

  const columns: Column<Lead>[] = [
    { key: 'name', header: 'Lead', sort: (l) => l.name, cell: (l) => <PersonCell name={l.name} sub={l.phone || l.email} size={32} /> },
    { key: 'looking', header: 'Looking for', hideBelow: 'md', sort: (l) => l.interest, csv: lookingFor, cell: (l) => <span className="block max-w-[260px] truncate text-muted">{lookingFor(l)}</span> },
    { key: 'budget', header: 'Budget', align: 'end', sort: (l) => l.budget, cell: (l) => <span className="font-semibold tabular">{formatMoneyCompact(l.budget)}</span> },
    { key: 'value', header: 'Commission', align: 'end', hideBelow: 'xl', sort: (l) => l.value, cell: (l) => <span className="text-success tabular">{formatMoney(l.value)}</span> },
    { key: 'source', header: 'Source', hideBelow: 'lg', sort: (l) => LEAD_SOURCE[l.source], cell: (l) => <SourceChip source={l.source} /> },
    {
      key: 'owner',
      header: 'Owner',
      hideBelow: 'lg',
      sort: (l) => employeeById(l.ownerId)?.name ?? '',
      cell: (l) => {
        const e = employeeById(l.ownerId)
        return e ? <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} size={26} /> : '—'
      },
    },
    { key: 'priority', header: 'Priority', hideBelow: 'xl', sort: (l) => ['low', 'medium', 'high'].indexOf(l.priority), csv: (l) => l.priority, cell: (l) => <StatusBadge value={l.priority} map={PRIORITY} /> },
    { key: 'stage', header: 'Stage', sort: (l) => Object.keys(LEAD_STAGE).indexOf(l.stage), csv: (l) => l.stage, cell: (l) => <StatusBadge value={l.stage} map={LEAD_STAGE} /> },
    { key: 'activity', header: 'Last activity', hideBelow: '2xl', sort: (l) => l.lastActivityAt, cell: (l) => <span className="text-muted">{formatRelative(l.lastActivityAt)}</span> },
  ]

  const filters = (
    <>
      <Select value={owner} onChange={(e) => setOwner(e.target.value)} options={brokerOptions()} placeholder="All brokers" className="w-[calc(50%-4px)] sm:w-[170px]" aria-label="Owner broker" />
      <Select value={source} onChange={(e) => setSource(e.target.value)} options={optionsOf(LEAD_SOURCE)} placeholder="All sources" className="w-[calc(50%-4px)] sm:w-[160px]" aria-label="Source" />
      <Select value={interest} onChange={(e) => setInterest(e.target.value)} options={optionsOf(LEAD_INTEREST)} placeholder="Any interest" className="w-[calc(50%-4px)] sm:w-[145px]" aria-label="Interest" />
      <Select value={community} onChange={(e) => setCommunity(e.target.value)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} placeholder="All communities" className="w-[calc(50%-4px)] sm:w-[170px]" aria-label="Community" />
      <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={optionsOf(PRIORITY)} placeholder="Any priority" className="w-[calc(50%-4px)] sm:w-[140px]" aria-label="Priority" />
    </>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Enquiries from Property Finder, Bayut, Dubizzle, the website and referrals — qualify, book viewings, convert."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Leads' }]}
        actions={
          <>
            <ViewToggle view={view} setView={setView} />
            <Button icon={<Plus />} onClick={() => setCreating(true)}>
              New lead
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[136px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Open leads" value={kpi.open} icon={<Target />} footnote={`${kpi.hot} high priority`} />
            <StatCard label="Potential commission" value={formatMoneyCompact(kpi.value)} icon={<Wallet />} tone="royal" footnote="Expected GCI of open leads" />
            <StatCard label="Win rate" value={`${kpi.winRate.toFixed(0)}%`} icon={<Trophy />} tone="success" footnote={`${kpi.won} won · ${kpi.lost} lost`} />
            <StatCard label="New this week" value={kpi.week} icon={<Sparkles />} tone="cyan" footnote={`${kpi.portals} from portals`} />
          </>
        )}
      </div>

      {view === 'board' ? (
        <>
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="w-full sm:w-[240px]" aria-label="Search leads" />
            {filters}
          </Card>
          {isLoading ? (
            <Skeleton className="h-[460px] rounded-card" />
          ) : (
            <Kanban
              columns={COLUMNS}
              items={filtered}
              getColumn={(l) => l.stage}
              onMove={onMove}
              onCardClick={(l) => setOpenId(l.id)}
              columnSummary={(list) => <span className="tabular">{formatMoneyCompact(sum(list, (l) => l.value))} potential</span>}
              renderCard={(l) => <LeadCard lead={l} />}
            />
          )}
        </>
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          loading={isLoading}
          search={(l) => `${l.name} ${l.code} ${l.email} ${l.phone}`}
          searchPlaceholder="Search name, phone, email…"
          toolbar={filters}
          onRowClick={(l) => setOpenId(l.id)}
          exportName="leads"
          initialSort={{ key: 'activity', dir: 'desc' }}
        />
      )}

      <LeadDrawer open={creating || !!editing} lead={editing} onClose={() => (setCreating(false), setEditing(null))} onCreated={(l) => setOpenId(l.id)} />
      <LeadDetailDrawer lead={open} onClose={() => setOpenId(null)} onEdit={(l) => setEditing(l)} />
      <LostModal lead={losing} onClose={() => setLosing(null)} />
      <ConvertModal lead={converting} onClose={() => setConverting(null)} onConverted={() => undefined} />
    </div>
  )
}

function ViewToggle({ view, setView }: { view: 'board' | 'list'; setView: (v: 'board' | 'list') => void }) {
  return (
    <Segmented
      value={view}
      onChange={setView}
      options={[
        { value: 'board', label: <><Columns3 /> Board</> },
        { value: 'list', label: <><Rows3 /> List</> },
      ]}
    />
  )
}

function LeadCard({ lead: l }: { lead: Lead }) {
  const owner = employeeById(l.ownerId)
  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
            <span className={cn('size-2 shrink-0 rounded-full', PRIORITY_DOT[l.priority])} title={`${PRIORITY[l.priority][0]} priority`} />
            <span className="truncate">{l.name}</span>
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{lookingFor(l)}</p>
        </div>
        {owner && <Avatar name={owner.name} hue={owner.avatarHue} photo={owner.photo} size={26} />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-bold tabular">
          {formatMoneyCompact(l.budget)}
          {(l.interest === 'rent' || l.interest === 'list-rental') && <span className="text-[11.5px] font-medium text-muted"> /yr</span>}
        </span>
        <SourceChip source={l.source} className="px-2 text-[10.5px]" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-[11.5px] text-muted">
        <span>{formatRelative(l.lastActivityAt)}</span>
        {l.stage === 'lost' && l.lostReason ? <span className="truncate text-danger">{l.lostReason}</span> : l.customerId ? <span className="font-semibold text-success">Client</span> : <span>{l.code}</span>}
      </div>
    </div>
  )
}
