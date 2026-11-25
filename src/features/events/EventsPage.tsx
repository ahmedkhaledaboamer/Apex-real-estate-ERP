import { useNavigate } from '@tanstack/react-router'
import { format, isSameDay, startOfMonth } from 'date-fns'
import { BadgeDollarSign, CalendarDays, CalendarPlus, List, MapPin, Plus, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AvatarStack } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Segmented, Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney, formatMoneyCompact, formatShortDate } from '@/lib/format'
import { optionsOf } from '@/lib/labels'
import { employeeById } from '@/mocks/core'
import { events } from '@/mocks/events'
import type { AgencyEvent } from '@/types/events'
import { EventCalendar, groupByDay } from './EventCalendar'
import { EventDrawer } from './EventDrawer'
import { EVENT_STATUS, EVENT_TYPE, EVENT_TYPE_COLOR } from './labels'
import { eventSubject } from './link'

const activeCount = (e: AgencyEvent) => e.attendees.length
const timeRange = (e: AgencyEvent) => {
  const s = new Date(e.start)
  const t = new Date(e.end)
  return isSameDay(s, t) ? `${formatShortDate(s)}, ${format(s, 'HH:mm')}–${format(t, 'HH:mm')}` : `${formatShortDate(s)} – ${formatShortDate(t)}`
}

export function EventsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = events.useList()
  const [creating, setCreating] = useCreateParam()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date | null>(() => new Date())
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [newDate, setNewDate] = useState<Date | null>(null)

  const all = data ?? []
  const rows = useMemo(() => all.filter((e) => (!type || e.type === type) && (!status || e.status === status)), [all, type, status])
  const now = Date.now()
  const upcoming = all.filter((e) => e.status !== 'cancelled' && new Date(e.start).getTime() >= now)
  const nextUp = [...upcoming].sort((a, b) => a.start.localeCompare(b.start))[0]
  const next30 = upcoming.filter((e) => new Date(e.start).getTime() - now <= 30 * 86_400_000)
  const yearKey = String(new Date().getFullYear())
  const ytd = all.filter((e) => e.status !== 'cancelled' && e.start.startsWith(yearKey))
  const leadsYtd = sum(ytd, (e) => e.leadsGenerated)
  const gciYtd = sum(ytd, (e) => e.attributedGci)
  const costYtd = sum(ytd.filter((e) => e.status === 'completed'), (e) => e.actualCost)
  const featured = [...upcoming].sort((a, b) => a.start.localeCompare(b.start)).filter((e) => e.type !== 'internal').slice(0, 3)

  const byDay = useMemo(() => groupByDay(rows), [rows])
  const dayEvents = selected ? (byDay.get(format(selected, 'yyyy-MM-dd')) ?? []) : []
  const open = (e: AgencyEvent) => navigate({ to: '/events/$eventId', params: { eventId: e.id } })
  const startCreate = (d: Date | null) => {
    setNewDate(d)
    setCreating(true)
  }

  const columns: Column<AgencyEvent>[] = [
    {
      key: 'title',
      header: 'Event',
      sort: (e) => e.title,
      cell: (e) => (
        <div className="flex items-center gap-3">
          <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: EVENT_TYPE_COLOR[e.type] }} />
          <div className="min-w-0">
            <div className="max-w-[280px] truncate font-semibold">{e.title}</div>
            <div className="text-[12px] text-muted">
              {EVENT_TYPE[e.type]} · {e.code}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'start', header: 'When', sort: (e) => e.start, csv: (e) => e.start, cell: (e) => <span className="tabular">{timeRange(e)}</span> },
    { key: 'location', header: 'Location', sort: (e) => e.location, cell: (e) => <span className="block max-w-[220px] truncate text-muted">{e.city === 'Dubai' ? e.location : `${e.location}, ${e.city}`}</span>, hideBelow: 'lg' },
    {
      key: 'subject',
      header: 'Promotes',
      sort: (e) => eventSubject(e)?.label ?? '',
      csv: (e) => eventSubject(e)?.label ?? '',
      cell: (e) => {
        const s = eventSubject(e)
        return s ? (
          <span className="flex min-w-0 items-center gap-2">
            {s.image && <img src={s.image} alt="" loading="lazy" className="size-8 shrink-0 rounded-md object-cover" />}
            <span className="max-w-[180px] truncate">{s.label}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        )
      },
      hideBelow: 'xl',
    },
    {
      key: 'attendees',
      header: 'Registrants',
      sort: (e) => activeCount(e) / e.capacity,
      csv: (e) => `${activeCount(e)}/${e.capacity}`,
      cell: (e) => (
        <div className="w-[120px]">
          <div className="mb-1 flex justify-between text-[12px]">
            <span className="font-semibold tabular">
              {activeCount(e)}/{e.capacity}
            </span>
          </div>
          <Progress value={(activeCount(e) / e.capacity) * 100} />
        </div>
      ),
      hideBelow: 'md',
    },
    { key: 'leads', header: 'Leads', align: 'end', sort: (e) => e.leadsGenerated, cell: (e) => <span className="tabular">{e.leadsGenerated || '—'}</span>, hideBelow: 'lg' },
    { key: 'gci', header: 'Attributed GCI', align: 'end', sort: (e) => e.attributedGci, cell: (e) => <span className="tabular">{e.attributedGci ? formatMoney(e.attributedGci) : '—'}</span>, hideBelow: 'lg' },
    {
      key: 'owner',
      header: 'Owner',
      sort: (e) => employeeById(e.ownerId)?.name ?? '',
      cell: (e) => {
        const o = employeeById(e.ownerId)
        return o ? <AvatarStack people={[o]} size={26} /> : '—'
      },
      hideBelow: 'xl',
    },
    { key: 'status', header: 'Status', sort: (e) => e.status, cell: (e) => <StatusBadge value={e.status} map={EVENT_STATUS} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Open houses, project launches, expos, investor roadshows and seminars."
        actions={
          <Button icon={<Plus />} onClick={() => startCreate(null)}>
            New event
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Upcoming events" value={upcoming.length} icon={<CalendarDays />} footnote={`${next30.length} in the next 30 days`} />
            <StatCard label="Registrations" value={sum(upcoming, activeCount)} icon={<Users />} tone="royal" footnote={`for ${sum(upcoming, (e) => e.capacity)} places at upcoming events`} />
            <StatCard label={`Leads generated ${yearKey}`} value={leadsYtd} icon={<UserPlus />} tone="cyan" footnote={costYtd && leadsYtd ? `${formatMoney(costYtd / leadsYtd)} per lead` : 'From completed events'} />
            <StatCard label={`Attributed GCI ${yearKey}`} value={formatMoneyCompact(gciYtd)} icon={<BadgeDollarSign />} tone="success" footnote={`${sum(ytd, (e) => e.dealsAttributed)} deals · ROI ${costYtd ? Math.round((gciYtd / costYtd) * 100) : 0}% on ${formatMoneyCompact(costYtd)}`} />
          </>
        )}
      </div>

      {featured.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {featured.map((e) => (
            <FeaturedCard key={e.id} e={e} onOpen={() => open(e)} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'calendar', label: <><CalendarDays /> Calendar</> },
            { value: 'list', label: <><List /> List</> },
          ]}
        />
        <Select value={type} onChange={(e) => setType(e.target.value)} options={optionsOf(EVENT_TYPE)} placeholder="All types" className="min-w-[140px] flex-1 sm:flex-none" aria-label="Type" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={optionsOf(EVENT_STATUS)} placeholder="All statuses" className="min-w-[140px] flex-1 sm:flex-none" aria-label="Status" />
        <div className="ms-auto hidden flex-wrap items-center gap-x-3 gap-y-1 lg:flex">
          {Object.entries(EVENT_TYPE).map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-muted">
              <span className="size-2.5 rounded-full" style={{ background: EVENT_TYPE_COLOR[k as keyof typeof EVENT_TYPE] }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <DataTable rows={rows} columns={columns} loading={isLoading} search={(e) => `${e.title} ${e.code} ${e.location} ${e.city} ${eventSubject(e)?.label ?? ''}`} searchPlaceholder="Search events…" onRowClick={open} exportName="events" initialSort={{ key: 'start', dir: 'asc' }} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="overflow-hidden">{isLoading ? <Skeleton className="m-4 h-[560px]" /> : <EventCalendar month={month} onMonthChange={setMonth} events={rows} selected={selected} onSelectDay={setSelected} onOpenEvent={open} />}</Card>
          <Card className="flex flex-col">
            <CardHeader
              title={selected ? format(selected, 'EEEE, d MMMM') : 'Select a day'}
              subtitle={selected ? `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : 'Click a day on the calendar'}
              actions={
                selected && (
                  <Button variant="soft" size="sm" icon={<CalendarPlus />} onClick={() => startCreate(selected)}>
                    Add
                  </Button>
                )
              }
            />
            <div className="flex-1 p-3">
              {dayEvents.length === 0 ? (
                <EmptyState icon={<CalendarDays />} title="Nothing scheduled" message="Pick another day or add an event here." className="py-10" />
              ) : (
                <ul className="space-y-2">
                  {dayEvents.map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => open(e)} className="flex w-full gap-3 rounded-xl border border-line p-3 text-start transition-colors hover:bg-surface-2/70">
                        {eventSubject(e)?.image ? (
                          <img src={eventSubject(e)!.image} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" style={{ boxShadow: `inset 0 0 0 2px ${EVENT_TYPE_COLOR[e.type]}` }} />
                        ) : (
                          <span className="w-1 shrink-0 self-stretch rounded-full" style={{ background: EVENT_TYPE_COLOR[e.type] }} />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={cn('text-[13.5px] leading-snug font-semibold', e.status === 'cancelled' && 'line-through opacity-60')}>{e.title}</span>
                          </span>
                          <span className="mt-1 block text-[12px] text-muted tabular">{timeRange(e)}</span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{e.location}</span>
                          </span>
                          <span className="mt-2 flex items-center justify-between gap-2">
                            <StatusBadge value={e.status} map={EVENT_STATUS} />
                            <span className="text-[12px] text-muted tabular">
                              {activeCount(e)}/{e.capacity} registered
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-line px-5 py-3 text-[12px] text-muted">
              Next up:{' '}
              {nextUp ? (
                <button type="button" className="font-semibold text-aura hover:underline" onClick={() => open(nextUp!)}>
                  {nextUp!.title} · {formatDate(nextUp!.start)}
                </button>
              ) : (
                'nothing planned'
              )}
            </div>
          </Card>
        </div>
      )}

      <EventDrawer open={creating} defaultDate={newDate} onClose={() => setCreating(false)} onSaved={(e) => setSelected(new Date(e.start))} />
    </div>
  )
}

function FeaturedCard({ e, onOpen }: { e: AgencyEvent; onOpen: () => void }) {
  const s = eventSubject(e)
  const color = EVENT_TYPE_COLOR[e.type]
  const d = new Date(e.start)
  return (
    <button type="button" onClick={onOpen} className="group relative flex h-[168px] min-w-0 flex-col justify-end overflow-hidden rounded-card border border-line text-start shadow-soft transition-shadow hover:shadow-lift">
      {s?.image ? (
        <img src={s.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <span className="absolute inset-0 bg-brand-gradient" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
      <span className="absolute start-3 top-3 grid w-12 place-items-center rounded-xl bg-white/90 py-1 text-center leading-none text-[#1e1828] shadow-sm">
        <span className="text-[16px] font-bold tabular">{d.getDate()}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase">{d.toLocaleString('en', { month: 'short' })}</span>
      </span>
      <span className="absolute end-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: color }}>
        {EVENT_TYPE[e.type]}
      </span>
      <span className="relative block p-4 text-white">
        <span className="block truncate text-[15px] font-semibold">{e.title}</span>
        <span className="mt-0.5 flex items-center gap-3 text-[12px] text-white/80">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{e.city === 'Dubai' ? e.location : `${e.city} · ${e.location}`}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 tabular">
            <Users className="size-3.5" />
            {e.attendees.length}/{e.capacity}
          </span>
        </span>
      </span>
    </button>
  )
}
