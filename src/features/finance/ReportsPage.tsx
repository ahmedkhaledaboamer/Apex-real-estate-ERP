import { BadgeDollarSign, Download, Printer, Receipt, Scale, TrendingUp } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Form'
import { PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { change, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatMoney, formatMoneyCompact } from '@/lib/format'
import { communityBySlug, employeeById } from '@/mocks/core'
import { agencyShare, brokerShare } from '@/mocks/domain'
import type { ExpenseCategory } from '@/types/finance'
import { useFinanceData } from './hooks'
import { COMPANY, EXPENSE_CATEGORY } from './labels'
import { buildPnl, PERIODS, periodRanges, type PeriodId } from './lib'

interface Line {
  label: string
  cur: number
  prev: number
  kind?: 'section' | 'subtotal' | 'total' | 'cost'
  /** Costs: a decrease is good */
  inverse?: boolean
}

export function ReportsPage() {
  const fin = useFinanceData()
  const [period, setPeriod] = useState<PeriodId>('this-month')
  const { cur, prev } = periodRanges(period)

  const report = useMemo(() => {
    if (!fin.ready) return null
    const a = buildPnl(fin.deals, fin.expenses, cur)
    const b = buildPnl(fin.deals, fin.expenses, prev)
    const cats = (Object.keys(EXPENSE_CATEGORY) as ExpenseCategory[]).filter((c) => a.opex[c] || b.opex[c]).sort((x, y) => a.opex[y] - a.opex[x])
    const lines: Line[] = [
      { label: 'Revenue', cur: 0, prev: 0, kind: 'section' },
      { label: 'Sales commission', cur: a.revenue.sale, prev: b.revenue.sale },
      { label: 'Rental commission', cur: a.revenue.rent, prev: b.revenue.rent },
      { label: 'Off-plan commission (developers)', cur: a.revenue.offplan, prev: b.revenue.offplan },
      { label: 'Total revenue (GCI)', cur: a.revenueTotal, prev: b.revenueTotal, kind: 'subtotal' },
      { label: 'Cost of sales', cur: 0, prev: 0, kind: 'section' },
      { label: 'Broker commissions (splits)', cur: -a.brokerCommissions, prev: -b.brokerCommissions, kind: 'cost', inverse: true },
      { label: 'Gross profit (agency net)', cur: a.grossProfit, prev: b.grossProfit, kind: 'subtotal' },
      { label: 'Operating expenses', cur: 0, prev: 0, kind: 'section' },
      ...cats.map((c): Line => ({ label: EXPENSE_CATEGORY[c], cur: -a.opex[c], prev: -b.opex[c], kind: 'cost', inverse: true })),
      { label: 'Total operating expenses', cur: -a.opexTotal, prev: -b.opexTotal, kind: 'subtotal', inverse: true },
      { label: 'Net profit', cur: a.netProfit, prev: b.netProfit, kind: 'total' },
    ]

    const closed = fin.deals.filter((d) => d.stage === 'closed' && d.closedAt && d.closedAt.slice(0, 10) >= cur.from && d.closedAt.slice(0, 10) <= cur.to)
    const comm = new Map<string, { deals: number; volume: number; gci: number }>()
    const brk = new Map<string, { deals: number; gci: number; broker: number; net: number }>()
    for (const d of closed) {
      const c = comm.get(d.communitySlug) ?? { deals: 0, volume: 0, gci: 0 }
      c.deals += 1
      c.volume += d.type === 'rent' ? 0 : d.price
      c.gci += d.commission
      comm.set(d.communitySlug, c)
      const k = brk.get(d.agentId) ?? { deals: 0, gci: 0, broker: 0, net: 0 }
      k.deals += 1
      k.gci += d.commission
      k.broker += brokerShare(d)
      k.net += agencyShare(d)
      brk.set(d.agentId, k)
    }
    const byCommunity = [...comm.entries()].map(([slug, v]) => ({ slug, name: communityBySlug(slug)?.name ?? slug, ...v })).sort((x, y) => y.gci - x.gci)
    const byBroker = [...brk.entries()].map(([id, v]) => ({ id, employee: employeeById(id), ...v })).sort((x, y) => y.gci - x.gci)
    return { a, b, lines, byCommunity, byBroker }
  }, [fin.ready, fin.deals, fin.expenses, cur.from, cur.to, prev.from, prev.to])

  const periodLabel = PERIODS.find((p) => p.value === period)!.label

  const exportCsv = () => {
    if (!report) return
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows: (string | number)[][] = [[`${COMPANY.name} — Profit & loss`], [`${periodLabel}: ${cur.label}`, `Previous: ${prev.label}`], [], ['Line', 'Amount (AED)', '% of revenue', 'Previous (AED)', 'Change %']]
    for (const l of report.lines) {
      if (l.kind === 'section') rows.push([l.label.toUpperCase()])
      else rows.push([l.label, l.cur, report.a.revenueTotal ? ((l.cur / report.a.revenueTotal) * 100).toFixed(1) : '', l.prev, l.prev ? change(l.cur, l.prev).toFixed(1) : ''])
    }
    rows.push(['Net margin %', report.a.margin.toFixed(1), '', report.b.margin.toFixed(1)])
    rows.push([], ['GCI BY COMMUNITY'], ['Community', 'Deals', 'Sales volume', 'GCI'])
    for (const c of report.byCommunity) rows.push([c.name, c.deals, c.volume, c.gci])
    rows.push([], ['GCI BY BROKER'], ['Broker', 'Deals', 'GCI', 'Broker commission', 'Agency net'])
    for (const k of report.byBroker) rows.push([k.employee?.name ?? k.id, k.deals, k.gci, k.broker, k.net])
    const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const el = document.createElement('a')
    el.href = URL.createObjectURL(blob)
    el.download = `pnl-${period}-${cur.from}.csv`
    el.click()
    URL.revokeObjectURL(el.href)
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Financial reports"
          description="Profit & loss on GCI of deals closed in the period, broker splits as cost of sales, and operating expenses."
          breadcrumbs={[{ label: 'Finance', to: '/finance' }, { label: 'Reports' }]}
          actions={
            <>
              <Select value={period} onChange={(e) => setPeriod(e.target.value as PeriodId)} options={PERIODS} className="w-[170px]" aria-label="Period" />
              <Button variant="outline" icon={<Download />} onClick={exportCsv} disabled={!report}>
                Export CSV
              </Button>
              <Button variant="outline" icon={<Printer />} onClick={() => window.print()}>
                Print
              </Button>
            </>
          }
        />
      </div>
      <div className="hidden print:block">
        <h1 className="text-[22px] font-bold">{COMPANY.name} — Profit & loss</h1>
        <p className="text-[13px] text-muted">
          {periodLabel}: {cur.label} · compared with {prev.label}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
        {!report ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label={`Revenue (GCI) · ${periodLabel.toLowerCase()}`} value={formatMoneyCompact(report.a.revenueTotal)} trend={report.b.revenueTotal ? change(report.a.revenueTotal, report.b.revenueTotal) : undefined} trendLabel="vs previous period" footnote={`${report.a.deals} deals closed`} icon={<BadgeDollarSign />} />
            <StatCard label="Gross profit (agency net)" value={formatMoneyCompact(report.a.grossProfit)} trend={report.b.grossProfit ? change(report.a.grossProfit, report.b.grossProfit) : undefined} trendLabel="vs previous period" footnote={`${pct(report.a.grossProfit, report.a.revenueTotal)} of GCI`} icon={<Scale />} tone="royal" />
            <StatCard label="Operating expenses" value={formatMoneyCompact(report.a.opexTotal)} trend={report.b.opexTotal ? change(report.a.opexTotal, report.b.opexTotal) : undefined} trendLabel="vs previous period" inverse footnote={`${pct(report.a.opexTotal, report.a.revenueTotal)} of GCI`} icon={<Receipt />} tone="warning" />
            <StatCard
              label="Net profit"
              value={formatMoneyCompact(report.a.netProfit)}
              icon={<TrendingUp />}
              tone={report.a.netProfit >= 0 ? 'success' : 'danger'}
              footnote={
                <>
                  <span className="font-semibold text-fg">{report.a.margin.toFixed(1)}% net margin</span>
                  {report.b.revenueTotal ? ` · prev. ${report.b.margin.toFixed(1)}%` : ''}
                </>
              }
            />
          </>
        )}
      </div>

      <Card className="overflow-hidden print:break-inside-avoid">
        <CardHeader title="Profit & loss" subtitle={`${cur.label} · compared with ${prev.label}`} />
        <div className="mt-4 overflow-x-auto">
          {!report ? (
            <Skeleton className="m-5 h-[420px]" />
          ) : (
            <table className="w-full min-w-[620px] text-[13.5px]">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                  <th className="px-5 py-2.5 text-start font-semibold">Line</th>
                  <th className="px-4 py-2.5 text-end font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-end font-semibold">% of rev.</th>
                  <th className="px-4 py-2.5 text-end font-semibold">Previous</th>
                  <th className="px-5 py-2.5 text-end font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((l, i) => (
                  <Fragment key={i}>
                    {l.kind === 'section' ? (
                      <tr>
                        <td colSpan={5} className="px-5 pt-4 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-aura uppercase dark:text-[#d6a8e3]">
                          {l.label}
                        </td>
                      </tr>
                    ) : (
                      <tr className={cn('border-b border-line/60', l.kind === 'subtotal' && 'bg-surface-2/40 font-semibold', l.kind === 'total' && 'bg-aura/8 text-[15px] font-bold')}>
                        <td className={cn('px-5 py-2.5', !l.kind || l.kind === 'cost' ? 'ps-8' : '')}>{l.label}</td>
                        <td className={cn('px-4 py-2.5 text-end tabular', l.cur < 0 && 'text-fg/85')}>{fmtSigned(l.cur)}</td>
                        <td className="px-4 py-2.5 text-end text-muted tabular">{report.a.revenueTotal ? `${((Math.abs(l.cur) / report.a.revenueTotal) * 100).toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-2.5 text-end text-muted tabular">{fmtSigned(l.prev)}</td>
                        <td className="px-5 py-2.5 text-end">
                          <Delta cur={l.cur} prev={l.prev} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                <tr>
                  <td className="px-5 py-3 text-muted">Net margin</td>
                  <td className="px-4 py-3 text-end font-semibold tabular">{report.a.margin.toFixed(1)}%</td>
                  <td />
                  <td className="px-4 py-3 text-end text-muted tabular">{report.b.revenueTotal ? `${report.b.margin.toFixed(1)}%` : '—'}</td>
                  <td className="px-5 py-3 text-end text-[12.5px] text-muted tabular">{report.b.revenueTotal ? `${(report.a.margin - report.b.margin >= 0 ? '+' : '')}${(report.a.margin - report.b.margin).toFixed(1)} pts` : '—'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-2 print:grid-cols-2">
        <Card className="overflow-hidden print:break-inside-avoid">
          <CardHeader title="GCI by community" subtitle={`${cur.label} · closed deals`} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[440px] text-[13px]">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                  <th className="px-5 py-2.5 text-start font-semibold">Community</th>
                  <th className="px-3 py-2.5 text-end font-semibold">Deals</th>
                  <th className="px-3 py-2.5 text-end font-semibold">Sales volume</th>
                  <th className="px-5 py-2.5 text-end font-semibold">GCI</th>
                </tr>
              </thead>
              <tbody>
                {report?.byCommunity.map((c) => (
                  <tr key={c.slug} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{c.name}</div>
                      <div className="mt-1 h-1 max-w-[160px] overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-brand-gradient [print-color-adjust:exact]" style={{ width: `${report.a.revenueTotal ? (c.gci / report.a.revenueTotal) * 100 : 0}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-end tabular">{c.deals}</td>
                    <td className="px-3 py-2.5 text-end text-muted tabular">{c.volume ? formatMoneyCompact(c.volume) : '—'}</td>
                    <td className="px-5 py-2.5 text-end font-semibold tabular">{formatMoney(c.gci)}</td>
                  </tr>
                ))}
                {report && !report.byCommunity.length && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted">No deals closed in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="overflow-hidden print:break-inside-avoid">
          <CardHeader title="GCI by broker" subtitle={`${cur.label} · split between broker and agency`} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px] [&_td]:whitespace-nowrap">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                  <th className="px-5 py-2.5 text-start font-semibold">Broker</th>
                  <th className="px-3 py-2.5 text-end font-semibold">Deals</th>
                  <th className="px-3 py-2.5 text-end font-semibold">GCI</th>
                  <th className="px-3 py-2.5 text-end font-semibold">Broker</th>
                  <th className="px-5 py-2.5 text-end font-semibold">Agency</th>
                </tr>
              </thead>
              <tbody>
                {report?.byBroker.map((k) => (
                  <tr key={k.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2.5">{k.employee ? <PersonCell name={k.employee.name} photo={k.employee.photo} hue={k.employee.avatarHue} sub={`${k.employee.commissionSplit ?? 50}% split`} size={28} /> : k.id}</td>
                    <td className="px-3 py-2.5 text-end tabular">{k.deals}</td>
                    <td className="px-3 py-2.5 text-end font-semibold tabular">{formatMoneyCompact(k.gci)}</td>
                    <td className="px-3 py-2.5 text-end text-muted tabular">{formatMoneyCompact(k.broker)}</td>
                    <td className="px-5 py-2.5 text-end tabular">{formatMoneyCompact(k.net)}</td>
                  </tr>
                ))}
                {report && (
                  <tr className="bg-surface-2/40 font-semibold">
                    <td className="px-5 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-end tabular">{sum(report.byBroker, (k) => k.deals)}</td>
                    <td className="px-3 py-2.5 text-end tabular">{formatMoneyCompact(sum(report.byBroker, (k) => k.gci))}</td>
                    <td className="px-3 py-2.5 text-end tabular">{formatMoneyCompact(sum(report.byBroker, (k) => k.broker))}</td>
                    <td className="px-5 py-2.5 text-end tabular">{formatMoneyCompact(sum(report.byBroker, (k) => k.net))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

const pct = (v: number, of: number) => (of ? `${((v / of) * 100).toFixed(1)}%` : '—')
function fmtSigned(v: number) {
  if (!v) return '—'
  return v < 0 ? `(${formatMoney(-v)})` : formatMoney(v)
}
/** Change vs previous; for costs (negative numbers) a smaller cost is shown as good. */
function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <span className="text-muted">—</span>
  const pctChange = ((cur - prev) / Math.abs(prev)) * 100
  const good = pctChange >= 0
  return <span className={cn('text-[12.5px] font-semibold tabular', good ? 'text-success' : 'text-danger')}>{`${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`}</span>
}
