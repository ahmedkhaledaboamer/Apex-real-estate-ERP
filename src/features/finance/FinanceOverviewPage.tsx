import { Link } from '@tanstack/react-router'
import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, Banknote, FileBarChart2, Landmark, PiggyBank, Plus, Receipt, Scale, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { BarsChart, DonutChart } from '@/components/charts/Charts'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { IconTile, PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { change, invoiceTotals, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatMoney, formatMoneyCompact, formatShortDate } from '@/lib/format'
import { employeeById } from '@/mocks/core'
import type { ExpenseCategory } from '@/types/finance'
import { useFinanceData } from './hooks'
import { ACCOUNT_KIND, EXPENSE_CATEGORY, EXPENSE_COLOR } from './labels'
import { accountBalances, ageing, buildPnl, isOpenInvoice, monthKeyOf, monthlySeries, payoutRows, periodRanges, transactions } from './lib'
import { today } from '@/lib/random'

const AGE_COLORS = ['#1f9d64', '#d9891a', '#e07a2e', '#d64545', '#9b2c2c']

export function FinanceOverviewPage() {
  const fin = useFinanceData()

  const data = useMemo(() => {
    if (!fin.ready) return null
    const { cur, prev } = periodRanges('this-month')
    const pnl = buildPnl(fin.deals, fin.expenses, cur)
    const last = buildPnl(fin.deals, fin.expenses, prev)
    const series = monthlySeries(fin.deals, fin.expenses)
    const open = fin.invoices.filter(isOpenInvoice)
    const receivable = sum(open, (i) => invoiceTotals(i).balance)
    const age = ageing(fin.invoices)
    const overdue = sum(age.slice(1), (a) => a.value)
    const payouts = payoutRows(fin.deals, fin.payouts)
    const payable = payouts.filter((p) => p.status !== 'paid' && p.eligible)
    const txns = transactions(fin.payments, fin.expenses, fin.payouts, (id) => employeeById(id)?.name ?? 'Broker')
    const balances = accountBalances(fin.accounts, txns)
    const operating = balances.filter((b) => !b.account.clientMoney)
    const cash = sum(operating, (b) => b.balance)
    const mk = monthKeyOf(today())
    const collected = sum(fin.payments.filter((p) => p.date.slice(0, 7) === mk), (p) => p.amount)
    const cats = (Object.keys(pnl.opex) as ExpenseCategory[])
      .map((c) => ({ name: EXPENSE_CATEGORY[c], value: pnl.opex[c], color: EXPENSE_COLOR[c] }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
    return {
      pnl,
      last,
      series,
      receivable,
      openCount: open.length,
      overdue,
      age,
      payable: sum(payable, (p) => p.amount),
      payableCount: payable.length,
      balances,
      cash,
      escrow: sum(balances.filter((b) => b.account.clientMoney), (b) => b.balance),
      collected,
      cats,
      recent: txns.slice(0, 9),
    }
  }, [fin.ready, fin.deals, fin.expenses, fin.invoices, fin.payouts, fin.payments, fin.accounts])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts & Finance"
        description="Commission income, collections, operating costs and cash — this month at a glance."
        actions={
          <>
            <ButtonLink to="/finance/reports" variant="outline" icon={<FileBarChart2 />}>
              P&amp;L report
            </ButtonLink>
            <ButtonLink to="/finance/invoices" search={{ new: 1 } as never} icon={<Plus />}>
              New invoice
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!data ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-card" />)
        ) : (
          <>
            <StatCard label="GCI · this month" value={formatMoneyCompact(data.pnl.revenueTotal)} trend={change(data.pnl.revenueTotal, data.last.revenueTotal)} icon={<BadgeDollarSign />} spark={data.series.slice(-8).map((m) => m.gci)} />
            <StatCard label="Agency net after broker splits" value={formatMoneyCompact(data.pnl.grossProfit)} trend={change(data.pnl.grossProfit, data.last.grossProfit)} icon={<Scale />} tone="royal" spark={data.series.slice(-8).map((m) => m.net)} />
            <StatCard label="Operating expenses · this month" value={formatMoneyCompact(data.pnl.opexTotal)} trend={change(data.pnl.opexTotal, data.last.opexTotal)} inverse icon={<Receipt />} tone="warning" spark={data.series.slice(-8).map((m) => m.opex)} />
            <StatCard
              label="Net profit · this month"
              value={formatMoneyCompact(data.pnl.netProfit)}
              icon={<TrendingUp />}
              tone={data.pnl.netProfit >= 0 ? 'success' : 'danger'}
              footnote={
                <>
                  <span className={cn('font-semibold', data.pnl.margin >= 0 ? 'text-success' : 'text-danger')}>{data.pnl.margin.toFixed(1)}% margin</span> · MTD · last month {data.last.margin.toFixed(1)}%
                </>
              }
              spark={data.series.slice(-8).map((m) => m.profit)}
            />
            <StatCard label="Cash & bank" value={formatMoneyCompact(data.cash)} icon={<Landmark />} tone="cyan" footnote={`+ ${formatMoneyCompact(data.escrow)} client money in escrow`} />
            <StatCard label="Commission receivables" value={formatMoneyCompact(data.receivable)} icon={<Wallet />} tone="royal" footnote={<span><span className="font-semibold text-danger">{formatMoneyCompact(data.overdue)} overdue</span> · {data.openCount} invoices</span>} />
            <StatCard label="Broker commissions payable" value={formatMoneyCompact(data.payable)} icon={<Users />} footnote={`${data.payableCount} payouts — commission collected`} />
            <StatCard label="Collected · this month" value={formatMoneyCompact(data.collected)} icon={<PiggyBank />} tone="success" footnote="Receipts incl. VAT" />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <Card className="xl:col-span-2">
          <CardHeader title="GCI, operating expenses & net profit" subtitle="Last 12 months · net profit = GCI − broker commissions − operating expenses" />
          <CardBody>{data ? <BarsChart data={data.series} x="month" height={300} series={[{ key: 'gci', label: 'GCI', color: '#843f96' }, { key: 'opex', label: 'Operating expenses', color: '#d9891a' }, { key: 'profit', label: 'Net profit', color: '#1f9d64' }]} format={(v) => formatMoneyCompact(v)} /> : <Skeleton className="h-[300px]" />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Receivables ageing" subtitle="Open commission invoices by days past due" actions={<Link to="/finance/invoices" className="text-[12.5px] font-semibold text-aura hover:underline dark:text-[#d6a8e3]">Invoices</Link>} />
          <CardBody className="space-y-4">
            {data ? (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
                  {data.age.map((a, i) => (
                    <div key={a.name} style={{ width: `${data.receivable ? (a.value / data.receivable) * 100 : 0}%`, background: AGE_COLORS[i] }} title={a.name} />
                  ))}
                </div>
                <ul className="space-y-3">
                  {data.age.map((a, i) => (
                    <li key={a.name} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: AGE_COLORS[i] }} />
                        <span className="text-muted">{a.name}</span>
                        <span className="text-[11.5px] text-muted">· {a.count}</span>
                      </span>
                      <span className="font-semibold tabular">{formatMoney(a.value)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-line pt-3 text-[13.5px] font-bold">
                  <span>Total outstanding</span>
                  <span className="tabular">{formatMoney(data.receivable)}</span>
                </div>
              </>
            ) : (
              <Skeleton className="h-[240px]" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Expenses by category" subtitle="This month · net of VAT" actions={<Link to="/finance/expenses" className="text-[12.5px] font-semibold text-aura hover:underline dark:text-[#d6a8e3]">Expenses</Link>} />
          <CardBody>{data ? <DonutChart data={data.cats.slice(0, 7).concat(data.cats.length > 7 ? [{ name: 'Other', value: sum(data.cats.slice(7), (c) => c.value), color: '#9a90a8' }] : [])} height={180} format={(v) => formatMoneyCompact(v)} centerLabel="this month" centerValue={formatMoneyCompact(data.pnl.opexTotal).replace('AED ', '')} /> : <Skeleton className="h-[200px]" />}</CardBody>
        </Card>

        <Card>
          <CardHeader title="Accounts" subtitle="Live balances" />
          <CardBody className="space-y-3 pt-4">
            {data
              ? data.balances.map((b) => (
                  <div key={b.account.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <IconTile tone={b.account.clientMoney ? 'warning' : b.account.kind === 'current' ? 'royal' : b.account.kind === 'petty-cash' ? 'success' : 'cyan'} className="size-9 [&_svg]:size-[18px]">
                      {b.account.clientMoney ? <ShieldCheck /> : b.account.kind === 'petty-cash' ? <Banknote /> : <Landmark />}
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">{b.account.name}</div>
                      <div className="truncate text-[12px] text-muted">
                        {b.account.bank} · {ACCOUNT_KIND[b.account.kind]}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-[14px] font-bold tabular">{formatMoneyCompact(b.balance)}</div>
                      <div className="text-[11.5px] text-muted tabular">
                        {b.flowIn > 0 && <span className="text-success">+{formatMoneyCompact(b.flowIn).replace('AED ', '')}</span>}
                        {b.flowIn > 0 && b.flowOut > 0 && ' / '}
                        {b.flowOut > 0 && <span className="text-danger">−{formatMoneyCompact(b.flowOut).replace('AED ', '')}</span>}
                        {!b.flowIn && !b.flowOut && 'no movement'}
                      </div>
                    </div>
                  </div>
                ))
              : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[62px]" />)}
            <p className="text-[11.5px] text-muted">Month-to-date movement shown under each balance. Escrow holds client deposits and is excluded from agency cash.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent transactions" subtitle="Receipts, bills and broker payouts" actions={<Link to="/finance/payments" className="text-[12.5px] font-semibold text-aura hover:underline dark:text-[#d6a8e3]">Payments</Link>} />
          <CardBody className="pt-3">
            <ul className="divide-y divide-line">
              {data
                ? data.recent.map((t) => {
                    const inflow = t.amount > 0
                    const body = (
                      <>
                        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', inflow ? 'bg-success/10 text-success' : t.kind === 'payout' ? 'bg-aura/10 text-aura dark:text-[#d6a8e3]' : 'bg-danger/10 text-danger')}>
                          {inflow ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{t.label}</span>
                          <span className="block truncate text-[12px] text-muted">
                            {formatShortDate(t.date)} · {t.sub}
                          </span>
                        </span>
                        <span className={cn('text-[13px] font-semibold whitespace-nowrap tabular', inflow ? 'text-success' : 'text-fg')}>
                          {inflow ? '+' : '−'}
                          {formatMoney(Math.abs(t.amount))}
                        </span>
                      </>
                    )
                    return (
                      <li key={t.kind + t.id}>
                        {t.link ? (
                          <Link to={t.link.to} params={t.link.params as never} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2/70">
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 py-2.5">{body}</div>
                        )}
                      </li>
                    )
                  })
                : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="my-2 h-10" />)}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
