import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { CalendarCheck2, CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock, List, UserX, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented, Select } from '@/components/ui/Form'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { Modal } from '@/components/ui/Overlay'
import { StatCard } from '@/components/ui/StatCard'
import { dealProperty } from '@/features/dashboard/DashboardPage'
import { useCreateParam } from '@/hooks/useCreateParam'
import { cn } from '@/lib/cn'
import { optionsOf, VIEWING_STATUS } from '@/lib/labels'
import { today } from '@/lib/random'
import { employeeById } from '@/mocks/core'
import { viewings } from '@/mocks/domain'
import type { Viewing } from '@/types/domain'
import { brokerOptions, fmtDay, fmtTime, PropertyThumb, Stars, viewingWho } from './shared'
import { ViewingCompleteDrawer, ViewingDrawer } from './ViewingDrawer'

const DAY = 86_400_000
const HOURS = Array.from({ length: 12 }, (_, i) => 9 + i) // 9:00–20:00
const SLOT = 56

const propOf = (v: Viewing) => dealProperty({ listingId: v.listingId, projectId: v.projectId, communitySlug: '' })

type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'past'
const BUCKET_LABEL: Record<Bucket, string> = { overdue: 'Needs an outcome', today: 'Today', tomorrow: 'Tomorrow', week: 'This week', later: 'Later', past: 'Past 30 days' }

function bucketOf(v: Viewing): Bucket {
  const t0 = today().getTime()
  const t = new Date(v.at).getTime()
  if (t < t0) return v.status === 'scheduled' ? 'overdue' : 'past'
  if (t < t0 + DAY) return v.status === 'scheduled' && t < Date.now() ? 'overdue' : 'today'
  if (t < t0 + 2 * DAY) return 'tomorrow'
  const weekEnd = addDays(startOfWeek(today(), { weekStartsOn: 1 }), 7).getTime()
  return t < weekEnd ? 'week' : 'later'
}

export function ViewingsPage() {
  const { data: all, isLoading } = viewings.useList()
  const update = viewings.useUpdate()
  const [creating, setCreating] = useCreateParam()
  const [view, setView] = useState<'agenda' | 'week'>('agenda')
  const [range, setRange] = useState<'upcoming' | 'past'>('upcoming')
  const [broker, setBroker] = useState('')
  const [status, setStatus] = useState('')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today(), { weekStartsOn: 1 }))
  const [editing, setEditing] = useState<Viewing | null>(null)
  const [completing, setCompleting] = useState<Viewing | null>(null)
  const [selected, setSelected] = useState<Viewing | null>(null)

  const rows = all ?? []
  const kpi = useMemo(() => {
    const t0 = today().getTime()
    const ws = startOfWeek(today(), { weekStartsOn: 1 }).getTime()
    const todays = rows.filter((v) => v.status !== 'cancelled' && new Date(v.at).getTime() >= t0 && new Date(v.at).getTime() < t0 + DAY)
    const week = rows.filter((v) => v.status !== 'cancelled' && new Date(v.at).getTime() >= ws && new Date(v.at).getTime() < ws + 7 * DAY)
    const last30 = rows.filter((v) => new Date(v.at).getTime() < Date.now() && Date.now() - new Date(v.at).getTime() < 30 * DAY)
    const completed = last30.filter((v) => v.status === 'completed').length
    const noShow = last30.filter((v) => v.status === 'no-show').length
    const held = last30.filter((v) => v.status !== 'cancelled' && v.status !== 'scheduled').length
    return { today: todays.length, todayLeft: todays.filter((v) => v.status === 'scheduled').length, week: week.length, rate: held ? (completed / held) * 100 : 0, completed, noShow }
  }, [rows])

  const filtered = useMemo(() => rows.filter((v) => (!broker || v.agentId === broker) && (!status || v.status === status)), [rows, broker, status])

  const groups = useMemo(() => {
    const order: Bucket[] = range === 'upcoming' ? ['overdue', 'today', 'tomorrow', 'week', 'later'] : ['past']
    const map = new Map<Bucket, Viewing[]>()
    for (const v of filtered) {
      const b = bucketOf(v)
      if (b === 'past' && Date.now() - new Date(v.at).getTime() > 30 * DAY) continue
      if (!order.includes(b)) continue
      ;(map.get(b) ?? map.set(b, []).get(b)!).push(v)
    }
    return order.filter((b) => map.has(b)).map((b) => ({ bucket: b, items: map.get(b)!.sort((x, y) => (b === 'past' ? y.at.localeCompare(x.at) : x.at.localeCompare(y.at))) }))
  }, [filtered, range])

  const setStatusOf = (v: Viewing, s: Viewing['status']) => update.mutate({ id: v.id, patch: { status: s } })
  const actions = (v: Viewing): MenuItem[] => [
    { label: 'Complete with feedback', icon: <CheckCircle2 />, onSelect: () => setCompleting(v) },
    ...(v.status === 'scheduled' ? [{ label: 'Reschedule', icon: <Clock />, onSelect: () => setEditing(v) }] : []),
    ...(v.status !== 'no-show' ? [{ label: 'Mark no-show', icon: <UserX />, onSelect: () => setStatusOf(v, 'no-show') }] : []),
    ...(v.status !== 'cancelled' ? [{ label: 'Cancel viewing', icon: <XCircle />, onSelect: () => setStatusOf(v, 'cancelled'), danger: true }] : []),
  ]

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekItems = filtered.filter((v) => {
    const t = new Date(v.at).getTime()
    return t >= weekStart.getTime() && t < weekStart.getTime() + 7 * DAY && v.status !== 'cancelled'
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viewings"
        description="Property viewings for leads and clients — agenda, weekly calendar and outcomes."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Viewings' }]}
        actions={
          <Button icon={<CalendarPlus />} onClick={() => setCreating(true)}>
            Schedule viewing
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[136px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Today" value={kpi.today} icon={<CalendarCheck2 />} footnote={`${kpi.todayLeft} still to go`} />
            <StatCard label="This week" value={kpi.week} icon={<CalendarDays />} tone="royal" footnote="Monday to Sunday" />
            <StatCard label="Completion rate" value={`${kpi.rate.toFixed(0)}%`} icon={<CheckCircle2 />} tone="success" footnote={`${kpi.completed} completed · last 30 days`} />
            <StatCard label="No-shows" value={kpi.noShow} icon={<UserX />} tone={kpi.noShow ? 'danger' : 'success'} footnote="Last 30 days" />
          </>
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'agenda', label: <><List /> Agenda</> },
            { value: 'week', label: <><CalendarDays /> Week</> },
          ]}
        />
        {view === 'agenda' && (
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ]}
          />
        )}
        <Select value={broker} onChange={(e) => setBroker(e.target.value)} options={brokerOptions()} placeholder="All brokers" className="w-[calc(50%-4px)] sm:ms-auto sm:w-[180px]" aria-label="Broker" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={optionsOf(VIEWING_STATUS)} placeholder="All statuses" className="w-[calc(50%-4px)] sm:w-[150px]" aria-label="Status" />
      </Card>

      {isLoading ? (
        <Skeleton className="h-[420px] rounded-card" />
      ) : view === 'agenda' ? (
        groups.length === 0 ? (
          <Card>
            <EmptyState icon={<CalendarDays />} title={range === 'upcoming' ? 'No upcoming viewings' : 'No viewings in the last 30 days'} action={<Button onClick={() => setCreating(true)}>Schedule viewing</Button>} />
          </Card>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.bucket}>
                <h2 className={cn('mb-2 flex items-center gap-2 text-[13px] font-semibold', g.bucket === 'overdue' ? 'text-warning' : 'text-muted')}>
                  {BUCKET_LABEL[g.bucket]}
                  <span className="rounded-full bg-surface-2 px-1.5 text-[11px] ring-1 ring-line">{g.items.length}</span>
                </h2>
                <Card className="divide-y divide-line overflow-hidden">
                  {g.items.map((v) => (
                    <AgendaRow key={v.id} v={v} showDay={g.bucket !== 'today' && g.bucket !== 'tomorrow'} actions={actions(v)} onOpen={() => setSelected(v)} />
                  ))}
                </Card>
              </section>
            ))}
          </div>
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">
                <ChevronLeft className="rtl:rotate-180" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(today(), { weekStartsOn: 1 }))}>
                This week
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">
                <ChevronRight className="rtl:rotate-180" />
              </Button>
            </div>
            <p className="text-[13.5px] font-semibold tabular">
              {format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')} · <span className="font-normal text-muted">{weekItems.length} viewings</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[860px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
              <div className="border-b border-line" />
              {weekDays.map((d) => (
                <div key={d.toISOString()} className={cn('border-b border-s border-line px-2 py-2 text-center', isSameDay(d, new Date()) && 'bg-aura/5')}>
                  <p className="text-[11px] font-semibold text-muted uppercase">{format(d, 'EEE')}</p>
                  <p className={cn('mx-auto mt-0.5 grid size-7 place-items-center rounded-full text-[13.5px] font-bold tabular', isSameDay(d, new Date()) && 'bg-brand-gradient text-white')}>{format(d, 'd')}</p>
                </div>
              ))}
              <div>
                {HOURS.map((h) => (
                  <div key={h} className="pe-2 text-end text-[11px] text-muted tabular" style={{ height: SLOT }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {weekDays.map((d) => {
                const items = weekItems.filter((v) => isSameDay(new Date(v.at), d))
                return (
                  <div key={d.toISOString()} className={cn('relative border-s border-line', isSameDay(d, new Date()) && 'bg-aura/[0.03]')} style={{ height: SLOT * HOURS.length }}>
                    {HOURS.map((h) => (
                      <div key={h} className="border-b border-line/60" style={{ height: SLOT }} />
                    ))}
                    {items.map((v) => {
                      const at = new Date(v.at)
                      const top = Math.max(0, (at.getHours() - HOURS[0]! + at.getMinutes() / 60) * SLOT)
                      const b = employeeById(v.agentId)
                      const p = propOf(v)
                      // Side-by-side when two viewings overlap in the same day column.
                      const overlap = items.filter((o) => Math.abs(new Date(o.at).getTime() - at.getTime()) < 45 * 60_000)
                      const slot = overlap.findIndex((o) => o.id === v.id)
                      const w = 100 / overlap.length
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelected(v)}
                          className={cn(
                            'absolute overflow-hidden rounded-lg border-s-[3px] px-1.5 py-1 text-start text-[11px] leading-tight shadow-soft transition-[filter] hover:brightness-95',
                            v.status === 'completed' ? 'border-success bg-success/12' : v.status === 'no-show' ? 'border-danger bg-danger/10' : 'border-aura bg-aura/12',
                          )}
                          style={{ top: top + 1, height: SLOT * 0.75 - 2, insetInlineStart: `calc(${slot * w}% + 2px)`, width: `calc(${w}% - 4px)` }}
                          title={`${fmtTime(v.at)} · ${p.title}`}
                        >
                          <span className="flex items-center gap-1 font-bold tabular">
                            {b && <Avatar name={b.name} hue={b.avatarHue} photo={b.photo} size={14} className="ring-0" />}
                            {fmtTime(v.at)}
                          </span>
                          <span className="block truncate font-medium">{p.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      <ViewingDrawer open={creating || !!editing} viewing={editing} onClose={() => (setCreating(false), setEditing(null))} />
      <ViewingCompleteDrawer viewing={completing} onClose={() => setCompleting(null)} />
      <ViewingModal
        viewing={selected ? (rows.find((v) => v.id === selected.id) ?? null) : null}
        onClose={() => setSelected(null)}
        actions={(v) => actions(v).map((a) => ({ ...a, onSelect: () => (setSelected(null), a.onSelect()) }))}
      />
    </div>
  )
}

function AgendaRow({ v, showDay, actions, onOpen }: { v: Viewing; showDay: boolean; actions: MenuItem[]; onOpen: () => void }) {
  const p = propOf(v)
  const who = viewingWho(v)
  const b = employeeById(v.agentId)
  return (
    <div className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-2/60 sm:gap-4 sm:px-4">
      <div className="w-[60px] shrink-0 text-center">
        <p className="text-[14px] font-bold tabular">{fmtTime(v.at)}</p>
        {showDay && <p className="text-[11px] text-muted">{fmtDay(v.at)}</p>}
      </div>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <PropertyThumb image={p.image} size={48} rounded="rounded-lg" />
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold">{p.title}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
            <Badge tone={who.kind === 'Lead' ? 'info' : 'brand'} className="px-1.5 py-0 text-[10.5px]">
              {who.kind}
            </Badge>
            <span className="truncate">
              {who.name}
              {p.sub && ` · ${p.sub}`}
            </span>
          </span>
          {v.status === 'completed' && v.interest && (
            <span className="mt-0.5 flex items-center gap-1.5">
              <Stars value={v.interest} size={12} />
              {v.feedback && <span className="truncate text-[11.5px] text-muted">“{v.feedback}”</span>}
            </span>
          )}
        </span>
      </button>
      <div className="hidden items-center gap-2 md:flex">{b && <PersonCell name={b.name} hue={b.avatarHue} photo={b.photo} size={26} />}</div>
      {b && <Avatar name={b.name} hue={b.avatarHue} photo={b.photo} size={26} className="md:hidden" />}
      <span className="hidden sm:inline-flex">
        <StatusBadge value={v.status} map={VIEWING_STATUS} />
      </span>
      <Menu items={actions} />
    </div>
  )
}

function ViewingModal({ viewing: v, onClose, actions }: { viewing: Viewing | null; onClose: () => void; actions: (v: Viewing) => MenuItem[] }) {
  if (!v) return null
  const p = propOf(v)
  const who = viewingWho(v)
  const b = employeeById(v.agentId)
  return (
    <Modal open onClose={onClose} title="Viewing" className="max-w-[460px]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <PropertyThumb image={p.image} size={64} />
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold">{p.title}</p>
            <p className="truncate text-[12.5px] text-muted">{p.sub}</p>
            <p className="mt-1 text-[13px] font-semibold tabular">
              {fmtDay(v.at)} · {fmtTime(v.at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/70 p-3">
          <PersonCell name={who.name} hue={who.hue} sub={who.kind} size={32} />
          {b && <PersonCell name={b.name} hue={b.avatarHue} photo={b.photo} sub="Broker" size={32} />}
        </div>
        <div className="flex items-center justify-between gap-2">
          <StatusBadge value={v.status} map={VIEWING_STATUS} />
          {v.interest && <Stars value={v.interest} />}
        </div>
        {v.feedback && <p className="text-[13px] text-muted">“{v.feedback}”</p>}
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {actions(v).map((a) => (
            <Button key={a.label} size="sm" variant={a.danger ? 'outline' : a.label.startsWith('Complete') ? 'primary' : 'outline'} className={a.danger ? 'text-danger' : undefined} icon={a.icon} onClick={a.onSelect}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
