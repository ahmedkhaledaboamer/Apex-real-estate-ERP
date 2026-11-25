import { Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarPlus, FileText, IdCard, Languages, Mail, MapPin, Pencil, Phone, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DonutChart } from '@/components/charts/Charts'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DetailRow, EmptyState, PageHeader, Progress, Skeleton, Tabs } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney } from '@/lib/format'
import { communityBySlug, departmentById, employeeById, employees } from '@/mocks/core'
import { attendance, leaveCovers, leaveRequests, lineGross, parseDay, payrollRuns, todayIso } from '@/mocks/hr'
import type { Employee } from '@/types/core'
import type { AttendanceRecord, PayrollLine, PayrollRun } from '@/types/hr'
import { AttendanceLegend, formatHours } from './AttendancePage'
import { isBroker, ReraBadge } from './broker'
import { EmployeeDrawer } from './EmployeeDrawer'
import { PerformanceTab } from './PerformanceTab'
import { ATTENDANCE_CELL, ATTENDANCE_STATUS, EMPLOYMENT_STATUS, PAYROLL_STATUS } from './labels'
import { LeaveDrawer } from './LeaveDrawer'
import { leaveColumns } from './LeavePage'
import { PayslipModal, periodLabel } from './PayslipModal'
import { useLeaveActions } from './useLeaveActions'

type Tab = 'overview' | 'performance' | 'attendance' | 'leave' | 'payroll'

function tenure(joinDate: string) {
  const a = parseDay(joinDate)
  const b = new Date()
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) months--
  months = Math.max(0, months)
  const y = Math.floor(months / 12)
  const m = months % 12
  if (!y && !m) return 'Less than a month'
  return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo`].filter(Boolean).join(' ')
}

export function EmployeeProfilePage({ employeeId }: { employeeId: string }) {
  const { data: list, isLoading } = employees.useList()
  const emp = list?.find((e) => e.id === employeeId)
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[180px] rounded-card" />
        <Skeleton className="h-[320px] rounded-card" />
      </div>
    )
  }
  if (!emp) {
    return (
      <Card>
        <EmptyState
          icon={<UserRound />}
          title="Employee not found"
          message="This person may have been removed."
          action={
            <ButtonLink to="/hr" variant="outline" icon={<ArrowLeft />}>
              Back to employees
            </ButtonLink>
          }
        />
      </Card>
    )
  }

  const dept = departmentById(emp.departmentId)
  return (
    <div className="space-y-6">
      <PageHeader title="Employee profile" breadcrumbs={[{ label: 'HR', to: '/hr' }, { label: 'Employees', to: '/hr' }, { label: emp.name }]} />

      <Card className="overflow-hidden">
        <div className="h-20 bg-brand-gradient opacity-90" aria-hidden="true" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-5 sm:items-center">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <Avatar name={emp.name} hue={emp.avatarHue} photo={emp.photo} size={84} className="relative -mt-10 ring-4" />
            <div className="min-w-0 sm:pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[21px] font-bold tracking-[-0.02em]">{emp.name}</h2>
                <StatusBadge value={emp.status} map={EMPLOYMENT_STATUS} />
                <ReraBadge employee={emp} />
              </div>
              <p className="mt-0.5 text-[13.5px] text-muted">
                {emp.title} · <span style={{ color: dept?.color }} className="font-semibold">{dept?.name}</span> · {emp.code}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
                <a href={`mailto:${emp.email}`} className="inline-flex items-center gap-1.5 hover:text-aura">
                  <Mail className="size-3.5" />
                  {emp.email}
                </a>
                <a href={`tel:${emp.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-aura">
                  <Phone className="size-3.5" />
                  <span className="tabular">{emp.phone}</span>
                </a>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={<CalendarPlus />} onClick={() => setLeaveOpen(true)}>
              Request leave
            </Button>
            <Button icon={<Pencil />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          ...(isBroker(emp) ? [{ value: 'performance' as const, label: 'Performance' }] : []),
          { value: 'attendance', label: 'Attendance' },
          { value: 'leave', label: 'Leave' },
          { value: 'payroll', label: 'Payroll' },
        ]}
      />

      {tab === 'overview' && <OverviewTab emp={emp} all={list ?? []} />}
      {tab === 'performance' && isBroker(emp) && <PerformanceTab emp={emp} />}
      {tab === 'attendance' && <AttendanceTab emp={emp} />}
      {tab === 'leave' && <LeaveTab emp={emp} onNew={() => setLeaveOpen(true)} />}
      {tab === 'payroll' && <PayrollTab emp={emp} />}

      <EmployeeDrawer open={editing} employee={emp} onClose={() => setEditing(false)} />
      <LeaveDrawer open={leaveOpen} employeeId={emp.id} onClose={() => setLeaveOpen(false)} />
    </div>
  )
}

function OverviewTab({ emp, all }: { emp: Employee; all: Employee[] }) {
  const manager = employeeById(emp.managerId)
  const reports = all.filter((e) => e.managerId === emp.id && e.status !== 'terminated')
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader title="Job information" />
        <CardBody className="grid gap-x-8 pt-2 sm:grid-cols-2">
          <div className="divide-y divide-line">
            <DetailRow label="Employee ID">{emp.code}</DetailRow>
            <DetailRow label="Job title">{emp.title}</DetailRow>
            <DetailRow label="Department">{departmentById(emp.departmentId)?.name}</DetailRow>
            <DetailRow label="Status">
              <StatusBadge value={emp.status} map={EMPLOYMENT_STATUS} />
            </DetailRow>
          </div>
          <div className="divide-y divide-line">
            <DetailRow label="Join date">{formatDate(emp.joinDate)}</DetailRow>
            <DetailRow label="Tenure">{tenure(emp.joinDate)}</DetailRow>
            <DetailRow label="Nationality">{emp.nationality}</DetailRow>
            <DetailRow label="Leave balance">{emp.leaveBalance} days</DetailRow>
          </div>
        </CardBody>
        {isBroker(emp) && (
          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Broker licence &amp; specialism</p>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-line">
                <DetailRow label="BRN">
                  <span className="inline-flex items-center gap-1.5 tabular">
                    <IdCard className="size-3.5 text-muted" />
                    {emp.brn ?? '—'}
                  </span>
                </DetailRow>
                <DetailRow label="RERA card expiry">
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    {emp.reraExpiry ? formatDate(emp.reraExpiry) : '—'}
                    <ReraBadge employee={emp} />
                  </span>
                </DetailRow>
                <DetailRow label="Commission split">{emp.commissionSplit ?? 0}% broker · {100 - (emp.commissionSplit ?? 0)}% agency</DetailRow>
              </div>
              <div className="space-y-3 pt-3 sm:pt-2">
                <div>
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Languages className="size-3.5" /> Languages
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {emp.languages.length ? emp.languages.map((l) => <Badge key={l}>{l}</Badge>) : <span className="text-[13px] text-muted">—</span>}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                    <MapPin className="size-3.5" /> Specialist communities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emp.communities.length === 0 && <span className="text-[13px] text-muted">—</span>}
                    {[...new Set(emp.communities)].map((slug) => {
                      const c = communityBySlug(slug)
                      return (
                        <span key={slug} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 py-0.5 ps-0.5 pe-2.5 text-[12px] font-medium">
                          {c?.image && <img src={c.image} alt="" loading="lazy" className="size-6 rounded-full object-cover" />}
                          {c?.name ?? slug}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
      <Card className="min-w-0">
        <CardHeader title="Reports to" />
        <CardBody className="pt-3">
          {manager ? (
            <Link to="/hr/employees/$employeeId" params={{ employeeId: manager.id }} className="block rounded-xl border border-line p-3 transition-colors hover:bg-surface-2">
              <PersonCell name={manager.name} hue={manager.avatarHue} photo={manager.photo} sub={manager.title} size={38} />
            </Link>
          ) : (
            <p className="text-[13px] text-muted">Top of the organisation.</p>
          )}
          <p className="mt-5 mb-2 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Direct reports · {reports.length}</p>
          {reports.length === 0 ? (
            <p className="text-[13px] text-muted">No direct reports.</p>
          ) : (
            <ul className="max-h-[240px] space-y-1 overflow-y-auto">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link to="/hr/employees/$employeeId" params={{ employeeId: r.id }} className="block rounded-lg p-1.5 hover:bg-surface-2">
                    <PersonCell name={r.name} hue={r.avatarHue} photo={r.photo} sub={r.title} size={28} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function AttendanceTab({ emp }: { emp: Employee }) {
  const { data, isLoading } = attendance.useList()
  const recs = useMemo(() => (data ?? []).filter((r) => r.employeeId === emp.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30), [data, emp.id])
  const stats = useMemo(() => {
    const worked = recs.filter((r) => r.checkOut)
    return {
      present: recs.filter((r) => r.status === 'present').length,
      late: recs.filter((r) => r.status === 'late').length,
      absent: recs.filter((r) => r.status === 'absent').length,
      remote: recs.filter((r) => r.status === 'remote').length,
      leave: recs.filter((r) => r.status === 'on-leave').length,
      avg: worked.length ? worked.reduce((a, r) => a + r.hours, 0) / worked.length : 0,
    }
  }, [recs])
  const columns: Column<AttendanceRecord>[] = [
    { key: 'date', header: 'Date', cell: (r) => <span className="font-medium">{parseDay(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>, sort: (r) => r.date },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge value={r.status} map={ATTENDANCE_STATUS} />, sort: (r) => r.status },
    { key: 'in', header: 'In', cell: (r) => <span className="tabular">{r.checkIn ?? '—'}</span> },
    { key: 'out', header: 'Out', cell: (r) => <span className="tabular">{r.checkOut ?? '—'}</span> },
    { key: 'hours', header: 'Hours', align: 'end', cell: (r) => <span className="font-semibold tabular">{formatHours(r)}</span>, sort: (r) => r.hours },
  ]
  if (isLoading) return <Skeleton className="h-[320px] rounded-card" />
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Present', stats.present, 'text-success'],
          ['Late', stats.late, 'text-[#b06d0f] dark:text-[#f0b25a]'],
          ['Absent', stats.absent, 'text-danger'],
          ['In the field', stats.remote, 'text-info'],
          ['On leave', stats.leave, 'text-aura dark:text-[#d6a8e3]'],
          ['Avg hours', stats.avg.toFixed(1), 'text-fg'],
        ].map(([label, value, cls]) => (
          <Card key={label as string} className="p-4">
            <p className="text-[12px] text-muted">{label}</p>
            <p className={cn('mt-1 text-[22px] font-bold tabular', cls as string)}>{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Last 30 working days" actions={<AttendanceLegend />} />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {[...recs].reverse().map((r) => (
              <span key={r.id} title={`${r.date} · ${ATTENDANCE_STATUS[r.status][0]}`} className={cn('grid size-7 place-items-center rounded-md text-[10.5px] font-semibold text-white tabular', ATTENDANCE_CELL[r.status])}>
                {Number(r.date.slice(8))}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>
      <DataTable rows={recs} columns={columns} pageSize={10} exportName={`attendance-${emp.code}`} />
    </div>
  )
}

function LeaveTab({ emp, onNew }: { emp: Employee; onNew: () => void }) {
  const { data, isLoading } = leaveRequests.useList()
  const { approve, reject } = useLeaveActions()
  const mine = useMemo(() => (data ?? []).filter((l) => l.employeeId === emp.id).sort((a, b) => b.from.localeCompare(a.from)), [data, emp.id])
  const year = todayIso().slice(0, 4)
  const used = mine.filter((l) => l.status === 'approved' && l.from.startsWith(year) && (l.type === 'annual' || l.type === 'emergency')).reduce((a, l) => a + l.days, 0)
  const pending = mine.filter((l) => l.status === 'pending').reduce((a, l) => a + l.days, 0)
  const entitlement = Math.max(30, emp.leaveBalance + used)
  const current = mine.find((l) => l.status === 'approved' && leaveCovers(l, todayIso()))
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0">
        <CardHeader title="Leave balance" subtitle={`${year} entitlement · ${entitlement} days`} />
        <CardBody className="space-y-4">
          <p className="text-[34px] leading-none font-bold tracking-[-0.02em] tabular">
            {emp.leaveBalance}
            <span className="ms-1.5 text-[14px] font-medium text-muted">days left</span>
          </p>
          <Progress value={(used / entitlement) * 100} />
          <div className="divide-y divide-line">
            <DetailRow label="Used this year">{used} days</DetailRow>
            <DetailRow label="Pending approval">{pending} days</DetailRow>
            <DetailRow label="Currently">{current ? <Badge tone="brand">On leave until {formatDate(current.to)}</Badge> : 'At work'}</DetailRow>
          </div>
          <Button variant="soft" className="w-full" icon={<CalendarPlus />} onClick={onNew}>
            New leave request
          </Button>
        </CardBody>
      </Card>
      <div className="min-w-0 lg:col-span-2">
        <DataTable rows={mine} columns={leaveColumns({ approve, reject, showEmployee: false })} loading={isLoading} empty={<EmptyState title="No leave requests" message="Requests made by this employee appear here." />} />
      </div>
    </div>
  )
}

function PayrollTab({ emp }: { emp: Employee }) {
  const { data, isLoading } = payrollRuns.useList()
  const [slip, setSlip] = useState<{ run: PayrollRun; line: PayrollLine } | null>(null)
  const history = useMemo(
    () =>
      (data ?? [])
        .map((run) => ({ run, line: run.lines.find((l) => l.employeeId === emp.id) }))
        .filter((x): x is { run: PayrollRun; line: PayrollLine } => !!x.line)
        .sort((a, b) => b.run.period.localeCompare(a.run.period)),
    [data, emp.id],
  )
  const rows = history.map((h) => ({ id: h.run.id, ...h }))
  const avgCommission = history.length ? Math.round(history.reduce((a, h) => a + (h.line.commission ?? 0), 0) / history.length) : 0
  const gross = emp.salary + emp.allowances + avgCommission
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0">
        <CardHeader title="Salary breakdown" subtitle="Current monthly pay" />
        <CardBody>
          <DonutChart
            data={[
              { name: 'Basic salary', value: emp.salary, color: '#843f96' },
              { name: 'Allowances', value: emp.allowances, color: '#3cb4e8' },
              ...(avgCommission > 0 ? [{ name: 'Commission (6-mo avg)', value: avgCommission, color: '#1f9d64' }] : []),
            ]}
            height={160}
            format={(v) => formatMoney(v)}
            centerValue={<span className="text-[15px]">{formatMoney(gross)}</span>}
            centerLabel={avgCommission ? 'avg gross / month' : 'gross / month'}
          />
          <div className="mt-4 divide-y divide-line border-t border-line">
            <DetailRow label="Annual pay (est.)">{formatMoney(gross * 12)}</DetailRow>
            <DetailRow label="Daily rate (basic)">{formatMoney(emp.salary / 30, { decimals: true })}</DetailRow>
          </div>
        </CardBody>
      </Card>
      <div className="min-w-0 lg:col-span-2">
        <DataTable
          rows={rows}
          loading={isLoading}
          onRowClick={(r) => setSlip(r)}
          columns={[
            { key: 'period', header: 'Period', cell: (r) => <span className="font-semibold">{periodLabel(r.run.period)}</span>, sort: (r) => r.run.period },
            ...(isBroker(emp) ? [{ key: 'commission', header: 'Commission', align: 'end' as const, cell: (r: (typeof rows)[number]) => <span className={cn('tabular', r.line.commission ? 'text-success' : 'text-muted')}>{r.line.commission ? formatMoney(r.line.commission) : '—'}</span>, hideBelow: 'sm' as const }] : []),
            { key: 'gross', header: 'Gross', align: 'end', cell: (r) => <span className="tabular">{formatMoney(lineGross(r.line))}</span>, hideBelow: 'sm' },
            { key: 'ded', header: 'Deductions', align: 'end', cell: (r) => <span className={cn('tabular', r.line.deductions ? 'text-danger' : 'text-muted')}>{r.line.deductions ? `−${formatMoney(r.line.deductions)}` : '—'}</span>, hideBelow: 'md' },
            { key: 'net', header: 'Net', align: 'end', cell: (r) => <span className="font-semibold tabular">{formatMoney(r.line.net)}</span> },
            { key: 'status', header: 'Status', cell: (r) => <StatusBadge value={r.run.status} map={PAYROLL_STATUS} /> },
            { key: 'slip', header: '', align: 'end', cell: () => <FileText className="ms-auto size-4 text-muted" /> },
          ]}
          empty={<EmptyState title="No payslips yet" />}
        />
      </div>
      <PayslipModal run={slip?.run ?? null} line={slip?.line ?? null} onClose={() => setSlip(null)} />
    </div>
  )
}
