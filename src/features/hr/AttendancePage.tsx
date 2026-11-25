import { useNavigate } from '@tanstack/react-router'
import { CalendarOff, ChevronLeft, ChevronRight, Clock, MapPin, UserCheck, UserX } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input, Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/cn'
import { optionsOf } from '@/lib/labels'
import { DEPARTMENTS, departmentById, employeeById, employees } from '@/mocks/core'
import { attendance, isWeekend, parseDay, shiftWorkingDays, todayIso, toIsoDay } from '@/mocks/hr'
import type { AttendanceRecord, AttendanceStatus } from '@/types/hr'
import { DepartmentDot } from './EmployeesPage'
import { ATTENDANCE_CELL, ATTENDANCE_STATUS } from './labels'

export function formatHours(r: Pick<AttendanceRecord, 'hours' | 'checkIn' | 'checkOut'>) {
  if (!r.checkIn) return '—'
  if (!r.checkOut) return 'In progress'
  return `${r.hours.toFixed(1)} h`
}

export function AttendanceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted">
      {(Object.keys(ATTENDANCE_STATUS) as AttendanceStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cn('size-3 rounded-[4px]', ATTENDANCE_CELL[s])} />
          {ATTENDANCE_STATUS[s][0]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-surface-2 ring-1 ring-line ring-inset" />
        Weekend / no data
      </span>
    </div>
  )
}

export function AttendancePage() {
  const navigate = useNavigate()
  const { data: list, isLoading } = attendance.useList()
  const { data: emps = [] } = employees.useList()
  const t = todayIso()
  const [date, setDate] = useState(() => (isWeekend(t) ? shiftWorkingDays(t, -1) : t))
  const [dep, setDep] = useState('')
  const [status, setStatus] = useState('')

  const all = useMemo(() => list ?? [], [list])
  const day = useMemo(() => all.filter((r) => r.date === date), [all, date])
  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0, remote: 0, 'on-leave': 0 }
    for (const r of day) c[r.status]++
    return c
  }, [day])
  const total = day.length
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}% of ${total}` : '—')

  const rows = useMemo(
    () =>
      day
        .filter((r) => (!status || r.status === status) && (!dep || employeeById(r.employeeId)?.departmentId === dep))
        .sort((a, b) => (employeeById(a.employeeId)?.name ?? '').localeCompare(employeeById(b.employeeId)?.name ?? '')),
    [day, status, dep],
  )

  // Month heatmap for the month of the selected date
  const month = useMemo(() => {
    const d = parseDay(date)
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const days = Array.from({ length: n }, (_, i) => toIsoDay(new Date(d.getFullYear(), d.getMonth(), i + 1)))
    const index = new Map<string, AttendanceRecord>()
    for (const r of all) if (r.date.slice(0, 7) === date.slice(0, 7)) index.set(`${r.employeeId}|${r.date}`, r)
    const people = emps
      .filter((e) => e.status !== 'terminated' && (!dep || e.departmentId === dep))
      .sort((a, b) => a.departmentId.localeCompare(b.departmentId) || a.name.localeCompare(b.name))
    return { label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), days, index, people }
  }, [all, emps, date, dep])

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (r) => {
        const e = employeeById(r.employeeId)
        return e ? <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} sub={e.title} /> : '—'
      },
      sort: (r) => employeeById(r.employeeId)?.name ?? '',
    },
    { key: 'dept', header: 'Department', cell: (r) => { const e = employeeById(r.employeeId); return e ? <DepartmentDot id={e.departmentId} /> : '—' }, csv: (r) => departmentById(employeeById(r.employeeId)?.departmentId ?? 'sales')?.name ?? '', hideBelow: 'md' },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge value={r.status} map={ATTENDANCE_STATUS} />, sort: (r) => r.status },
    { key: 'in', header: 'Check-in', cell: (r) => <span className={cn('tabular', r.status === 'late' && 'font-semibold text-[#b06d0f] dark:text-[#f0b25a]')}>{r.checkIn ?? '—'}</span>, sort: (r) => r.checkIn ?? '99' },
    { key: 'out', header: 'Check-out', cell: (r) => <span className="tabular">{r.checkOut ?? (r.checkIn ? <span className="text-muted">—</span> : '—')}</span>, sort: (r) => r.checkOut ?? '', hideBelow: 'sm' },
    { key: 'hours', header: 'Hours', align: 'end', cell: (r) => <span className={cn('tabular', !r.checkOut && r.checkIn ? 'text-success' : 'font-semibold')}>{formatHours(r)}</span>, sort: (r) => r.hours, csv: (r) => r.hours },
  ]

  const canNext = date < t
  const go = (n: number) => setDate((d) => {
    const next = shiftWorkingDays(d, n)
    return next > t ? d : next
  })
  const weekend = isWeekend(date)
  const title = parseDay(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description={title}
        breadcrumbs={[{ label: 'HR', to: '/hr' }, { label: 'Attendance' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous working day">
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
            <Input type="date" value={date} max={t} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-[150px]" aria-label="Date" />
            <Button variant="outline" size="icon" onClick={() => go(1)} disabled={!canNext} aria-label="Next working day">
              <ChevronRight className="rtl:rotate-180" />
            </Button>
            <Button variant="soft" onClick={() => setDate(isWeekend(t) ? shiftWorkingDays(t, -1) : t)} disabled={date === t}>
              Today
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Present" value={counts.present} icon={<UserCheck />} tone="success" footnote={pct(counts.present)} />
            <StatCard label="Late" value={counts.late} icon={<Clock />} tone="warning" footnote={counts.late ? `${pct(counts.late)} · after 09:05` : 'Everyone on time'} />
            <StatCard label="Absent" value={counts.absent} icon={<UserX />} tone="danger" footnote={`${counts['on-leave']} more on approved leave`} />
            <StatCard label="In the field" value={counts.remote} icon={<MapPin />} tone="cyan" footnote={pct(counts.remote)} />
          </>
        )}
      </div>

      {weekend ? (
        <Card>
          <EmptyState icon={<CalendarOff />} title="Weekend" message="The office is closed on Saturday and Sunday. Pick a working day to see attendance." />
        </Card>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          loading={isLoading}
          search={(r) => employeeById(r.employeeId)?.name ?? ''}
          searchPlaceholder="Search employee…"
          onRowClick={(r) => navigate({ to: '/hr/employees/$employeeId', params: { employeeId: r.employeeId } })}
          pageSize={12}
          exportName={`attendance-${date}`}
          toolbar={
            <>
              <Select value={dep} onChange={(e) => setDep(e.target.value)} options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))} placeholder="All departments" className="min-w-0 flex-1 sm:w-[190px] sm:flex-none" aria-label="Department" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} options={optionsOf(ATTENDANCE_STATUS)} placeholder="All statuses" className="min-w-0 flex-1 sm:w-[150px] sm:flex-none" aria-label="Status" />
            </>
          }
          empty={<EmptyState title="No records" message="No attendance was recorded for this day." />}
        />
      )}

      <Card className="overflow-hidden">
        <CardHeader title={`Monthly overview · ${month.label}`} subtitle="Click a day to open it above" actions={<AttendanceLegend />} />
        <CardBody>
          {isLoading ? (
            <Skeleton className="h-[320px]" />
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <div className="grid min-w-max gap-[3px]" style={{ gridTemplateColumns: `minmax(150px, 200px) repeat(${month.days.length}, 22px)` }}>
                <div />
                {month.days.map((d) => {
                  const we = isWeekend(d)
                  const sel = d === date
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={we || d > t}
                      onClick={() => setDate(d)}
                      className={cn('grid h-9 place-items-center rounded-md text-[10.5px] leading-tight font-semibold tabular transition-colors', sel ? 'bg-aura text-white' : we ? 'text-muted/50' : d > t ? 'text-muted/50' : 'text-muted hover:bg-surface-2 hover:text-fg')}
                      title={parseDay(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                    >
                      <span>
                        {parseDay(d).toLocaleDateString('en-GB', { weekday: 'narrow' })}
                        <br />
                        {Number(d.slice(8))}
                      </span>
                    </button>
                  )
                })}
                {month.people.map((e) => (
                  <Fragment key={e.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/hr/employees/$employeeId', params: { employeeId: e.id } })}
                      className="sticky start-0 z-10 flex min-w-0 items-center gap-2 bg-surface pe-3 text-start hover:text-aura"
                    >
                      <Avatar name={e.name} hue={e.avatarHue} photo={e.photo} size={22} />
                      <span className="truncate text-[12.5px] font-medium">{e.name}</span>
                    </button>
                    {month.days.map((d) => {
                      const r = month.index.get(`${e.id}|${d}`)
                      return (
                        <span
                          key={d}
                          title={r ? `${e.name} · ${d} · ${ATTENDANCE_STATUS[r.status][0]}${r.checkIn ? ` · ${r.checkIn}–${r.checkOut ?? 'now'}` : ''}` : undefined}
                          className={cn('h-[22px] rounded-[5px]', r ? ATTENDANCE_CELL[r.status] : 'bg-surface-2/70', d === date && 'ring-2 ring-aura ring-offset-1 ring-offset-surface')}
                        />
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
