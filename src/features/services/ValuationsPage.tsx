import { BadgeDollarSign, ClipboardCheck, FileSearch, Percent, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Segmented } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { formatDate, formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format'
import { dateFromNow } from '@/lib/random'
import { communityBySlug, customerById, employeeById } from '@/mocks/core'
import { mortgageReferrals, valuationRequests } from '@/mocks/services'
import type { MortgageReferral, MortgageStatus, ValuationRequest, ValuationStatus } from '@/types/services'
import { MORTGAGE_STATUS, VALUATION_PURPOSE, VALUATION_STATUS } from './labels'
import { MortgageDrawer, ValuationDrawer } from './ValuationDrawers'

type Tab = 'valuations' | 'mortgages'

export function ValuationsPage() {
  const { data: vals, isLoading: vLoading } = valuationRequests.useList()
  const { data: mtgs, isLoading: mLoading } = mortgageReferrals.useList()
  const updateVal = valuationRequests.useUpdate()
  const updateMtg = mortgageReferrals.useUpdate()
  const [creating, setCreating] = useCreateParam()
  const [tab, setTab] = useState<Tab>('valuations')
  const [editVal, setEditVal] = useState<ValuationRequest | null>(null)
  const [editMtg, setEditMtg] = useState<MortgageReferral | null>(null)
  const [vStatus, setVStatus] = useState<'all' | ValuationStatus>('all')
  const [mStatus, setMStatus] = useState<'all' | MortgageStatus>('all')

  const kpi = useMemo(() => {
    const v = vals ?? []
    const m = mtgs ?? []
    const since30 = dateFromNow(-30)
    const decided = m.filter((x) => x.status === 'approved' || x.status === 'disbursed' || x.status === 'declined')
    const approved = decided.filter((x) => x.status !== 'declined')
    const disbursed = m.filter((x) => x.status === 'disbursed')
    const pipeline = m.filter((x) => x.status === 'referred' || x.status === 'pre-approved' || x.status === 'approved')
    return {
      open: v.filter((x) => x.status !== 'completed').length,
      newCount: v.filter((x) => x.status === 'new').length,
      reports30: v.filter((x) => x.status === 'completed' && x.reportDate && x.reportDate >= since30).length,
      fees: disbursed.reduce((a, x) => a + x.referralFee, 0),
      pipelineFees: pipeline.reduce((a, x) => a + x.referralFee, 0),
      approvalRate: decided.length ? (approved.length / decided.length) * 100 : 0,
      decided: decided.length,
      pipelineLoans: pipeline.reduce((a, x) => a + x.loanAmount, 0),
      pipelineCount: pipeline.length,
    }
  }, [vals, mtgs])

  const valColumns: Column<ValuationRequest>[] = [
    {
      key: 'client',
      header: 'Client',
      sort: (v) => customerById(v.clientId)?.name ?? '',
      cell: (v) => {
        const c = customerById(v.clientId)
        return c ? <PersonCell name={c.name} hue={c.avatarHue} sub={v.code} size={28} /> : v.code
      },
    },
    {
      key: 'property',
      header: 'Property',
      sort: (v) => communityBySlug(v.communitySlug)?.name ?? '',
      cell: (v) => (
        <span className="block max-w-[220px]">
          <span className="block truncate font-medium">
            {v.beds ? `${v.beds}-bed ` : ''}
            {v.propertyType.toLowerCase()} · {formatNumber(v.sqft)} sqft
          </span>
          <span className="block truncate text-[12px] text-muted">
            {v.building ? `${v.building} · ` : ''}
            {communityBySlug(v.communitySlug)?.name}
          </span>
        </span>
      ),
    },
    { key: 'purpose', header: 'Purpose', sort: (v) => v.purpose, hideBelow: 'md', cell: (v) => VALUATION_PURPOSE[v.purpose] },
    { key: 'requested', header: 'Requested', sort: (v) => v.requestedAt, hideBelow: 'lg', cell: (v) => <span className="tabular">{formatDate(v.requestedAt)}</span> },
    {
      key: 'valuer',
      header: 'Valuer',
      hideBelow: 'xl',
      sort: (v) => employeeById(v.valuerId)?.name ?? '',
      cell: (v) => {
        const e = employeeById(v.valuerId)
        return e ? (
          <span className="flex items-center gap-2">
            <Avatar name={e.name} hue={e.avatarHue} photo={e.photo} size={24} />
            {e.name}
          </span>
        ) : (
          '—'
        )
      },
    },
    {
      key: 'estimate',
      header: 'Estimated value',
      align: 'end',
      hideBelow: 'sm',
      sort: (v) => v.estimateHigh ?? 0,
      cell: (v) =>
        v.estimateLow && v.estimateHigh ? (
          <span className="font-semibold tabular">
            {formatMoneyCompact(v.estimateLow)} – {formatMoneyCompact(v.estimateHigh).replace('AED ', '')}
          </span>
        ) : (
          <span className="text-muted">{v.scheduledAt ? `Visit ${formatDate(v.scheduledAt)}` : '—'}</span>
        ),
    },
    { key: 'status', header: 'Status', sort: (v) => v.status, cell: (v) => <StatusBadge value={v.status} map={VALUATION_STATUS} /> },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (v) => (
        <Menu
          items={[
            { label: 'Edit', onSelect: () => setEditVal(v) },
            ...(v.status === 'new' ? [{ label: 'Book inspection (tomorrow)', onSelect: () => updateVal.mutate({ id: v.id, patch: { status: 'scheduled', scheduledAt: dateFromNow(1) } }) }] : []),
            ...(v.status !== 'completed' ? [{ label: 'Issue report…', onSelect: () => setEditVal({ ...v, status: 'completed' }) }] : []),
          ]}
        />
      ),
    },
  ]

  const mtgColumns: Column<MortgageReferral>[] = [
    {
      key: 'client',
      header: 'Buyer',
      sort: (m) => customerById(m.clientId)?.name ?? '',
      cell: (m) => {
        const c = customerById(m.clientId)
        return c ? <PersonCell name={c.name} hue={c.avatarHue} sub={m.code} size={28} /> : m.code
      },
    },
    { key: 'bank', header: 'Bank', sort: (m) => m.bank, hideBelow: 'md', cell: (m) => <span className="font-medium">{m.bank}</span> },
    { key: 'price', header: 'Property price', align: 'end', sort: (m) => m.propertyPrice, hideBelow: 'lg', cell: (m) => <span className="tabular">{formatMoneyCompact(m.propertyPrice)}</span> },
    {
      key: 'loan',
      header: 'Loan',
      align: 'end',
      sort: (m) => m.loanAmount,
      cell: (m) => (
        <span className="tabular">
          <span className="font-semibold">{formatMoneyCompact(m.loanAmount)}</span>
          <span className="block text-[12px] text-muted">{m.ltvPct}% LTV</span>
        </span>
      ),
    },
    { key: 'fee', header: 'Referral fee', align: 'end', sort: (m) => m.referralFee, hideBelow: 'sm', cell: (m) => <span className={m.status === 'disbursed' ? 'font-semibold text-success tabular' : 'text-muted tabular'}>{formatMoney(m.referralFee)}</span> },
    {
      key: 'broker',
      header: 'Broker',
      hideBelow: 'xl',
      sort: (m) => employeeById(m.brokerId)?.name ?? '',
      cell: (m) => {
        const e = employeeById(m.brokerId)
        return e ? (
          <span className="flex items-center gap-2">
            <Avatar name={e.name} hue={e.avatarHue} photo={e.photo} size={24} />
            {e.name}
          </span>
        ) : (
          '—'
        )
      },
    },
    { key: 'date', header: 'Referred', sort: (m) => m.referredAt, hideBelow: '2xl', cell: (m) => <span className="tabular">{formatDate(m.referredAt)}</span> },
    { key: 'status', header: 'Status', sort: (m) => m.status, cell: (m) => <StatusBadge value={m.status} map={MORTGAGE_STATUS} /> },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (m) => {
        const next: Partial<Record<MortgageStatus, MortgageStatus>> = { referred: 'pre-approved', 'pre-approved': 'approved', approved: 'disbursed' }
        const to = next[m.status]
        return (
          <Menu
            items={[
              { label: 'Edit', onSelect: () => setEditMtg(m) },
              ...(to ? [{ label: `Mark ${MORTGAGE_STATUS[to][0].toLowerCase()}`, onSelect: () => updateMtg.mutate({ id: m.id, patch: { status: to } }) }] : []),
              ...(m.status !== 'declined' && m.status !== 'disbursed' ? [{ label: 'Mark declined', danger: true, onSelect: () => updateMtg.mutate({ id: m.id, patch: { status: 'declined' } }) }] : []),
            ]}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Valuations & mortgages"
        description="Broker valuations for owners, and buyer referrals to our mortgage partner."
        breadcrumbs={[{ label: 'Services' }, { label: 'Valuations & mortgages' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            {tab === 'valuations' ? 'New valuation' : 'New referral'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {vLoading || mLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Open valuations" value={kpi.open} icon={<FileSearch />} footnote={`${kpi.newCount} awaiting an inspection date`} />
            <StatCard label="Reports issued · 30 days" value={kpi.reports30} icon={<ClipboardCheck />} tone="royal" footnote="Completed valuations" />
            <StatCard label="Referral fees earned" value={formatMoneyCompact(kpi.fees)} icon={<BadgeDollarSign />} tone="success" footnote={`${formatMoneyCompact(kpi.pipelineFees)} more in pipeline`} />
            <StatCard label="Mortgage approval rate" value={`${kpi.approvalRate.toFixed(0)}%`} icon={<Percent />} tone="cyan" footnote={`${kpi.decided} decided · ${formatMoneyCompact(kpi.pipelineLoans)} in ${kpi.pipelineCount} open files`} />
          </>
        )}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'valuations', label: 'Valuation requests', count: vals?.length },
          { value: 'mortgages', label: 'Mortgage referrals', count: mtgs?.length },
        ]}
      />

      {tab === 'valuations' ? (
        <DataTable
          rows={(vals ?? []).filter((v) => vStatus === 'all' || v.status === vStatus)}
          columns={valColumns}
          loading={vLoading}
          search={(v) => `${v.code} ${customerById(v.clientId)?.name} ${v.building} ${communityBySlug(v.communitySlug)?.name}`}
          searchPlaceholder="Search client, community…"
          onRowClick={setEditVal}
          exportName="valuations"
          initialSort={{ key: 'requested', dir: 'desc' }}
          toolbar={
            <div className="max-w-full overflow-x-auto">
              <Segmented value={vStatus} onChange={setVStatus} options={[{ value: 'all' as const, label: 'All' }, ...(Object.keys(VALUATION_STATUS) as ValuationStatus[]).map((s) => ({ value: s, label: VALUATION_STATUS[s][0] }))]} />
            </div>
          }
        />
      ) : (
        <DataTable
          rows={(mtgs ?? []).filter((m) => mStatus === 'all' || m.status === mStatus)}
          columns={mtgColumns}
          loading={mLoading}
          search={(m) => `${m.code} ${customerById(m.clientId)?.name} ${m.bank}`}
          searchPlaceholder="Search buyer, bank…"
          onRowClick={setEditMtg}
          exportName="mortgage-referrals"
          initialSort={{ key: 'date', dir: 'desc' }}
          toolbar={
            <div className="max-w-full overflow-x-auto">
              <Segmented value={mStatus} onChange={setMStatus} options={[{ value: 'all' as const, label: 'All' }, ...(Object.keys(MORTGAGE_STATUS) as MortgageStatus[]).map((s) => ({ value: s, label: MORTGAGE_STATUS[s][0] }))]} />
            </div>
          }
        />
      )}

      <ValuationDrawer open={(creating && tab === 'valuations') || !!editVal} onClose={() => (editVal ? setEditVal(null) : setCreating(false))} request={editVal} />
      <MortgageDrawer open={(creating && tab === 'mortgages') || !!editMtg} onClose={() => (editMtg ? setEditMtg(null) : setCreating(false))} referral={editMtg} />
    </div>
  )
}
