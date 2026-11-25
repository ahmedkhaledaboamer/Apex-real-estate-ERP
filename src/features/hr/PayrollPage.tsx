import { BadgeCheck, Banknote, FileText, HandCoins, MinusCircle, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarsChart, TrendChart } from '@/components/charts/Charts'
import { PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { toast } from '@/components/ui/Toast'
import { change } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney, formatMoneyCompact } from '@/lib/format'
import { DEPARTMENTS, departmentById, employeeById } from '@/mocks/core'
import { lineGross, payrollRuns, runTotals } from '@/mocks/hr'
import type { PayrollLine } from '@/types/hr'
import { DepartmentDot } from './EmployeesPage'
import { PAYROLL_STATUS } from './labels'
import { PayslipModal, periodLabel } from './PayslipModal'

type Row = PayrollLine & { id: string }

export function PayrollPage() {
  const { data: runs, isLoading } = payrollRuns.useList()
  const update = payrollRuns.useUpdate({ silent: true })
  const sorted = useMemo(() => [...(runs ?? [])].sort((a, b) => b.period.localeCompare(a.period)), [runs])
  const [selected, setSelected] = useState<string>('')
  const [confirm, setConfirm] = useState(false)
  const [slip, setSlip] = useState<PayrollLine | null>(null)

  const run = sorted.find((r) => r.id === selected) ?? sorted[0]
  const prev = run ? sorted[sorted.indexOf(run) + 1] : undefined
  const totals = run ? runTotals(run) : null
  const prevTotals = prev ? runTotals(prev) : null

  const trend = useMemo(() => [...sorted].reverse().map((r) => ({ month: periodLabel(r.period).split(' ')[0]!.slice(0, 3), ...runTotals(r) })), [sorted])
  const byDept = useMemo(() => {
    if (!run) return []
    return DEPARTMENTS.map((d) => {
      const lines = run.lines.filter((l) => employeeById(l.employeeId)?.departmentId === d.id)
      return {
        name: d.name.replace('Human Resources', 'HR').replace('Admin & Conveyancing', 'Admin').replace('Property Management', 'Prop. Mgmt').replace('Secondary Sales', 'Sales'),
        basic: lines.reduce((a, l) => a + l.basic, 0),
        allowances: lines.reduce((a, l) => a + l.allowances, 0),
        overtime: lines.reduce((a, l) => a + l.overtime, 0),
        commission: lines.reduce((a, l) => a + (l.commission ?? 0), 0),
      }
    }).filter((d) => d.basic > 0)
  }, [run])

  const rows: Row[] = useMemo(() => (run?.lines ?? []).map((l) => ({ ...l, id: l.employeeId })), [run])

  const columns: Column<Row>[] = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (l) => {
        const e = employeeById(l.employeeId)
        return e ? <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} sub={e.title} /> : '—'
      },
      sort: (l) => employeeById(l.employeeId)?.name ?? '',
    },
    { key: 'dept', header: 'Department', cell: (l) => { const e = employeeById(l.employeeId); return e ? <DepartmentDot id={e.departmentId} /> : '—' }, sort: (l) => departmentById(employeeById(l.employeeId)?.departmentId ?? 'sales')?.name ?? '', hideBelow: '2xl' },
    { key: 'basic', header: 'Basic', align: 'end', cell: (l) => <span className="tabular">{formatMoney(l.basic)}</span>, sort: (l) => l.basic, hideBelow: 'md' },
    { key: 'allowances', header: 'Allowances', align: 'end', cell: (l) => <span className="tabular">{formatMoney(l.allowances)}</span>, sort: (l) => l.allowances, hideBelow: 'xl' },
    { key: 'overtime', header: 'Overtime', align: 'end', cell: (l) => <span className={cn('tabular', !l.overtime && 'text-muted')}>{l.overtime ? formatMoney(l.overtime) : '—'}</span>, sort: (l) => l.overtime, hideBelow: '2xl' },
    { key: 'commission', header: 'Commission', align: 'end', cell: (l) => <span className={cn('tabular', l.commission ? 'font-medium text-success' : 'text-muted')}>{l.commission ? formatMoney(l.commission) : '—'}</span>, sort: (l) => l.commission ?? 0, hideBelow: 'sm' },
    { key: 'gross', header: 'Gross', align: 'end', cell: (l) => <span className="tabular">{formatMoney(lineGross(l))}</span>, sort: (l) => lineGross(l), hideBelow: 'lg' },
    { key: 'deductions', header: 'Deductions', align: 'end', cell: (l) => <span className={cn('tabular', l.deductions ? 'text-danger' : 'text-muted')}>{l.deductions ? `−${formatMoney(l.deductions)}` : '—'}</span>, sort: (l) => l.deductions, hideBelow: 'md' },
    { key: 'net', header: 'Net pay', align: 'end', cell: (l) => <span className="font-semibold tabular">{formatMoney(l.net)}</span>, sort: (l) => l.net },
    {
      key: 'slip',
      header: '',
      align: 'end',
      cell: (l) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<FileText />}
          onClick={(e) => {
            e.stopPropagation()
            setSlip(l)
          }}
        >
          <span className="hidden sm:inline">Payslip</span>
        </Button>
      ),
    },
  ]

  const approve = () => {
    if (!run) return
    update.mutate(
      { id: run.id, patch: { status: 'paid', paidAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          toast.success(`${periodLabel(run.period)} payroll approved · ${formatMoney(totals?.net ?? 0)} marked as paid`)
          setConfirm(false)
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description={run ? `${periodLabel(run.period)} · pay date ${formatDate(run.payDate)}` : 'Monthly payroll runs'}
        breadcrumbs={[{ label: 'HR', to: '/hr' }, { label: 'Payroll' }]}
        actions={
          <>
            <Select
              value={run?.id ?? ''}
              onChange={(e) => setSelected(e.target.value)}
              options={sorted.map((r) => ({ value: r.id, label: `${periodLabel(r.period)} · ${PAYROLL_STATUS[r.status][0]}` }))}
              className="w-[220px]"
              aria-label="Payroll run"
            />
            {run?.status === 'draft' && (
              <Button icon={<BadgeCheck />} onClick={() => setConfirm(true)}>
                Approve & mark paid
              </Button>
            )}
          </>
        }
      />

      {run && (
        <div className={cn('flex flex-wrap items-center gap-3 rounded-card border px-4 py-3 text-[13px]', run.status === 'draft' ? 'border-warning/30 bg-warning/8' : 'border-success/25 bg-success/8')}>
          <StatusBadge value={run.status} map={PAYROLL_STATUS} />
          <span className="text-muted">
            {run.status === 'draft' ? (
              <>This run is a draft. Review the lines below, then approve it to release salaries through WPS on {formatDate(run.payDate)}.</>
            ) : (
              <>Paid on {formatDate(run.paidAt ?? run.payDate)} to {run.lines.length} employees.</>
            )}
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {isLoading || !totals ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Gross pay" value={formatMoneyCompact(totals.gross)} icon={<Banknote />} trend={prevTotals ? change(totals.gross, prevTotals.gross) : undefined} trendLabel="vs last run" footnote="First run" />
            <StatCard label="Broker commission" value={formatMoneyCompact(totals.commission)} icon={<HandCoins />} tone="cyan" trend={prevTotals && prevTotals.commission ? change(totals.commission, prevTotals.commission) : undefined} trendLabel="vs last run" footnote={`${run?.lines.filter((l) => l.commission > 0).length ?? 0} brokers earned commission`} />
            <StatCard label="Deductions" value={formatMoneyCompact(totals.deductions)} icon={<MinusCircle />} tone="danger" inverse trend={prevTotals ? change(totals.deductions, prevTotals.deductions) : undefined} trendLabel="vs last run" footnote="First run" />
            <StatCard label="Net pay" value={formatMoneyCompact(totals.net)} icon={<Wallet />} tone="success" trend={prevTotals ? change(totals.net, prevTotals.net) : undefined} trendLabel="vs last run" footnote="First run" />
            <StatCard label="Employees paid" value={totals.employees} icon={<Users />} tone="royal" footnote={`Avg net ${formatMoney(totals.net / Math.max(1, totals.employees))}`} />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Cost by department" subtitle={run ? `${periodLabel(run.period)} · basic, allowances, overtime and commission` : ' '} />
          <CardBody className="pt-3">
            {byDept.length ? (
              <BarsChart
                data={byDept}
                x="name"
                stacked
                series={[
                  { key: 'basic', label: 'Basic' },
                  { key: 'allowances', label: 'Allowances', color: '#3cb4e8' },
                  { key: 'overtime', label: 'Overtime', color: '#d9891a' },
                  { key: 'commission', label: 'Commission', color: '#1f9d64' },
                ]}
                format={(v) => formatMoney(v)}
                height={280}
              />
            ) : (
              <Skeleton className="h-[280px]" />
            )}
          </CardBody>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Payroll trend" subtitle="Last 6 runs" />
          <CardBody className="pt-3">
            {trend.length ? (
              <TrendChart
                data={trend}
                x="month"
                series={[
                  { key: 'gross', label: 'Gross' },
                  { key: 'net', label: 'Net', color: '#1f9d64' },
                  { key: 'commission', label: 'Commission', color: '#3cb4e8' },
                ]}
                format={(v) => formatMoney(v)}
                height={280}
              />
            ) : (
              <Skeleton className="h-[280px]" />
            )}
          </CardBody>
        </Card>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        search={(l) => employeeById(l.employeeId)?.name ?? ''}
        searchPlaceholder="Search employee…"
        onRowClick={(l) => setSlip(l)}
        exportName={run ? `payroll-${run.period}` : 'payroll'}
        initialSort={{ key: 'net', dir: 'desc' }}
        pageSize={12}
        toolbar={
          totals && (
            <span className="text-[12.5px] text-muted">
              {totals.employees} lines · net <span className="font-semibold text-fg tabular">{formatMoney(totals.net)}</span>
            </span>
          )
        }
      />

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={approve}
        loading={update.isPending}
        title={run ? `Approve ${periodLabel(run.period)} payroll?` : 'Approve payroll?'}
        confirmLabel="Approve & mark paid"
        message={
          totals && (
            <>
              {totals.employees} employees will be paid a total of <span className="font-semibold text-fg">{formatMoney(totals.net)}</span>. The run will be locked and payslips released.
            </>
          )
        }
      />
      <PayslipModal run={run ?? null} line={slip} onClose={() => setSlip(null)} />
    </div>
  )
}
