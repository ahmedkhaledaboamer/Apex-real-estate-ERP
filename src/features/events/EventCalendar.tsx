import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { AgencyEvent } from '@/types/events'
import { EVENT_TYPE_COLOR } from './labels'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_CHIPS = 3

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** Events grouped by every day they cover. */
export function groupByDay(events: AgencyEvent[]) {
  const map = new Map<string, AgencyEvent[]>()
  for (const e of events) {
    const start = new Date(e.start)
    start.setHours(0, 0, 0, 0)
    const end = new Date(e.end)
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const k = dayKey(d)
      const list = map.get(k) ?? []
      list.push(e)
      map.set(k, list)
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start))
  return map
}

/** Month calendar: 7-column grid (Mon–Sun), prev/next/today, events as coloured chips. */
export function EventCalendar({
  month,
  onMonthChange,
  events,
  selected,
  onSelectDay,
  onOpenEvent,
}: {
  month: Date
  onMonthChange: (d: Date) => void
  events: AgencyEvent[]
  selected: Date | null
  onSelectDay: (d: Date) => void
  onOpenEvent: (e: AgencyEvent) => void
}) {
  const byDay = useMemo(() => groupByDay(events), [events])
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const out: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-[17px] font-bold tracking-[-0.01em]">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => onMonthChange(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => onMonthChange(addMonths(month, -1))}>
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-y border-line bg-surface-2/60 text-[11px] font-semibold tracking-[0.05em] text-muted uppercase">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-1 py-2 text-center sm:px-2 sm:text-start">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" role="grid" aria-label={format(month, 'MMMM yyyy')}>
        {days.map((d, i) => {
          const list = byDay.get(dayKey(d)) ?? []
          const inMonth = isSameMonth(d, month)
          const sel = selected && isSameDay(d, selected)
          const today = isToday(d)
          return (
            <div
              key={dayKey(d)}
              role="gridcell"
              tabIndex={0}
              aria-selected={!!sel}
              aria-label={`${format(d, 'd MMMM')}, ${list.length} events`}
              onClick={() => onSelectDay(d)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelectDay(d))}
              className={cn(
                'group relative min-h-[64px] cursor-pointer border-line p-1 text-start transition-colors duration-100 outline-none sm:min-h-[112px] sm:p-1.5',
                i % 7 !== 6 && 'border-e',
                i < days.length - 7 && 'border-b',
                !inMonth && 'bg-surface-2/40',
                sel ? 'bg-aura/[0.06] ring-2 ring-aura/50 ring-inset' : 'hover:bg-surface-2/60 focus-visible:ring-2 focus-visible:ring-aura/40 focus-visible:ring-inset',
              )}
            >
              <div className="flex items-center justify-center sm:justify-start">
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-[12px] font-semibold tabular sm:size-7 sm:text-[12.5px]',
                    today ? 'bg-brand-gradient text-white' : inMonth ? 'text-fg' : 'text-muted/60',
                  )}
                >
                  {format(d, 'd')}
                </span>
              </div>
              {/* Phone: dots */}
              {list.length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {list.slice(0, 4).map((e) => (
                    <span key={e.id} className={cn('size-1.5 rounded-full', e.status === 'cancelled' && 'opacity-40')} style={{ background: EVENT_TYPE_COLOR[e.type] }} />
                  ))}
                </div>
              )}
              {/* Tablet+: chips */}
              <div className="mt-1 hidden space-y-1 sm:block">
                {list.slice(0, MAX_CHIPS).map((e) => {
                  const first = isSameDay(new Date(e.start), d) || (d.getDay() === 1 && !isSameDay(new Date(e.start), d))
                  const color = EVENT_TYPE_COLOR[e.type]
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onOpenEvent(e)
                      }}
                      title={`${e.title} · ${format(new Date(e.start), 'HH:mm')}`}
                      className={cn('flex w-full items-center gap-1 truncate rounded-md px-1.5 py-[3px] text-start text-[11.5px] leading-tight font-semibold transition-[filter] hover:brightness-95 dark:hover:brightness-125', e.status === 'cancelled' && 'line-through opacity-50')}
                      style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color: `color-mix(in oklab, ${color} 78%, var(--fg))`, boxShadow: first ? `inset 3px 0 0 ${color}` : undefined }}
                    >
                      <span className="truncate">{e.title}</span>
                    </button>
                  )
                })}
                {list.length > MAX_CHIPS && <span className="block px-1.5 text-[11px] font-semibold text-muted">+{list.length - MAX_CHIPS} more</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
