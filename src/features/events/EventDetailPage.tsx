import { Link, useNavigate } from '@tanstack/react-router'
import { format, isSameDay } from 'date-fns'
import { ArrowLeft, ArrowUpRight, CalendarClock, CheckCircle2, ChevronDown, ClipboardList, MapPin, Pencil, Plus, Trash2, TrendingUp, UserPlus, Users, Wallet, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Checkbox, Input, Select } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { DetailRow, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { cn } from '@/lib/cn'
import { formatDateTime, formatMoney, formatRelative } from '@/lib/format'
import { optionsOf } from '@/lib/labels'
import { employeeById } from '@/mocks/core'
import { leadById } from '@/mocks/domain'
import { eventDays, events } from '@/mocks/events'
import type { Attendee, AttendeeStatus, EventStatus, AgencyEvent } from '@/types/events'
import { MiniStat } from './formParts'
import { EventDrawer } from './EventDrawer'
import { ATTENDEE_STATUS, EVENT_STATUS, EVENT_TYPE, EVENT_TYPE_COLOR } from './labels'
import { eventSubject } from './link'

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const hueOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 11)

function timing(e: AgencyEvent) {
  const now = Date.now()
  const s = new Date(e.start).getTime()
  const t = new Date(e.end).getTime()
  if (e.status === 'cancelled') return 'Cancelled'
  if (now < s) return `Starts ${formatRelative(e.start)}`
  if (now <= t) return `Day ${Math.floor((now - s) / 86_400_000) + 1} of ${eventDays(e)}`
  return `Ended ${formatRelative(e.end)}`
}

export function EventDetailPage({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = events.useList()
  const update = events.useUpdate()
  const quiet = events.useUpdate({ silent: true })
  const remove = events.useRemove()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const e = data?.find((x) => x.id === eventId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-52 rounded-card" />
      </div>
    )
  }
  if (!e) {
    return (
      <Card>
        <EmptyState title="Event not found" message="It may have been deleted." action={<ButtonLink to="/events" variant="soft" icon={<ArrowLeft />}>Back to events</ButtonLink>} />
      </Card>
    )
  }

  const color = EVENT_TYPE_COLOR[e.type]
  const subject = eventSubject(e)
  const owner = employeeById(e.ownerId)
  const going = e.attendees.length
  const attended = e.attendees.filter((a) => a.status === 'attended').length
  const past = e.status === 'completed' || e.status === 'in-progress'
  const done = e.checklist.filter((c) => c.done).length
  const checklistPct = e.checklist.length ? (done / e.checklist.length) * 100 : 0
  const budgetPct = e.budget ? (e.actualCost / e.budget) * 100 : 0
  const roi = e.actualCost ? (e.attributedGci / e.actualCost) * 100 : 0
  const sameDay = isSameDay(new Date(e.start), new Date(e.end))

  const patch = (p: Partial<AgencyEvent>) => quiet.mutate({ id: e.id, patch: p })

  return (
    <div className="space-y-6">
      <PageHeader
        title={e.title}
        description={`${e.code} · ${EVENT_TYPE[e.type]}`}
        breadcrumbs={[{ label: 'Events', to: '/events' }, { label: e.code }]}
        actions={
          <>
            <Menu
              items={(Object.keys(EVENT_STATUS) as EventStatus[]).map((s) => ({ label: `${s === e.status ? '✓ ' : ''}${EVENT_STATUS[s][0]}`, onSelect: () => s !== e.status && update.mutate({ id: e.id, patch: { status: s } }) }))}
              trigger={(p) => (
                <Button variant="outline" {...p}>
                  <StatusBadge value={e.status} map={EVENT_STATUS} />
                  <ChevronDown className="text-muted" />
                </Button>
              )}
            />
            <Button variant="outline" icon={<Trash2 />} onClick={() => setDeleting(true)} aria-label="Delete event">
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button icon={<Pencil />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      {/* Overview hero */}
      <Card className="overflow-hidden">
        {subject?.image ? (
          <div className="relative h-40 sm:h-52">
            <img src={subject.image} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: color }} />
            <div className="absolute start-5 end-5 bottom-4 text-white">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-white/75 uppercase">{subject.kind}</p>
              <p className="truncate text-[17px] font-semibold">
                {subject.label}
                {subject.sub && <span className="font-normal text-white/80"> · {subject.sub}</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative h-2" style={{ background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 40%, var(--color-cyan)))` }} />
        )}
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:p-6">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color: `color-mix(in oklab, ${color} 80%, var(--fg))` }}>
                {EVENT_TYPE[e.type]}
              </span>
              <span className="text-[12.5px] font-semibold text-muted">{timing(e)}</span>
            </div>
            <div className="grid gap-x-8 gap-y-2.5 text-[13.5px] sm:grid-cols-2">
              <p className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  {formatDateTime(e.start)}
                  <span className="text-muted"> → </span>
                  {sameDay ? format(new Date(e.end), 'HH:mm') : formatDateTime(e.end)}
                  <span className="block text-[12px] text-muted">{sameDay ? 'Single day' : `${eventDays(e)} days`}</span>
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  {e.location}
                  <span className="block text-[12px] text-muted">{e.city === 'Dubai' ? 'Dubai, UAE' : e.city}</span>
                </span>
              </p>
              <p className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  {e.projectId ? (
                    <Link to="/services/offplan/$projectId" params={{ projectId: e.projectId }} className="inline-flex items-center gap-1 hover:underline">
                      {subject?.label} <ArrowUpRight className="size-3.5" />
                    </Link>
                  ) : e.listingId ? (
                    <Link to="/services/listings/$listingId" params={{ listingId: e.listingId }} className="inline-flex items-center gap-1 hover:underline">
                      {subject?.label} <ArrowUpRight className="size-3.5" />
                    </Link>
                  ) : e.communitySlug ? (
                    <Link to="/services/communities/$slug" params={{ slug: e.communitySlug }} className="inline-flex items-center gap-1 hover:underline">
                      {subject?.label} <ArrowUpRight className="size-3.5" />
                    </Link>
                  ) : (
                    e.type === 'internal' ? 'Internal session' : 'General'
                  )}
                  <span className="block text-[12px] text-muted">{subject?.kind ?? 'Promotes'}</span>
                </span>
              </p>
              {owner && (
                <div className="flex items-center gap-2">
                  <PersonCell name={owner.name} hue={owner.avatarHue} photo={owner.photo} sub={`Owner · ${owner.title}`} size={30} />
                </div>
              )}
            </div>
            {e.description && <p className="max-w-3xl text-[13px] leading-relaxed text-muted">{e.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[320px]">
            <MiniStat label={past ? 'Attended' : 'Registered'} value={past ? `${attended}/${going}` : `${going}/${e.capacity}`} sub={past ? `${going ? Math.round((attended / going) * 100) : 0}% show-up rate` : `${Math.round((going / e.capacity) * 100)}% of capacity`} />
            <MiniStat label="Leads generated" value={e.leadsGenerated} sub={e.leadsGenerated && e.actualCost ? `${formatMoney(e.actualCost / e.leadsGenerated)} per lead` : `Checklist ${Math.round(checklistPct)}% done`} />
            <MiniStat label="Deals attributed" value={e.dealsAttributed} sub={e.attributedGci ? `${formatMoney(e.attributedGci)} GCI` : 'None yet'} />
            <MiniStat label="ROI" value={<span className={e.attributedGci && roi < 100 ? 'text-danger' : ''}>{e.attributedGci ? `${Math.round(roi)}%` : '—'}</span>} sub={`${Math.round(budgetPct)}% of ${formatMoney(e.budget)} budget`} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <AttendeesCard event={e} onChange={(attendees) => patch({ attendees })} />
        </div>
        <div className="min-w-0 space-y-4">
          <ChecklistCard event={e} onChange={(checklist) => patch({ checklist })} />
          <BudgetCard event={e} />
        </div>
      </div>

      <EventDrawer open={editing} editing={e} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete event?"
        message={<>“{e.title}” and its attendee list will be removed.</>}
        loading={remove.isPending}
        onConfirm={() => remove.mutate(e.id, { onSuccess: () => navigate({ to: '/events' }) })}
      />
    </div>
  )
}

function AttendeesCard({ event: e, onChange }: { event: AgencyEvent; onChange: (a: Attendee[]) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | AttendeeStatus>('all')
  const [showAll, setShowAll] = useState(false)
  const full = e.attendees.length >= e.capacity

  const add = (ev: FormEvent) => {
    ev.preventDefault()
    if (!name.trim()) return setError('Name is required')
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email')
    if (email && e.attendees.some((a) => a.email.toLowerCase() === email.toLowerCase())) return setError('Already on the list')
    onChange([...e.attendees, { id: uid('reg'), name: name.trim(), email: email.trim(), phone: phone.trim(), status: 'registered', leadId: null }])
    setName('')
    setEmail('')
    setPhone('')
    setError('')
  }
  const counts = Object.fromEntries((Object.keys(ATTENDEE_STATUS) as AttendeeStatus[]).map((s) => [s, e.attendees.filter((a) => a.status === s).length])) as Record<AttendeeStatus, number>
  const matching = e.attendees.filter((a) => filter === 'all' || a.status === filter)
  const PAGE = 12
  const shown = showAll ? matching : matching.slice(0, PAGE)

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Users className="size-4 text-muted" /> Registrants
          </span>
        }
        subtitle={`${e.attendees.length} registered · ${e.attendees.filter((a) => a.leadId).length} already in the CRM · capacity ${e.capacity}`}
        actions={
          <Select
            value={filter}
            onChange={(x) => setFilter(x.target.value as typeof filter)}
            options={[{ value: 'all', label: `All (${e.attendees.length})` }, ...(Object.keys(ATTENDEE_STATUS) as AttendeeStatus[]).map((s) => ({ value: s, label: `${ATTENDEE_STATUS[s][0]} (${counts[s]})` }))]}
            aria-label="Filter attendees"
            className="w-[170px]"
          />
        }
      />
      <CardBody className="space-y-4">
        <form onSubmit={add} className="rounded-xl border border-dashed border-line bg-surface-2/40 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={name} onChange={(x) => (setName(x.target.value), setError(''))} placeholder="Full name" aria-label="Attendee name" aria-invalid={!!error && !name.trim()} className="sm:flex-1" />
            <Input type="email" value={email} onChange={(x) => (setEmail(x.target.value), setError(''))} placeholder="Email (optional)" aria-label="Attendee email" className="sm:flex-1" />
            <Input type="tel" value={phone} onChange={(x) => setPhone(x.target.value)} placeholder="Mobile (optional)" aria-label="Attendee mobile" className="sm:w-[160px]" />
            <Button type="submit" icon={<UserPlus />} variant="soft">
              Add
            </Button>
          </div>
          {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : full ? <p className="mt-1.5 text-[12px] text-warning">Capacity reached — new registrants go over the planned headcount.</p> : null}
        </form>
        {matching.length === 0 ? (
          <EmptyState icon={<Users />} title="No attendees" message={filter === 'all' ? 'Add the first registrant above.' : 'Nobody with this status.'} className="py-8" />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                  <th className="px-5 py-2 text-start font-semibold">Name</th>
                  <th className="hidden px-3 py-2 text-start font-semibold md:table-cell">Contact</th>
                  <th className="hidden px-3 py-2 text-start font-semibold lg:table-cell">CRM</th>
                  <th className="px-3 py-2 text-start font-semibold">Status</th>
                  <th className="w-12 px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-2.5">
                      <PersonCell name={a.name} hue={hueOf(a.name)} size={28} sub={undefined} />
                      <span className="mt-0.5 block truncate ps-[38px] text-[12px] text-muted md:hidden">{a.phone || a.email}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-muted md:table-cell">
                      <span className="block max-w-[220px] truncate">{a.email || '—'}</span>
                      <span className="block text-[12px] tabular">{a.phone}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      {a.leadId ? (
                        <Link to="/sales/leads" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-aura hover:underline dark:text-[#d6a8e3]">
                          {leadById(a.leadId)?.code ?? 'Lead'} <ArrowUpRight className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-[12.5px] text-muted">New</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={a.status}
                        onChange={(x) => onChange(e.attendees.map((y) => (y.id === a.id ? { ...y, status: x.target.value as AttendeeStatus } : y)))}
                        options={optionsOf(ATTENDEE_STATUS)}
                        aria-label={`Status of ${a.name}`}
                        className="w-[118px] sm:w-[136px] [&_select]:h-8 [&_select]:text-[12.5px]"
                      />
                    </td>
                    <td className="px-5 py-2.5 text-end">
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${a.name}`} onClick={() => onChange(e.attendees.filter((y) => y.id !== a.id))}>
                        <X />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {matching.length > PAGE && (
              <div className="border-t border-line px-5 pt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show fewer' : `Show all ${matching.length} registrants`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function ChecklistCard({ event: e, onChange }: { event: AgencyEvent; onChange: (c: AgencyEvent['checklist']) => void }) {
  const [label, setLabel] = useState('')
  const done = e.checklist.filter((c) => c.done).length
  const pct = e.checklist.length ? (done / e.checklist.length) * 100 : 0
  const add = (ev: FormEvent) => {
    ev.preventDefault()
    if (!label.trim()) return
    onChange([...e.checklist, { id: uid('chk'), label: label.trim(), done: false }])
    setLabel('')
  }
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="size-4 text-muted" /> Event checklist
          </span>
        }
        subtitle={`${done} of ${e.checklist.length} done`}
        actions={pct === 100 && e.checklist.length > 0 ? <CheckCircle2 className="size-5 text-success" /> : undefined}
      />
      <CardBody className="space-y-3">
        <Progress value={pct} tone={pct === 100 ? 'success' : 'brand'} />
        <ul className="space-y-1">
          {e.checklist.map((c) => (
            <li key={c.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-2/60">
              <Checkbox checked={c.done} onChange={() => onChange(e.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} label={<span className={cn('text-[13.5px]', c.done && 'text-muted line-through')}>{c.label}</span>} className="flex-1" />
              <button type="button" onClick={() => onChange(e.checklist.filter((x) => x.id !== c.id))} className="rounded p-1 text-muted opacity-60 hover:bg-danger/10 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Remove ${c.label}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="flex gap-2">
          <Input value={label} onChange={(x) => setLabel(x.target.value)} placeholder="Add a task…" aria-label="New checklist item" className="h-9" />
          <Button type="submit" variant="outline" size="icon" className="size-9" aria-label="Add task">
            <Plus />
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}

function BudgetCard({ event: e }: { event: AgencyEvent }) {
  const max = Math.max(e.budget, e.actualCost, e.attributedGci, 1)
  const over = e.actualCost > e.budget
  const bars = [
    { label: 'Budget', value: e.budget, color: 'bg-royal/70' },
    { label: 'Actual cost', value: e.actualCost, color: over ? 'bg-danger' : 'bg-warning' },
    { label: 'Attributed GCI', value: e.attributedGci, color: 'bg-success' },
  ]
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Wallet className="size-4 text-muted" /> Budget & return
          </span>
        }
        subtitle={over ? `Over budget by ${formatMoney(e.actualCost - e.budget)}` : `${formatMoney(e.budget - e.actualCost)} remaining`}
      />
      <CardBody className="space-y-3.5">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1.5 flex justify-between text-[12.5px]">
              <span className="text-muted">{b.label}</span>
              <span className="font-semibold tabular">{formatMoney(b.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className={cn('h-full rounded-full transition-[width] duration-500', b.color)} style={{ width: `${(b.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
        <div className="divide-y divide-line/70 border-t border-line pt-1">
          <DetailRow label="Budget used">
            <span className={cn('tabular', over && 'text-danger')}>{e.budget ? `${((e.actualCost / e.budget) * 100).toFixed(0)}%` : '—'}</span>
          </DetailRow>
          <DetailRow label="Net return">
            <span className={cn('tabular', e.attributedGci - e.actualCost < 0 ? 'text-danger' : 'text-success')}>{formatMoney(e.attributedGci - e.actualCost)}</span>
          </DetailRow>
          <DetailRow label="Cost per lead">
            <span className="tabular">{e.leadsGenerated ? formatMoney(e.actualCost / e.leadsGenerated) : '—'}</span>
          </DetailRow>
          <DetailRow label="Cost per registrant">
            <span className="tabular">{formatMoney(e.actualCost / Math.max(1, e.attendees.length))}</span>
          </DetailRow>
        </div>
      </CardBody>
    </Card>
  )
}
