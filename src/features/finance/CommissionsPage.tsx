import { Link } from '@tanstack/react-router'
import { BadgeCheck, Banknote, CalendarCheck2, Hourglass, Wallet, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Segmented, Select } from '@/components/ui/Form'
import { PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney, formatMoneyCompact } from '@/lib/format'
import { DEAL_TYPE } from '@/lib/labels'
import { today } from '@/lib/random'
import { employeeById } from '@/mocks/core'
import { useFinanceData, usePayoutActions } from './hooks'
import { PAYOUT_STATUS } from './labels'
import { dealProperty, monthKeyOf, payoutRows, type PayoutRow } from './lib'

type View = 'all' | 'payable' | 'awaiting' | 'paid'

export function CommissionsPage() {
  const fin = useFinanceData()
  const { run, busy } = usePayoutActions()
  const [view, setView] = useState<View>('all')
  const [broker, setBroker] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const all = useMemo(() => payoutRows(fin.deals, fin.payouts), [fin.deals, fin.payouts])
  const mk = monthKeyOf(today())
  const yearStart = `${today().getFullYear()}-01-01`

  const kpi = useMemo(() => {
    const payable = all.filter((r) => r.status !== 'paid' && r.eligible)
    const awaiting = all.filter((r) => r.status !== 'paid' && !r.eligible)
    const paidMonth = all.filter((r) => r.status === 'paid' && r.paidAt?.slice(0, 7) === mk)
    const ytd = all.filter((r) => (r.deal.closedAt ?? '') >= yearStart)
    return {
      payable: sum(payable, (r) => r.amount),
      payableCount: payable.length,
      approved: sum(payable.filter((r) => r.status === 'approved'), (r) => r.amount),
      awaiting: sum(awaiting, (r) => r.amount),
      awaitingCount: awaiting.length,
      paidMonth: sum(paidMonth, (r) => r.amount),
      paidMonthCount: new Set(paidMonth.map((r) => r.brokerId)).size,
      ytd: sum(ytd, (r) => r.amount),
      ytdGci: sum(ytd, (r) => r.deal.commission),
    }
  }, [all, mk, yearStart])

  // Per-broker summary (last 12 months of closed deals + anything still unpaid)
  const brokers = useMemo(() => {
    const since = monthKeyOf(new Date(today().getFullYear(), today().getMonth() - 11, 1))
    const map = new Map<string, { id: string; deals: number; gci: number; earned: number; paid: number; payable: number; awaiting: number }>()
    for (const r of all) {
      const recent = (r.deal.closedAt ?? '').slice(0, 7) >= since
      if (!recent && r.status === 'paid') continue
      const b = map.get(r.brokerId) ?? { id: r.brokerId, deals: 0, gci: 0, earned: 0, paid: 0, payable: 0, awaiting: 0 }
      if (recent) {
        b.deals += 1
        b.gci += r.deal.commission
        b.earned += r.amount
      }
      if (r.status === 'paid') b.paid += r.amount
      else if (r.eligible) b.payable += r.amount
      else b.awaiting += r.amount
      map.set(r.brokerId, b)
    }
    return [...map.values()].map((b) => ({ ...b, employee: employeeById(b.id) })).filter((b) => b.employee).sort((a, z) => z.earned - a.earned)
  }, [all])

  const rows = useMemo(
    () =>
      all.filter((r) => {
        if (broker && r.brokerId !== broker) return false
        if (view === 'payable') return r.status !== 'paid' && r.eligible
        if (view === 'awaiting') return r.status !== 'paid' && !r.eligible
        if (view === 'paid') return r.status === 'paid'
        return true
      }),
    [all, broker, view],
  )
  const selectable = rows.filter((r) => r.status !== 'paid' && r.eligible)
  const chosen = all.filter((r) => selected.has(r.id))
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const allChosen = selectable.length > 0 && selectable.every((r) => selected.has(r.id))
  const act = async (list: PayoutRow[], to: 'approved' | 'paid') => {
    await run(list, to)
    setSelected(new Set())
  }

  const columns: Column<PayoutRow>[] = [
    {
      key: 'sel',
      header: <input type="checkbox" aria-label="Select all payable" className="size-4 cursor-pointer accent-[var(--color-aura)]" checked={allChosen} disabled={!selectable.length} onChange={() => setSelected(allChosen ? new Set() : new Set(selectable.map((r) => r.id)))} />,
      cell: (r) => <input type="checkbox" aria-label={`Select ${r.deal.code}`} className="size-4 cursor-pointer accent-[var(--color-aura)] disabled:cursor-not-allowed disabled:opacity-30" checked={selected.has(r.id)} disabled={r.status === 'paid' || !r.eligible} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} />,
      className: 'w-10 pe-0',
    },
    {
      key: 'broker',
      header: 'Broker',
      cell: (r) => {
        const e = employeeById(r.brokerId)
        return e ? <PersonCell name={e.name} photo={e.photo} hue={e.avatarHue} sub={`${r.deal.agentSplit}% split`} size={30} /> : '—'
      },
      sort: (r) => employeeById(r.brokerId)?.name ?? '',
    },
    {
      key: 'deal',
      header: 'Deal',
      cell: (r) => (
        <div className="max-w-[240px]">
          <Link to="/sales/deals/$dealId" params={{ dealId: r.dealId }} className="text-[12.5px] font-semibold hover:text-aura" onClick={(e) => e.stopPropagation()}>
            {r.deal.code} · {DEAL_TYPE[r.deal.type]}
          </Link>
          <div className="truncate text-[12px] text-muted">{dealProperty(r.deal).title}</div>
        </div>
      ),
      sort: (r) => r.deal.code,
    },
    { key: 'closed', header: 'Closed', hideBelow: 'lg', cell: (r) => <span className="text-muted">{r.deal.closedAt ? formatDate(r.deal.closedAt) : '—'}</span>, sort: (r) => r.deal.closedAt ?? '' },
    { key: 'gci', header: 'GCI', align: 'end', hideBelow: 'md', cell: (r) => <span className="tabular">{formatMoney(r.deal.commission)}</span>, sort: (r) => r.deal.commission },
    { key: 'amount', header: 'Payout', align: 'end', cell: (r) => <span className="font-semibold tabular">{formatMoney(r.amount)}</span>, sort: (r) => r.amount },
    {
      key: 'collection',
      header: 'Commission',
      hideBelow: 'xl',
      cell: (r) => (r.eligible ? <Badge tone="success">Collected</Badge> : r.deal.collected > 0 ? <Badge tone="warning">Part-collected</Badge> : <Badge tone="neutral">Awaiting client</Badge>),
      csv: (r) => (r.eligible ? 'Collected' : 'Not collected'),
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge value={r.status} map={PAYOUT_STATUS} />, sort: (r) => r.status, csv: (r) => PAYOUT_STATUS[r.status][0] },
    { key: 'paidAt', header: 'Paid', hideBelow: 'lg', cell: (r) => <span className="text-muted">{r.paidAt ? formatDate(r.paidAt) : '—'}</span>, sort: (r) => r.paidAt ?? '' },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (r) =>
        r.status === 'paid' ? (
          <span className="text-[12px] text-muted">{r.reference}</span>
        ) : !r.eligible ? (
          <span className="text-[12px] text-muted">Pending collection</span>
        ) : r.status === 'pending' ? (
          <Button size="sm" variant="soft" disabled={busy} onClick={(e) => (e.stopPropagation(), act([r], 'approved'))}>
            Approve
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={(e) => (e.stopPropagation(), act([r], 'paid'))}>
            Mark paid
          </Button>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent commissions"
        description="Broker payouts from closed deals (commission × broker split). A payout becomes payable once the deal’s commission is collected."
        breadcrumbs={[{ label: 'Finance', to: '/finance' }, { label: 'Agent commissions' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fin.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Payable now" value={formatMoneyCompact(kpi.payable)} icon={<Wallet />} footnote={`${kpi.payableCount} payouts · ${formatMoneyCompact(kpi.approved)} approved`} />
            <StatCard label="Paid · this month" value={formatMoneyCompact(kpi.paidMonth)} icon={<Banknote />} tone="success" footnote={`Commission run to ${kpi.paidMonthCount} brokers`} />
            <StatCard label="Pending collection" value={formatMoneyCompact(kpi.awaiting)} icon={<Hourglass />} tone="warning" footnote={`${kpi.awaitingCount} deals awaiting client / developer`} />
            <StatCard label="Broker commissions · YTD" value={formatMoneyCompact(kpi.ytd)} icon={<CalendarCheck2 />} tone="royal" footnote={`${kpi.ytdGci ? ((kpi.ytd / kpi.ytdGci) * 100).toFixed(0) : 0}% of ${formatMoneyCompact(kpi.ytdGci)} GCI`} />
          </>
        )}
      </div>

      {/* Broker cards */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Brokers · last 12 months</h2>
          <div className="flex items-center gap-4">
            {broker && (
              <button type="button" onClick={() => setBroker('')} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-aura dark:text-[#d6a8e3]">
                <X className="size-3.5" /> Clear filter
              </button>
            )}
            {brokers.length > 8 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[12.5px] font-semibold text-aura hover:underline dark:text-[#d6a8e3]">
                {showAll ? 'Show top 8' : `Show all ${brokers.length}`}
              </button>
            )}
          </div>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 2xl:grid-cols-4">
          {fin.loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[190px] min-w-[280px] rounded-card" />)
            : (showAll ? brokers : brokers.slice(0, 8)).map((b) => {
                const e = b.employee!
                const paidPct = b.earned ? Math.min(100, (b.paid / (b.paid + b.payable + b.awaiting || 1)) * 100) : 0
                return (
                  <Card
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setBroker(broker === b.id ? '' : b.id)}
                    onKeyDown={(ev) => ev.key === 'Enter' && setBroker(broker === b.id ? '' : b.id)}
                    className={cn('min-w-[280px] cursor-pointer snap-start p-4 transition-[border-color,box-shadow] hover:border-aura/40 sm:min-w-0', broker === b.id && 'border-aura ring-2 ring-aura/20')}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={e.name} photo={e.photo} hue={e.avatarHue} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{e.name}</div>
                        <div className="truncate text-[12px] text-muted">{e.title}</div>
                      </div>
                      <Badge tone="brand">{e.commissionSplit ?? 50}%</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
                      <Mini k="Deals" v={String(b.deals)} />
                      <Mini k="GCI" v={formatMoneyCompact(b.gci).replace('AED ', '')} />
                      <Mini k="Earned" v={formatMoneyCompact(b.earned).replace('AED ', '')} />
                    </div>
                    <Progress value={paidPct} tone="success" className="mt-4" />
                    <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-muted">
                        Paid <span className="font-semibold text-fg tabular">{formatMoneyCompact(b.paid)}</span>
                      </span>
                      <span className={cn('font-semibold tabular', b.payable > 0 ? 'text-aura dark:text-[#d6a8e3]' : 'text-muted')}>Payable {formatMoneyCompact(b.payable)}</span>
                    </div>
                  </Card>
                )
              })}
        </div>
      </div>

      {chosen.length > 0 && (
        <div className="sticky top-[72px] z-20 flex flex-wrap items-center gap-3 rounded-card border border-aura/30 bg-surface px-4 py-3 shadow-lift">
          <span className="text-[13.5px]">
            <span className="font-semibold">{chosen.length} selected</span> · <span className="tabular">{formatMoney(sum(chosen, (r) => r.amount))}</span>
          </span>
          <div className="ms-auto flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button size="sm" variant="soft" icon={<BadgeCheck />} loading={busy} disabled={!chosen.some((r) => r.status === 'pending')} onClick={() => act(chosen.filter((r) => r.status === 'pending'), 'approved')}>
              Approve
            </Button>
            <Button size="sm" icon={<Banknote />} loading={busy} onClick={() => act(chosen, 'paid')}>
              Mark paid
            </Button>
          </div>
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        loading={fin.loading}
        search={(r) => `${r.deal.code} ${employeeById(r.brokerId)?.name ?? ''} ${dealProperty(r.deal).title} ${r.reference}`}
        searchPlaceholder="Search deal, broker, property…"
        toolbar={
          <>
            <Segmented
              size="sm"
              value={view}
              onChange={(v) => (setView(v), setSelected(new Set()))}
              options={[
                { value: 'all', label: 'All' },
                { value: 'payable', label: 'Payable' },
                { value: 'awaiting', label: 'Awaiting' },
                { value: 'paid', label: 'Paid' },
              ]}
            />
            <Select value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="All brokers" options={brokers.map((b) => ({ value: b.id, label: b.employee!.name }))} className="w-full sm:w-[200px]" aria-label="Broker" />
          </>
        }
        exportName="broker-payouts"
        initialSort={{ key: 'closed', dir: 'desc' }}
      />
    </div>
  )
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-surface-2/70 px-2.5 py-2">
      <div className="text-[11px] text-muted">{k}</div>
      <div className="mt-0.5 text-[14px] font-bold tabular">{v}</div>
    </div>
  )
}
