import { useNavigate } from '@tanstack/react-router'
import { AlarmClock, FileText, Plus, ReceiptText, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Segmented } from '@/components/ui/Form'
import { PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { invoiceTotals, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoneyCompact } from '@/lib/format'
import { INVOICE_STATUS } from '@/lib/labels'
import { today } from '@/lib/random'
import { customerById } from '@/mocks/core'
import { dealById } from '@/mocks/domain'
import type { Invoice, InvoiceStatus as Status } from '@/types/domain'
import { useFinanceData } from './hooks'
import { InvoiceDrawer } from './InvoiceDrawer'
import { billToType, dealProperty, invoiceState, isOpenInvoice, monthKeyOf, overdueDays } from './lib'
import { BillToBadge, InvoiceStatus, Money, SummaryChip } from './parts'

type Row = Invoice & { state: Status; total: number; balance: number; late: number }
const TABS: (Status | 'all')[] = ['all', 'draft', 'sent', 'partial', 'overdue', 'paid', 'void']

export function InvoicesPage() {
  const fin = useFinanceData()
  const navigate = useNavigate()
  const [creating, setCreating] = useCreateParam()
  const [tab, setTab] = useState<Status | 'all'>('all')
  const [billTo, setBillTo] = useState<'all' | 'developer' | 'client'>('all')

  const rows: Row[] = useMemo(
    () =>
      fin.invoices.map((i) => {
        const t = invoiceTotals(i)
        return { ...i, state: invoiceState(i), total: t.total, balance: i.status === 'void' ? 0 : t.balance, late: overdueDays(i) }
      }),
    [fin.invoices],
  )
  const byBillTo = useMemo(() => rows.filter((r) => billTo === 'all' || billToType(r) === billTo), [rows, billTo])
  const visible = useMemo(() => byBillTo.filter((r) => tab === 'all' || r.state === tab), [byBillTo, tab])

  const kpi = useMemo(() => {
    const open = rows.filter(isOpenInvoice)
    const overdue = rows.filter((r) => r.state === 'overdue')
    const mk = monthKeyOf(today())
    const issued = rows.filter((r) => r.status !== 'void' && r.issueDate.slice(0, 7) === mk)
    const collected = fin.payments.filter((p) => p.date.slice(0, 7) === mk)
    const devOpen = open.filter((r) => billToType(r) === 'developer')
    return {
      receivable: sum(open, (r) => r.balance),
      openCount: open.length,
      devShare: sum(devOpen, (r) => r.balance),
      overdue: sum(overdue, (r) => r.balance),
      overdueCount: overdue.length,
      issued: sum(issued, (r) => r.total),
      issuedCount: issued.length,
      collected: sum(collected, (p) => p.amount),
      collectedCount: collected.length,
    }
  }, [rows, fin.payments])

  const columns: Column<Row>[] = [
    { key: 'number', header: 'Invoice', cell: (r) => <span className="font-semibold">{r.number}</span>, sort: (r) => r.number },
    {
      key: 'billTo',
      header: 'Bill to',
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-[200px] truncate font-medium">{customerById(r.customerId)?.name ?? '—'}</span>
          <BillToBadge invoice={r} />
        </div>
      ),
      sort: (r) => customerById(r.customerId)?.name ?? '',
    },
    {
      key: 'deal',
      header: 'Deal',
      hideBelow: 'lg',
      cell: (r) => {
        const d = dealById(r.dealId)
        if (!d) return <span className="text-muted">—</span>
        const p = dealProperty(d)
        return (
          <div className="max-w-[240px]">
            <div className="text-[12.5px] font-semibold">{d.code}</div>
            <div className="truncate text-[12px] text-muted">{p.title}</div>
          </div>
        )
      },
      csv: (r) => dealById(r.dealId)?.code ?? '',
    },
    { key: 'issue', header: 'Issued', hideBelow: 'xl', cell: (r) => <span className="text-muted">{formatDate(r.issueDate)}</span>, sort: (r) => r.issueDate },
    { key: 'due', header: 'Due', hideBelow: 'md', cell: (r) => <span className={cn(r.late > 0 ? 'font-semibold text-danger' : 'text-muted')}>{formatDate(r.dueDate)}</span>, sort: (r) => r.dueDate },
    { key: 'total', header: 'Total', align: 'end', cell: (r) => <Money value={r.total} className={r.state === 'void' ? 'text-muted line-through' : 'font-medium'} />, sort: (r) => r.total },
    { key: 'paid', header: 'Paid', align: 'end', hideBelow: 'lg', cell: (r) => <Money value={r.paid} muted />, sort: (r) => r.paid },
    { key: 'balance', header: 'Balance', align: 'end', cell: (r) => <Money value={r.balance} muted className="font-semibold" />, sort: (r) => r.balance },
    { key: 'status', header: 'Status', cell: (r) => <InvoiceStatus invoice={r} />, sort: (r) => r.state, csv: (r) => INVOICE_STATUS[r.state][0] },
    { key: 'late', header: 'Overdue', align: 'end', hideBelow: 'lg', cell: (r) => (r.late > 0 ? <span className={cn('font-semibold tabular', r.late > 60 ? 'text-danger' : 'text-warning')}>{r.late}d</span> : <span className="text-muted">—</span>), sort: (r) => r.late },
  ]

  const tabTotals = { total: sum(visible, (r) => (r.state === 'void' ? 0 : r.total)), paid: sum(visible, (r) => (r.state === 'void' ? 0 : r.paid)), balance: sum(visible, (r) => r.balance) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Commission tax invoices to clients and developers (5% VAT)."
        breadcrumbs={[{ label: 'Finance', to: '/finance' }, { label: 'Invoices' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New invoice
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fin.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Commission receivables" value={formatMoneyCompact(kpi.receivable)} icon={<Wallet />} footnote={`${kpi.openCount} open invoices · ${formatMoneyCompact(kpi.devShare)} from developers`} />
            <StatCard label="Overdue" value={formatMoneyCompact(kpi.overdue)} icon={<AlarmClock />} tone="danger" footnote={`${kpi.overdueCount} invoices past due date`} />
            <StatCard label="Invoiced · this month" value={formatMoneyCompact(kpi.issued)} icon={<FileText />} tone="royal" footnote={`${kpi.issuedCount} invoices issued (incl. VAT)`} />
            <StatCard label="Collected · this month" value={formatMoneyCompact(kpi.collected)} icon={<ReceiptText />} tone="success" footnote={`${kpi.collectedCount} receipts`} />
          </>
        )}
      </div>

      <div className="space-y-4">
        <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ value: t, label: t === 'all' ? 'All' : INVOICE_STATUS[t][0], count: t === 'all' ? byBillTo.length : byBillTo.filter((r) => r.state === t).length }))} />
        <div className="grid grid-cols-3 gap-3 sm:max-w-[560px]">
          <SummaryChip label="Invoiced" value={formatMoneyCompact(tabTotals.total)} />
          <SummaryChip label="Collected" value={formatMoneyCompact(tabTotals.paid)} tone="success" />
          <SummaryChip label="Balance" value={formatMoneyCompact(tabTotals.balance)} tone={tabTotals.balance > 0 ? 'danger' : undefined} />
        </div>
        <DataTable
          rows={visible}
          columns={columns}
          loading={fin.loading}
          search={(r) => `${r.number} ${customerById(r.customerId)?.name ?? ''} ${dealById(r.dealId)?.code ?? ''} ${r.items[0]?.description ?? ''}`}
          searchPlaceholder="Search number, client, deal…"
          toolbar={
            <Segmented
              value={billTo}
              onChange={setBillTo}
              options={[
                { value: 'all', label: 'All' },
                { value: 'developer', label: 'Developers' },
                { value: 'client', label: 'Clients' },
              ]}
            />
          }
          onRowClick={(r) => navigate({ to: '/finance/invoices/$invoiceId', params: { invoiceId: r.id } })}
          exportName="invoices"
          initialSort={{ key: 'number', dir: 'desc' }}
        />
      </div>

      <InvoiceDrawer open={creating} onClose={() => setCreating(false)} onSaved={(inv) => navigate({ to: '/finance/invoices/$invoiceId', params: { invoiceId: inv.id } })} />
    </div>
  )
}
