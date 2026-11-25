import { useNavigate } from '@tanstack/react-router'
import { BadgeCheck, CalendarClock, IdCard, LayoutGrid, Mail, MapPin, Pencil, Phone, Plus, Rows3, ShieldAlert, UserPlus, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DonutChart } from '@/components/charts/Charts'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchInput, Segmented, Select, Switch } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { formatDate, formatMoney, formatMoneyCompact, formatShortDate } from '@/lib/format'
import { optionsOf } from '@/lib/labels'
import { DEPARTMENTS, departmentById, employeeById, employees } from '@/mocks/core'
import { leaveCovers, leaveRequests, todayIso } from '@/mocks/hr'
import type { Employee } from '@/types/core'
import { communityNames, isBroker, ReraBadge, reraState } from './broker'
import { EmployeeDrawer } from './EmployeeDrawer'
import { EMPLOYMENT_STATUS } from './labels'

function quarterStart() {
  const d = new Date()
  const m = Math.floor(d.getMonth() / 3) * 3
  return `${d.getFullYear()}-${String(m + 1).padStart(2, '0')}-01`
}

export function DepartmentDot({ id }: { id: Employee['departmentId'] }) {
  const d = departmentById(id)
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="size-2 shrink-0 rounded-full" style={{ background: d?.color }} />
      <span className="truncate">{d?.name}</span>
    </span>
  )
}

export function EmployeesPage() {
  const navigate = useNavigate()
  const { data: list, isLoading } = employees.useList()
  const { data: leave = [] } = leaveRequests.useList()
  const [creating, setCreating] = useCreateParam()
  const [editing, setEditing] = useState<Employee | null>(null)
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [q, setQ] = useState('')
  const [dep, setDep] = useState('')
  const [status, setStatus] = useState('')
  const [brokersOnly, setBrokersOnly] = useState(false)

  const t = todayIso()
  const outToday = useMemo(() => {
    const s = new Set(leave.filter((l) => l.status === 'approved' && leaveCovers(l, t)).map((l) => l.employeeId))
    for (const e of list ?? []) if (e.status === 'on-leave') s.add(e.id)
    return s
  }, [leave, list, t])

  const active = useMemo(() => (list ?? []).filter((e) => e.status !== 'terminated'), [list])
  const kpi = useMemo(() => {
    const qs = quarterStart()
    return {
      headcount: active.length,
      probation: active.filter((e) => e.status === 'probation').length,
      joiners: active.filter((e) => e.joinDate >= qs).length,
      joinersYear: active.filter((e) => e.joinDate.slice(0, 4) === qs.slice(0, 4)).length,
      payroll: active.reduce((a, e) => a + e.salary + e.allowances, 0),
      brokers: active.filter(isBroker).length,
      reraExpiring: active.filter((e) => reraState(e) === 'expiring').length,
      reraExpired: active.filter((e) => reraState(e) === 'expired').length,
    }
  }, [active])

  const byDept = useMemo(() => DEPARTMENTS.map((d) => ({ name: d.name, value: active.filter((e) => e.departmentId === d.id).length, color: d.color })).filter((d) => d.value > 0), [active])
  const recent = useMemo(() => [...active].sort((a, b) => b.joinDate.localeCompare(a.joinDate)).slice(0, 5), [active])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (list ?? [])
      .filter((e) => (!dep || e.departmentId === dep) && (!status || e.status === status) && (!brokersOnly || isBroker(e)))
      .filter((e) => !term || `${e.name} ${e.title} ${e.email} ${e.code} ${e.brn ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [list, q, dep, status, brokersOnly])

  const open = (e: Employee) => navigate({ to: '/hr/employees/$employeeId', params: { employeeId: e.id } })

  const columns: Column<Employee>[] = [
    { key: 'name', header: 'Employee', cell: (e) => <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} sub={e.title} />, sort: (e) => e.name },
    { key: 'code', header: 'ID', cell: (e) => <span className="text-muted tabular">{e.code}</span>, sort: (e) => e.code, hideBelow: 'lg' },
    { key: 'dept', header: 'Department', cell: (e) => <DepartmentDot id={e.departmentId} />, sort: (e) => departmentById(e.departmentId)?.name ?? '', hideBelow: 'md' },
    { key: 'brn', header: 'BRN / RERA card', cell: (e) => (isBroker(e) ? <span className="inline-flex items-center gap-2"><span className="tabular text-muted">{e.brn}</span><ReraBadge employee={e} /></span> : <span className="text-muted">—</span>), sort: (e) => e.reraExpiry ?? '9999', csv: (e) => (e.brn ? `${e.brn} (exp ${e.reraExpiry})` : ''), hideBelow: 'lg' },
    { key: 'split', header: 'Split', align: 'end', cell: (e) => (e.commissionSplit != null ? <span className="tabular">{e.commissionSplit}%</span> : <span className="text-muted">—</span>), sort: (e) => e.commissionSplit ?? -1, hideBelow: 'xl' },
    { key: 'manager', header: 'Manager', cell: (e) => <span className="text-muted">{employeeById(e.managerId)?.name ?? '—'}</span>, csv: (e) => employeeById(e.managerId)?.name ?? '', hideBelow: 'xl' },
    { key: 'email', header: 'Email', cell: (e) => <span className="text-muted">{e.email}</span>, sort: (e) => e.email, hideBelow: 'xl' },
    { key: 'join', header: 'Joined', cell: (e) => <span className="text-muted">{formatDate(e.joinDate)}</span>, sort: (e) => e.joinDate, hideBelow: 'lg' },
    { key: 'salary', header: 'Monthly gross', align: 'end', cell: (e) => <span className="font-semibold tabular">{formatMoney(e.salary + e.allowances)}</span>, sort: (e) => e.salary + e.allowances, hideBelow: 'md' },
    { key: 'status', header: 'Status', cell: (e) => <StatusBadge value={outToday.has(e.id) && e.status === 'active' ? 'on-leave' : e.status} map={EMPLOYMENT_STATUS} />, sort: (e) => e.status },
    { key: 'actions', header: '', align: 'end', cell: (e) => <Menu items={[{ label: 'View profile', onSelect: () => open(e) }, { label: 'Edit', icon: <Pencil />, onSelect: () => setEditing(e) }]} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Team directory, departments and headcount."
        breadcrumbs={[{ label: 'HR' }, { label: 'Employees' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New employee
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Headcount" value={kpi.headcount} icon={<Users />} footnote={`${kpi.brokers} licensed brokers · ${kpi.probation} on probation`} />
            <StatCard label="On leave today" value={outToday.size} icon={<CalendarClock />} tone="warning" footnote={`${Math.round((outToday.size / Math.max(1, kpi.headcount)) * 100)}% of the team`} />
            <StatCard label="New joiners this quarter" value={kpi.joiners} icon={<UserPlus />} tone="cyan" footnote={`Since ${formatShortDate(quarterStart())} · ${kpi.joinersYear} this year`} />
            <StatCard label="Monthly payroll cost" value={formatMoneyCompact(kpi.payroll)} icon={<Wallet />} tone="royal" footnote="Basic + allowances, excl. commission" />
            <StatCard label="RERA cards expiring (30 days)" value={kpi.reraExpiring + kpi.reraExpired} icon={<ShieldAlert />} tone={kpi.reraExpiring || kpi.reraExpired ? 'danger' : 'success'} footnote={kpi.reraExpiring + kpi.reraExpired ? `${kpi.reraExpired} expired · ${kpi.reraExpiring} due within 30 days` : `All ${kpi.brokers} broker cards valid`} />
          </>
        )}
      </div>

      {/* Directory */}
      <div className="space-y-4">
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, title, email…" className="w-full sm:w-[280px]" aria-label="Search employees" />
          <Select value={dep} onChange={(e) => setDep(e.target.value)} options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))} placeholder="All departments" className="min-w-0 flex-1 sm:w-[190px] sm:flex-none" aria-label="Department" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={optionsOf(EMPLOYMENT_STATUS)} placeholder="All statuses" className="min-w-0 flex-1 sm:w-[160px] sm:flex-none" aria-label="Status" />
          <Switch checked={brokersOnly} onChange={setBrokersOnly} label="Brokers only" />
          <span className="ms-auto hidden text-[12.5px] text-muted sm:inline">{rows.length} people</span>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: <><LayoutGrid /> <span className="hidden sm:inline">Grid</span></> },
              { value: 'table', label: <><Rows3 /> <span className="hidden sm:inline">Table</span></> },
            ]}
          />
        </Card>

        {view === 'table' ? (
          <DataTable rows={rows} columns={columns} loading={isLoading} onRowClick={open} exportName="employees" />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[196px] rounded-card" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState icon={<Users />} title="No employees match" message="Try a different search or clear the filters." />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {rows.map((e) => (
              <Card key={e.id} className="group relative flex cursor-pointer flex-col p-5 transition-[box-shadow,border-color] duration-150 hover:border-aura/30 hover:shadow-lift" onClick={() => open(e)}>
                <div className="absolute end-3 top-3">
                  <Menu items={[{ label: 'View profile', onSelect: () => open(e) }, { label: 'Edit', icon: <Pencil />, onSelect: () => setEditing(e) }]} />
                </div>
                <div className="flex items-center gap-3.5 pe-8">
                  <Avatar name={e.name} hue={e.avatarHue} photo={e.photo} size={48} />
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold">{e.name}</p>
                    <p className="truncate text-[12.5px] text-muted">{e.title}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                  <DepartmentDot id={e.departmentId} />
                  <StatusBadge value={outToday.has(e.id) && e.status === 'active' ? 'on-leave' : e.status} map={EMPLOYMENT_STATUS} />
                </div>
                {isBroker(e) && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-muted">
                        <IdCard className="size-3" />
                        BRN <span className="text-fg tabular">{e.brn}</span>
                      </span>
                      <ReraBadge employee={e} />
                    </div>
                    {e.communities.length > 0 && (
                      <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{communityNames(e.communities).join(' · ')}</span>
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12.5px] text-muted">
                  <p className="flex min-w-0 items-center gap-2">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{e.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="tabular">{e.phone}</span>
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3.5 text-[11.5px] text-muted">
                  <span className="inline-flex items-center gap-1 tabular">
                    {e.code}
                    {e.commissionSplit != null && (
                      <span className="inline-flex items-center gap-0.5 text-aura dark:text-[#d6a8e3]">
                        · <BadgeCheck className="size-3" /> {e.commissionSplit}% split
                      </span>
                    )}
                  </span>
                  <span>Joined {formatShortDate(e.joinDate)} {e.joinDate.slice(0, 4)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader title="Headcount by department" subtitle={`${kpi.headcount} people across ${byDept.length} departments`} />
          <CardBody>{isLoading ? <Skeleton className="h-[200px]" /> : <DonutChart data={byDept} height={200} format={(v) => String(v)} centerLabel="people" />}</CardBody>
        </Card>
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Newest team members" subtitle="Most recent joiners" />
          <CardBody className="pt-3">
            <ul className="space-y-1">
              {recent.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => open(e)} className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-start transition-colors hover:bg-surface-2">
                    <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} sub={`${e.title} · ${departmentById(e.departmentId)?.name}`} />
                    <span className="shrink-0 text-[12px] text-muted">{formatDate(e.joinDate)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <EmployeeDrawer open={creating || !!editing} employee={editing} onClose={() => (editing ? setEditing(null) : setCreating(false))} />
    </div>
  )
}
