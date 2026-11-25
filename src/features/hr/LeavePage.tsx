import { CalendarCheck2, CalendarOff, Check, Clock3, Hourglass, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Form'
import { PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { cn } from '@/lib/cn'
import { formatRelative, formatShortDate } from '@/lib/format'
import { optionsOf } from '@/lib/labels'
import { employeeById, employees } from '@/mocks/core'
import { addDays, leaveCovers, leaveRequests, parseDay, todayIso, weekStart } from '@/mocks/hr'
import type { LeaveRequest, LeaveStatus } from '@/types/hr'
import { LEAVE_STATUS, LEAVE_TYPE } from './labels'
import { LeaveDrawer } from './LeaveDrawer'
import { useLeaveActions } from './useLeaveActions'

type TabValue = LeaveStatus | 'all'

export function formatRange(from: string, to: string) {
  return from === to ? formatShortDate(from) : `${formatShortDate(from)} – ${formatShortDate(to)}`
}

export function leaveColumns({ approve, reject, showEmployee = true }: { approve: (l: LeaveRequest) => void; reject: (l: LeaveRequest) => void; showEmployee?: boolean }): Column<LeaveRequest>[] {
  const cols: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (l) => {
        const e = employeeById(l.employeeId)
        return e ? <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} sub={l.code} /> : '—'
      },
      sort: (l) => employeeById(l.employeeId)?.name ?? '',
    },
    { key: 'type', header: 'Type', cell: (l) => <Badge tone={LEAVE_TYPE[l.type][1]}>{LEAVE_TYPE[l.type][0]}</Badge>, sort: (l) => l.type },
    { key: 'dates', header: 'Dates', cell: (l) => <span className="font-medium">{formatRange(l.from, l.to)}</span>, sort: (l) => l.from, csv: (l) => `${l.from} to ${l.to}` },
    { key: 'days', header: 'Days', align: 'end', cell: (l) => <span className="font-semibold tabular">{l.days}</span>, sort: (l) => l.days },
    { key: 'reason', header: 'Reason', cell: (l) => <span className="block max-w-[220px] truncate text-muted">{l.reason}</span>, csv: (l) => l.reason, hideBelow: 'xl' },
    { key: 'requested', header: 'Requested', cell: (l) => <span className="text-muted">{formatRelative(l.requestedAt)}</span>, sort: (l) => l.requestedAt, hideBelow: 'lg' },
    { key: 'approver', header: 'Approver', cell: (l) => <span className="text-muted">{employeeById(l.approverId)?.name ?? '—'}</span>, csv: (l) => employeeById(l.approverId)?.name ?? '', hideBelow: 'lg' },
    { key: 'status', header: 'Status', cell: (l) => <StatusBadge value={l.status} map={LEAVE_STATUS} />, sort: (l) => l.status },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (l) =>
        l.status === 'pending' ? (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" className="text-danger" icon={<X />} onClick={() => reject(l)} aria-label={`Reject ${l.code}`}>
              <span className="hidden sm:inline">Reject</span>
            </Button>
            <Button size="sm" variant="soft" icon={<Check />} onClick={() => approve(l)}>
              Approve
            </Button>
          </div>
        ) : null,
    },
  ]
  return showEmployee ? cols : cols.filter((c) => c.key !== 'employee')
}

export function LeavePage() {
  const { data: list, isLoading } = leaveRequests.useList()
  const { data: emps = [] } = employees.useList()
  const [creating, setCreating] = useCreateParam()
  const [tab, setTab] = useState<TabValue>('pending')
  const [type, setType] = useState('')
  const { approve, reject } = useLeaveActions()

  const t = todayIso()
  const all = useMemo(() => list ?? [], [list])
  const counts = useMemo(() => ({ pending: all.filter((l) => l.status === 'pending').length, approved: all.filter((l) => l.status === 'approved').length, rejected: all.filter((l) => l.status === 'rejected').length, all: all.length }), [all])
  const rows = useMemo(
    () => all.filter((l) => (tab === 'all' || l.status === tab) && (!type || l.type === type)).sort((a, b) => (tab === 'pending' ? a.from.localeCompare(b.from) : b.requestedAt.localeCompare(a.requestedAt))),
    [all, tab, type],
  )

  const week = useMemo(() => {
    const mon = weekStart(t)
    return Array.from({ length: 5 }, (_, i) => {
      const day = addDays(mon, i)
      const out = all.filter((l) => l.status === 'approved' && leaveCovers(l, day))
      return { day, out }
    })
  }, [all, t])

  const kpi = useMemo(() => {
    const year = t.slice(0, 4)
    const outWeek = new Set(week.flatMap((d) => d.out.map((l) => l.employeeId)))
    const approvedYear = all.filter((l) => l.status === 'approved' && l.from.startsWith(year)).reduce((a, l) => a + l.days, 0)
    const active = emps.filter((e) => e.status !== 'terminated')
    const avg = active.length ? active.reduce((a, e) => a + e.leaveBalance, 0) / active.length : 0
    return { outWeek: outWeek.size, approvedYear, avg, pendingDays: all.filter((l) => l.status === 'pending').reduce((a, l) => a + l.days, 0) }
  }, [all, week, emps, t])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="Requests, approvals and who’s out."
        breadcrumbs={[{ label: 'HR', to: '/hr' }, { label: 'Leave' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New request
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Awaiting approval" value={counts.pending} icon={<Hourglass />} tone="warning" footnote={`${kpi.pendingDays} working days requested`} />
            <StatCard label="Out this week" value={kpi.outWeek} icon={<CalendarOff />} tone="brand" footnote="Approved leave, Mon–Fri" />
            <StatCard label={`Leave taken in ${t.slice(0, 4)}`} value={`${kpi.approvedYear} days`} icon={<CalendarCheck2 />} tone="success" footnote="Approved requests" />
            <StatCard label="Average balance" value={`${kpi.avg.toFixed(1)} days`} icon={<Clock3 />} tone="royal" footnote="Annual leave remaining" />
          </>
        )}
      </div>

      <Card>
        <CardHeader title="Who’s out this week" subtitle={`${formatShortDate(week[0]!.day)} – ${formatShortDate(week[4]!.day)}`} />
        <CardBody>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {week.map(({ day, out }) => {
              const isToday = day === t
              return (
                <div key={day} className={cn('flex min-h-[132px] w-[180px] shrink-0 flex-col rounded-xl border p-3 lg:w-auto lg:flex-1', isToday ? 'border-aura/40 bg-aura/5' : 'border-line bg-surface-2/40')}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn('text-[12px] font-semibold tracking-[0.04em] uppercase', isToday ? 'text-aura dark:text-[#d6a8e3]' : 'text-muted')}>{parseDay(day).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                    <span className="text-[12px] text-muted tabular">{formatShortDate(day)}</span>
                  </div>
                  {out.length === 0 ? (
                    <p className="m-auto text-[12px] text-muted">Everyone in</p>
                  ) : (
                    <ul className="mt-2.5 space-y-2">
                      {out.map((l) => {
                        const e = employeeById(l.employeeId)
                        if (!e) return null
                        return (
                          <li key={l.id} className="flex min-w-0 items-center gap-2">
                            <Avatar name={e.name} hue={e.avatarHue} photo={e.photo} size={26} />
                            <span className="min-w-0">
                              <span className="block truncate text-[12.5px] font-semibold">{e.name}</span>
                              <span className="block truncate text-[11px] text-muted">{LEAVE_TYPE[l.type][0]}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'pending', label: 'Pending', count: counts.pending },
            { value: 'approved', label: 'Approved', count: counts.approved },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
        <DataTable
          rows={rows}
          columns={leaveColumns({ approve, reject })}
          loading={isLoading}
          search={(l) => `${employeeById(l.employeeId)?.name ?? ''} ${l.code} ${l.reason}`}
          searchPlaceholder="Search employee or reason…"
          toolbar={<Select value={type} onChange={(e) => setType(e.target.value)} options={optionsOf(LEAVE_TYPE)} placeholder="All types" className="min-w-0 flex-1 sm:w-[170px] sm:flex-none" aria-label="Leave type" />}
          exportName="leave-requests"
        />
      </div>

      <LeaveDrawer open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
