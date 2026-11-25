import { Link } from '@tanstack/react-router'
import { ArrowUpRight, CalendarDays, CheckCircle2, ListTodo, MapPin, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { EVENT_TYPE, EVENT_TYPE_COLOR } from '@/features/events/labels'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/format'
import { PRIORITY } from '@/lib/labels'
import { employeeById } from '@/mocks/core'
import { events, upcomingEvents } from '@/mocks/events'
import { isTaskDueToday, isTaskOverdue, projectById, tasks, tasksDueSoon } from '@/mocks/projects'

const More = ({ to }: { to: string }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-aura hover:underline">
    All <ArrowUpRight className="size-3.5" />
  </Link>
)

/** Tasks due soon (open, most overdue first). */
export function TasksDueCard() {
  const { data } = tasks.useList()
  const list = data ? tasksDueSoon(6) : null
  return (
    <Card className="min-w-0">
      <CardHeader title="Tasks due soon" subtitle={data ? `${data.filter((t) => isTaskOverdue(t)).length} overdue · ${data.filter((t) => isTaskDueToday(t)).length} due today` : ' '} actions={<More to="/projects/tasks" />} />
      <CardBody className="pt-3">
        {!list ? (
          <Skeleton className="h-[260px]" />
        ) : list.length === 0 ? (
          <EmptyState icon={<CheckCircle2 />} title="All caught up" />
        ) : (
          <ul className="-my-1 space-y-1">
            {list.map((t) => {
              const who = employeeById(t.assigneeId)
              const overdue = isTaskOverdue(t)
              const today = isTaskDueToday(t)
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', overdue ? 'bg-danger/10 text-danger' : today ? 'bg-warning/12 text-warning' : 'bg-surface-2 text-muted')}>
                    <ListTodo className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{t.title}</span>
                    <span className="block truncate text-[12px] text-muted">
                      <span className={cn(overdue && 'font-semibold text-danger', today && 'font-semibold text-warning')}>{overdue ? `Overdue · ${formatShortDate(t.dueDate)}` : today ? 'Due today' : `Due ${formatShortDate(t.dueDate)}`}</span>
                      {t.projectId && ` · ${projectById(t.projectId)?.name ?? ''}`}
                    </span>
                  </span>
                  <StatusBadge value={t.priority} map={PRIORITY} />
                  {who && <Avatar name={who.name} hue={who.avatarHue} photo={who.photo} size={28} className="hidden sm:inline-grid" />}
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

/** Next events from the Events module. */
export function UpcomingEventsCard() {
  const { data } = events.useList()
  const list = data ? upcomingEvents(5) : null
  return (
    <Card className="min-w-0">
      <CardHeader title="Upcoming events" subtitle="Open houses, launches & roadshows" actions={<More to="/events" />} />
      <CardBody className="pt-3">
        {!list ? (
          <Skeleton className="h-[260px]" />
        ) : list.length === 0 ? (
          <EmptyState icon={<CalendarDays />} title="No upcoming events" />
        ) : (
          <ul className="-my-1 space-y-1">
            {list.map((e) => {
              const d = new Date(e.start)
              const color = EVENT_TYPE_COLOR[e.type]
              return (
                <li key={e.id}>
                  <Link to="/events/$eventId" params={{ eventId: e.id }} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                    <span className="grid w-12 shrink-0 place-items-center rounded-xl py-1.5 text-center leading-none" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                      <span className="text-[16px] font-bold tabular">{d.getDate()}</span>
                      <span className="mt-0.5 text-[10.5px] font-semibold uppercase">{d.toLocaleString('en', { month: 'short' })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{e.title}</span>
                      <span className="flex items-center gap-3 truncate text-[12px] text-muted">
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="size-3.5 shrink-0" />
                          {e.location}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <Users className="size-3.5" />
                          {e.attendees.length}
                        </span>
                      </span>
                    </span>
                    <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                      {EVENT_TYPE[e.type]}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
