import { Banknote, CheckCircle2, Clock3, Pencil, Plus, Receipt, Wallet, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Form'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { toast } from '@/components/ui/Toast'
import { useCreateParam } from '@/hooks/useCreateParam'
import { change, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney, formatMoneyCompact } from '@/lib/format'
import { optionsOf } from '@/lib/labels'
import { today } from '@/lib/random'
import { CURRENT_USER_ID } from '@/mocks/core'
import { accountById, expenses as expensesRes } from '@/mocks/finance'
import type { Expense, ExpenseCategory, ExpenseStatus } from '@/types/finance'
import { ExpenseDrawer } from './ExpenseDrawer'
import { useFinanceData } from './hooks'
import { EXPENSE_CATEGORY, EXPENSE_COLOR, EXPENSE_STATUS } from './labels'
import { countsInPnl, expenseGross, monthKeyOf, todayIso } from './lib'

const TABS: (ExpenseStatus | 'all')[] = ['all', 'pending', 'approved', 'paid', 'rejected']
type Range = 'month' | 'last' | '90d' | '12m'
const RANGES: { value: Range; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'last', label: 'Last month' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
]

export function ExpensesPage() {
  const fin = useFinanceData()
  const update = expensesRes.useUpdate({ silent: true })
  const [creating, setCreating] = useCreateParam()
  const [editing, setEditing] = useState<Expense | null>(null)
  const [tab, setTab] = useState<ExpenseStatus | 'all'>('all')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [range, setRange] = useState<Range>('90d')

  const t = useMemo(() => today(), [])
  const mk = monthKeyOf(t)
  const lastMk = monthKeyOf(new Date(t.getFullYear(), t.getMonth() - 1, 1))
  const inRange = useMemo(() => {
    const cut = range === '90d' ? new Date(t.getTime() - 89 * 86_400_000) : range === '12m' ? new Date(t.getFullYear(), t.getMonth() - 11, 1) : null
    const cutIso = cut ? `${monthKeyOf(cut)}-${String(cut.getDate()).padStart(2, '0')}` : ''
    return fin.expenses.filter((e) => (range === 'month' ? e.date.slice(0, 7) === mk : range === 'last' ? e.date.slice(0, 7) === lastMk : e.date >= cutIso))
  }, [fin.expenses, range, mk, lastMk, t])
  const byCat = useMemo(() => inRange.filter((e) => !category || e.category === category), [inRange, category])
  const rows = useMemo(() => byCat.filter((e) => tab === 'all' || e.status === tab), [byCat, tab])

  const kpi = useMemo(() => {
    const cur = fin.expenses.filter((e) => countsInPnl(e) && e.date.slice(0, 7) === mk)
    const prev = fin.expenses.filter((e) => countsInPnl(e) && e.date.slice(0, 7) === lastMk)
    const pending = fin.expenses.filter((e) => e.status === 'pending')
    const approved = fin.expenses.filter((e) => e.status === 'approved')
    const paidMonth = fin.expenses.filter((e) => e.status === 'paid' && e.paidAt?.slice(0, 7) === mk)
    return {
      opex: sum(cur, (e) => e.amount),
      opexChange: change(sum(cur, (e) => e.amount), sum(prev, (e) => e.amount)),
      pending: sum(pending, (e) => expenseGross(e)),
      pendingCount: pending.length,
      approved: sum(approved, (e) => expenseGross(e)),
      approvedCount: approved.length,
      paid: sum(paidMonth, (e) => expenseGross(e)),
      paidCount: paidMonth.length,
    }
  }, [fin.expenses, mk, lastMk])

  const breakdown = useMemo(() => {
    const counted = inRange.filter(countsInPnl)
    const total = sum(counted, (e) => e.amount)
    return (Object.keys(EXPENSE_CATEGORY) as ExpenseCategory[])
      .map((c) => ({ c, value: sum(counted.filter((e) => e.category === c), (e) => e.amount) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((x) => ({ ...x, pct: total ? (x.value / total) * 100 : 0 }))
  }, [inRange])

  const act = (e: Expense, status: ExpenseStatus) => {
    const patch: Partial<Expense> = { status, approvedById: status === 'pending' ? null : (e.approvedById ?? CURRENT_USER_ID), paidAt: status === 'paid' ? todayIso() : null }
    const verb = { approved: 'approved', rejected: 'rejected', paid: 'marked paid', pending: 'reopened' }[status]
    update.mutate({ id: e.id, patch }, { onSuccess: () => toast.success(`${e.number} ${verb}`) })
  }

  const columns: Column<Expense>[] = [
    { key: 'number', header: 'Expense', hideBelow: 'lg', cell: (e) => <span className="font-semibold">{e.number}</span>, sort: (e) => e.number },
    { key: 'date', header: 'Date', cell: (e) => <span className="text-muted">{formatDate(e.date)}</span>, sort: (e) => e.date },
    {
      key: 'payee',
      header: 'Payee',
      cell: (e) => (
        <div className="max-w-[300px] min-w-[180px]">
          <div className="truncate font-semibold">{e.payee}</div>
          <div className="truncate text-[12px] text-muted">{e.description}</div>
        </div>
      ),
      sort: (e) => e.payee,
      csv: (e) => `${e.payee} — ${e.description}`,
    },
    {
      key: 'category',
      header: 'Category',
      hideBelow: 'md',
      cell: (e) => (
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: EXPENSE_COLOR[e.category] }} />
          {EXPENSE_CATEGORY[e.category]}
        </span>
      ),
      sort: (e) => EXPENSE_CATEGORY[e.category],
    },
    { key: 'account', header: 'Paid from', hideBelow: '2xl', cell: (e) => <span className="text-muted">{accountById(e.accountId)?.name ?? '—'}</span>, csv: (e) => accountById(e.accountId)?.name ?? '' },
    { key: 'amount', header: 'Net', align: 'end', hideBelow: 'xl', cell: (e) => <span className="tabular">{formatMoney(e.amount)}</span>, sort: (e) => e.amount },
    { key: 'vat', header: 'VAT', align: 'end', hideBelow: 'xl', cell: (e) => <span className="text-muted tabular">{e.vatRate ? formatMoney(expenseGross(e) - e.amount) : '—'}</span>, csv: (e) => expenseGross(e) - e.amount },
    { key: 'total', header: 'Total', align: 'end', cell: (e) => <span className={cn('font-semibold tabular', e.status === 'rejected' && 'text-muted line-through')}>{formatMoney(expenseGross(e))}</span>, sort: (e) => expenseGross(e) },
    { key: 'status', header: 'Status', cell: (e) => <StatusBadge value={e.status} map={EXPENSE_STATUS} />, sort: (e) => e.status, csv: (e) => EXPENSE_STATUS[e.status][0] },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (e) => {
        const items: MenuItem[] = []
        if (e.status === 'pending') items.push({ label: 'Approve', icon: <CheckCircle2 />, onSelect: () => act(e, 'approved') })
        if (e.status === 'pending' || e.status === 'approved') items.push({ label: 'Mark paid', icon: <Banknote />, onSelect: () => act(e, 'paid') })
        if (e.status !== 'paid') items.push({ label: 'Edit', icon: <Pencil />, onSelect: () => setEditing(e) })
        if (e.status === 'rejected') items.push({ label: 'Reopen', icon: <Clock3 />, onSelect: () => act(e, 'pending') })
        if (e.status === 'pending' || e.status === 'approved') items.push({ label: 'Reject', icon: <XCircle />, danger: true, onSelect: () => act(e, 'rejected') })
        return (
          <div className="flex items-center justify-end gap-1">
            {e.status === 'pending' && (
              <Button
                size="sm"
                variant="soft"
                className="hidden sm:inline-flex"
                onClick={(ev) => {
                  ev.stopPropagation()
                  act(e, 'approved')
                }}
              >
                Approve
              </Button>
            )}
            {items.length > 0 && <Menu items={items} />}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Operating costs: rent, payroll, portals, advertising, licences and more. Broker commissions are paid under Agent commissions."
        breadcrumbs={[{ label: 'Finance', to: '/finance' }, { label: 'Expenses' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New expense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fin.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Operating expenses · this month" value={formatMoneyCompact(kpi.opex)} trend={kpi.opexChange} inverse icon={<Receipt />} tone="warning" />
            <StatCard label="Pending approval" value={formatMoneyCompact(kpi.pending)} icon={<Clock3 />} tone="danger" footnote={`${kpi.pendingCount} submissions waiting`} />
            <StatCard label="Approved · to pay" value={formatMoneyCompact(kpi.approved)} icon={<Wallet />} tone="royal" footnote={`${kpi.approvedCount} bills incl. payroll run`} />
            <StatCard label="Paid · this month" value={formatMoneyCompact(kpi.paid)} icon={<Banknote />} tone="success" footnote={`${kpi.paidCount} payments incl. VAT`} />
          </>
        )}
      </div>

      <Card>
        <CardHeader title="By category" subtitle={`${RANGES.find((r) => r.value === range)!.label} · net of VAT, excl. rejected`} />
        <CardBody className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {breakdown.map((b) => (
            <button key={b.c} type="button" onClick={() => setCategory(category === b.c ? '' : b.c)} className={cn('block w-full rounded-lg text-start transition-opacity', category && category !== b.c && 'opacity-45')}>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: EXPENSE_COLOR[b.c] }} />
                  <span className="truncate">{EXPENSE_CATEGORY[b.c]}</span>
                </span>
                <span className="font-semibold tabular">{formatMoneyCompact(b.value)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: EXPENSE_COLOR[b.c] }} />
              </div>
            </button>
          ))}
          {!breakdown.length && <p className="text-[13px] text-muted">No expenses in this period.</p>}
        </CardBody>
      </Card>

      <div className="min-w-0 space-y-4">
        <Tabs value={tab} onChange={setTab} tabs={TABS.map((s) => ({ value: s, label: s === 'all' ? 'All' : EXPENSE_STATUS[s][0], count: s === 'all' ? byCat.length : byCat.filter((e) => e.status === s).length }))} />
        <DataTable
          rows={rows}
          columns={columns}
          loading={fin.loading}
          search={(e) => `${e.number} ${e.payee} ${e.description} ${e.reference}`}
          searchPlaceholder="Search payee, description…"
          toolbar={
            <>
              <Select value={range} onChange={(e) => setRange(e.target.value as Range)} options={RANGES} className="w-[calc(50%-4px)] sm:w-[160px]" aria-label="Period" />
              <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory | '')} options={optionsOf(EXPENSE_CATEGORY)} placeholder="All categories" className="w-[calc(50%-4px)] sm:w-[200px]" aria-label="Category" />
            </>
          }
          onRowClick={(e) => e.status !== 'paid' && setEditing(e)}
          exportName="expenses"
          initialSort={{ key: 'date', dir: 'desc' }}
        />
      </div>
      <ExpenseDrawer open={creating || !!editing} expense={editing} onClose={() => (editing ? setEditing(null) : setCreating(false))} />
    </div>
  )
}
