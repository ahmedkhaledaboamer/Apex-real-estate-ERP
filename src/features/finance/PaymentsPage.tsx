import { Link } from '@tanstack/react-router'
import { Banknote, Building2, Clock3, Plus, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DonutChart } from '@/components/charts/Charts'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Form'
import { PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { sum } from '@/lib/calc'
import { formatDate, formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format'
import { optionsOf, PAYMENT_METHOD } from '@/lib/labels'
import { customerById, employeeById } from '@/mocks/core'
import { dealById } from '@/mocks/domain'
import type { Payment, PaymentMethod } from '@/types/domain'
import { useFinanceData } from './hooks'
import { addDays, monthKeyOf, todayIso } from './lib'
import { Money } from './parts'
import { RecordPaymentDrawer } from './RecordPaymentDrawer'
import { today } from '@/lib/random'

type Preset = 'this-month' | 'last-month' | '90d' | 'ytd' | 'all'
const PRESETS: { value: Preset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
]
function presetRange(p: Preset): [string, string] {
  const t = today()
  const end = todayIso()
  if (p === 'this-month') return [`${monthKeyOf(t)}-01`, end]
  if (p === 'last-month') {
    const s = new Date(t.getFullYear(), t.getMonth() - 1, 1)
    const e = new Date(t.getFullYear(), t.getMonth(), 0)
    return [`${monthKeyOf(s)}-01`, `${monthKeyOf(e)}-${String(e.getDate()).padStart(2, '0')}`]
  }
  if (p === '90d') return [addDays(end, -89), end]
  if (p === 'ytd') return [`${t.getFullYear()}-01-01`, end]
  return ['0000', '9999']
}
const METHOD_COLOR: Record<PaymentMethod, string> = { 'bank-transfer': '#843f96', cheque: '#275ba8', 'manager-cheque': '#3cb4e8', card: '#d9891a', cash: '#1f9d64' }

export function PaymentsPage() {
  const fin = useFinanceData()
  const [creating, setCreating] = useCreateParam()
  const [preset, setPreset] = useState<Preset>('90d')
  const [method, setMethod] = useState<PaymentMethod | ''>('')

  const [from, to] = presetRange(preset)
  const inRange = useMemo(() => fin.payments.filter((p) => p.date >= from && p.date <= to), [fin.payments, from, to])
  const rows = useMemo(() => inRange.filter((p) => !method || p.method === method), [inRange, method])

  const kpi = useMemo(() => {
    const total = sum(inRange, (p) => p.amount)
    const dev = sum(
      inRange.filter((p) => customerById(p.customerId)?.type === 'developer'),
      (p) => p.amount,
    )
    const days = inRange
      .map((p) => {
        const inv = fin.invoices.find((i) => i.id === p.invoiceId)
        return inv ? (new Date(p.date).getTime() - new Date(inv.issueDate).getTime()) / 86_400_000 : null
      })
      .filter((d): d is number => d !== null && d >= 0)
    return { total, count: inRange.length, dev, devPct: total ? (dev / total) * 100 : 0, avgDays: days.length ? sum(days, (d) => d) / days.length : 0, avg: inRange.length ? total / inRange.length : 0 }
  }, [inRange, fin.invoices])

  const byMethod = useMemo(
    () =>
      (Object.keys(PAYMENT_METHOD) as PaymentMethod[])
        .map((m) => ({ name: PAYMENT_METHOD[m], value: sum(inRange.filter((p) => p.method === m), (p) => p.amount), color: METHOD_COLOR[m] }))
        .filter((x) => x.value > 0),
    [inRange],
  )

  const columns: Column<Payment>[] = [
    { key: 'number', header: 'Receipt', cell: (p) => <span className="font-semibold">{p.number}</span>, sort: (p) => p.number },
    { key: 'date', header: 'Date', cell: (p) => <span className="text-muted">{formatDate(p.date)}</span>, sort: (p) => p.date },
    {
      key: 'from',
      header: 'Received from',
      cell: (p) => {
        const c = customerById(p.customerId)
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[200px] truncate font-medium">{c?.name ?? '—'}</span>
            {c?.type === 'developer' && <Badge tone="brand">Developer</Badge>}
          </div>
        )
      },
      sort: (p) => customerById(p.customerId)?.name ?? '',
    },
    {
      key: 'invoice',
      header: 'Invoice',
      hideBelow: 'md',
      cell: (p) => {
        const inv = fin.invoices.find((i) => i.id === p.invoiceId)
        return inv ? (
          <Link to="/finance/invoices/$invoiceId" params={{ invoiceId: inv.id }} onClick={(e) => e.stopPropagation()} className="font-medium text-aura hover:underline dark:text-[#d6a8e3]">
            {inv.number}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        )
      },
      csv: (p) => fin.invoices.find((i) => i.id === p.invoiceId)?.number ?? '',
    },
    { key: 'deal', header: 'Deal', hideBelow: 'xl', cell: (p) => <span className="text-muted">{dealById(p.dealId)?.code ?? '—'}</span>, csv: (p) => dealById(p.dealId)?.code ?? '' },
    { key: 'method', header: 'Method', hideBelow: 'sm', cell: (p) => <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: METHOD_COLOR[p.method] }} />{PAYMENT_METHOD[p.method]}</span>, sort: (p) => PAYMENT_METHOD[p.method] },
    { key: 'ref', header: 'Reference', hideBelow: 'lg', cell: (p) => <span className="text-muted tabular">{p.reference}</span>, csv: (p) => p.reference },
    { key: 'by', header: 'Received by', hideBelow: '2xl', cell: (p) => <span className="text-muted">{employeeById(p.receivedById)?.name ?? '—'}</span>, csv: (p) => employeeById(p.receivedById)?.name ?? '' },
    { key: 'amount', header: 'Amount', align: 'end', cell: (p) => <Money value={p.amount} className="font-semibold" />, sort: (p) => p.amount },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Commission receipts from clients and developers."
        breadcrumbs={[{ label: 'Finance', to: '/finance' }, { label: 'Payments' }]}
        actions={
          <>
            <Select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} options={PRESETS} className="w-[160px]" aria-label="Period" />
            <Button icon={<Plus />} onClick={() => setCreating(true)}>
              Record payment
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fin.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label={`Received · ${PRESETS.find((p) => p.value === preset)!.label.toLowerCase()}`} value={formatMoneyCompact(kpi.total)} icon={<Banknote />} tone="success" footnote="incl. 5% VAT" />
            <StatCard label="Receipts" value={formatNumber(kpi.count)} icon={<ReceiptText />} tone="royal" footnote={`Average ${formatMoneyCompact(kpi.avg)}`} />
            <StatCard label="From developers" value={formatMoneyCompact(kpi.dev)} icon={<Building2 />} footnote={`${kpi.devPct.toFixed(0)}% of receipts · off-plan commission`} />
            <StatCard label="Avg. time to collect" value={`${kpi.avgDays.toFixed(0)} days`} icon={<Clock3 />} tone="warning" footnote="From invoice date to receipt" />
          </>
        )}
      </div>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <DataTable
          rows={rows}
          columns={columns}
          loading={fin.loading}
          search={(p) => `${p.number} ${p.reference} ${customerById(p.customerId)?.name ?? ''} ${dealById(p.dealId)?.code ?? ''}`}
          searchPlaceholder="Search receipt, client, reference…"
          toolbar={<Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')} options={optionsOf(PAYMENT_METHOD)} placeholder="All methods" className="w-full sm:w-[180px]" aria-label="Method" />}
          exportName="payments"
          initialSort={{ key: 'date', dir: 'desc' }}
        />
        <Card>
          <CardHeader title="By method" subtitle={PRESETS.find((p) => p.value === preset)!.label} />
          <CardBody>{byMethod.length ? <DonutChart data={byMethod} height={180} format={(v) => formatMoneyCompact(v)} centerLabel="received" centerValue={formatMoneyCompact(kpi.total).replace('AED ', '')} /> : <p className="text-[13px] text-muted">No receipts in this period.</p>}</CardBody>
          <CardBody className="border-t border-line pt-4 text-[12.5px] text-muted">
            Largest receipt: <span className="font-semibold text-fg">{inRange.length ? formatMoney(Math.max(...inRange.map((p) => p.amount))) : '—'}</span>
          </CardBody>
        </Card>
      </div>

      <RecordPaymentDrawer open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
