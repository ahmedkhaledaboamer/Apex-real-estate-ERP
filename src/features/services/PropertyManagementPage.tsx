import { AlertTriangle, Building, CalendarClock, CheckCircle2, Pencil, Percent, Plus, RefreshCcw, Wallet, Wrench, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Segmented } from '@/components/ui/Form'
import { Kanban } from '@/components/ui/Kanban'
import { Menu } from '@/components/ui/Menu'
import { Drawer } from '@/components/ui/Overlay'
import { DetailRow, PageHeader, Progress, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/cn'
import { formatCompact, formatDate, formatMoney, formatMoneyCompact, formatShortDate } from '@/lib/format'
import { PRIORITY } from '@/lib/labels'
import { dateFromNow } from '@/lib/random'
import { communityBySlug, customerById, supplierById } from '@/mocks/core'
import { maintenanceRequests, tenancies, tenancyById } from '@/mocks/services'
import { useCreateParam } from '@/hooks/useCreateParam'
import type { ChequeStatus, MaintenanceRequest, RentCheque, Tenancy } from '@/types/services'
import { CHEQUE_STATUS, MAINTENANCE_CATEGORY, MAINTENANCE_COLUMNS, MAINTENANCE_STATUS, TENANCY_STATUS } from './labels'
import { MaintenanceDrawer } from './MaintenanceDrawer'
import { RenewModal, TenancyDrawer } from './TenancyDrawer'

type Tab = 'tenancies' | 'rent' | 'maintenance'
type ChequeRow = RentCheque & { id: string; tenancy: Tenancy }
type ChequeFilter = 'month' | 'overdue' | 'bounced' | 'upcoming' | 'all'

const DAY = 86_400_000
const daysUntil = (ymd: string) => Math.round((new Date(ymd + 'T00:00:00').getTime() - new Date(dateFromNow(0) + 'T00:00:00').getTime()) / DAY)
const isCurrent = (t: Tenancy, today: string) => t.status !== 'ended' && t.startDate <= today && t.endDate >= today

export function PropertyManagementPage() {
  const { data: rows, isLoading } = tenancies.useList()
  const { data: jobs = [], isLoading: jobsLoading } = maintenanceRequests.useList()
  const updateTenancy = tenancies.useUpdate({ silent: true })
  const updateJob = maintenanceRequests.useUpdate({ silent: true })
  const [creating, setCreating] = useCreateParam()
  const [tab, setTab] = useState<Tab>('tenancies')
  const [editing, setEditing] = useState<Tenancy | null>(null)
  const [viewing, setViewing] = useState<Tenancy | null>(null)
  const [renewing, setRenewing] = useState<Tenancy | null>(null)
  const [job, setJob] = useState<MaintenanceRequest | null>(null)
  const [jobFor, setJobFor] = useState<string | undefined>()
  const [jobOpen, setJobOpen] = useState(false)
  const [chequeFilter, setChequeFilter] = useState<ChequeFilter>('month')
  const [statusFilter, setStatusFilter] = useState<'all' | Tenancy['status']>('all')

  const today = dateFromNow(0)
  const monthPrefix = today.slice(0, 7)

  const cheques: ChequeRow[] = useMemo(() => (rows ?? []).filter((t) => t.status !== 'ended').flatMap((t) => t.cheques.map((c) => ({ ...c, id: `${t.id}-${c.no}`, tenancy: t }))), [rows])

  const kpi = useMemo(() => {
    const all = rows ?? []
    const units = new Set(all.map((t) => t.listingId ?? t.unit))
    const occupied = new Set(all.filter((t) => isCurrent(t, today)).map((t) => t.listingId ?? t.unit))
    const dueMonth = cheques.filter((c) => c.dueDate.startsWith(monthPrefix))
    const in60 = dateFromNow(60)
    return {
      units: units.size,
      occupancy: units.size ? (occupied.size / units.size) * 100 : 0,
      dueMonth: dueMonth.reduce((a, c) => a + c.amount, 0),
      dueMonthCleared: dueMonth.filter((c) => c.status === 'cleared').reduce((a, c) => a + c.amount, 0),
      bounced: cheques.filter((c) => c.status === 'bounced'),
      expiring: all.filter((t) => t.status !== 'ended' && t.endDate >= today && t.endDate <= in60).length,
      lapsed: all.filter((t) => t.status === 'renewal-pending').length,
      openJobs: jobs.filter((j) => j.status === 'open' || j.status === 'scheduled' || j.status === 'in-progress'),
      fees: all.filter((t) => isCurrent(t, today)).reduce((a, t) => a + (t.annualRent * t.managementFeePct) / 100, 0),
    }
  }, [rows, cheques, jobs, today, monthPrefix])

  const setCheque = (row: ChequeRow, status: ChequeStatus) => {
    const t = row.tenancy
    updateTenancy.mutate({ id: t.id, patch: { cheques: t.cheques.map((c) => (c.no === row.no ? { ...c, status } : c)) } })
  }

  const newJobFor = (t: Tenancy) => {
    setJob(null)
    setJobFor(t.id)
    setJobOpen(true)
  }

  const tenancyRows = (rows ?? []).filter((t) => statusFilter === 'all' || t.status === statusFilter)
  const tenancyColumns: Column<Tenancy>[] = [
    {
      key: 'unit',
      header: 'Unit',
      sort: (t) => t.unit,
      cell: (t) => (
        <span className="block max-w-[260px]">
          <span className="block truncate font-semibold">{t.unit}</span>
          <span className="block truncate text-[12px] text-muted">
            {t.code} · {communityBySlug(t.communitySlug)?.name}
          </span>
        </span>
      ),
    },
    {
      key: 'tenant',
      header: 'Tenant',
      sort: (t) => customerById(t.tenantId)?.name ?? '',
      hideBelow: 'md',
      cell: (t) => {
        const c = customerById(t.tenantId)
        return c ? <PersonCell name={c.name} hue={c.avatarHue} size={26} sub={`Landlord: ${customerById(t.landlordId)?.name ?? '—'}`} /> : '—'
      },
    },
    { key: 'rent', header: 'Annual rent', align: 'end', sort: (t) => t.annualRent, cell: (t) => <span className="font-semibold tabular">{formatMoneyCompact(t.annualRent)}</span> },
    {
      key: 'end',
      header: 'Term ends',
      sort: (t) => t.endDate,
      hideBelow: 'sm',
      cell: (t) => {
        const d = daysUntil(t.endDate)
        return (
          <span className="tabular">
            {formatDate(t.endDate)}
            <span className={cn('block text-[12px]', t.status === 'ended' ? 'text-muted' : d < 0 ? 'text-danger' : d <= 60 ? 'text-warning' : 'text-muted')}>{t.status === 'ended' ? 'Ended' : d < 0 ? `${-d} days ago` : `in ${d} days`}</span>
          </span>
        )
      },
    },
    {
      key: 'cheques',
      header: 'Cheques',
      hideBelow: 'xl',
      sort: (t) => t.cheques.filter((c) => c.status === 'cleared').length / t.cheques.length,
      cell: (t) => {
        const cleared = t.cheques.filter((c) => c.status === 'cleared').length
        const bounced = t.cheques.some((c) => c.status === 'bounced')
        return (
          <span className="block w-28">
            <span className="mb-1 flex justify-between text-[12px] tabular">
              <span>
                {cleared}/{t.cheques.length} cleared
              </span>
              {bounced && <AlertTriangle className="size-3.5 text-danger" />}
            </span>
            <Progress value={(cleared / t.cheques.length) * 100} tone={bounced ? 'danger' : 'success'} />
          </span>
        )
      },
    },
    { key: 'ejari', header: 'Ejari', hideBelow: '2xl', cell: (t) => <span className="text-muted tabular">{t.ejariNo || '—'}</span> },
    { key: 'fee', header: 'Fee', align: 'end', hideBelow: '2xl', sort: (t) => t.managementFeePct, cell: (t) => <span className="tabular">{t.managementFeePct}%</span> },
    { key: 'status', header: 'Status', sort: (t) => t.status, cell: (t) => <StatusBadge value={t.status} map={TENANCY_STATUS} /> },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (t) => (
        <span className="inline-flex items-center gap-1">
          {(t.status === 'expiring' || t.status === 'renewal-pending') && (
            <Button
              size="sm"
              variant="soft"
              icon={<RefreshCcw />}
              onClick={(e) => {
                e.stopPropagation()
                setRenewing(t)
              }}
            >
              Renew
            </Button>
          )}
          <Menu
            items={[
              { label: 'Edit tenancy', icon: <Pencil />, onSelect: () => setEditing(t) },
              { label: 'Log maintenance', icon: <Wrench />, onSelect: () => newJobFor(t) },
              ...(t.status !== 'ended' ? [{ label: 'Renew', icon: <RefreshCcw />, onSelect: () => setRenewing(t) }] : []),
              ...(t.status !== 'ended' ? [{ label: 'End tenancy', icon: <XCircle />, danger: true, onSelect: () => updateTenancy.mutate({ id: t.id, patch: { status: 'ended' } }) }] : []),
            ]}
          />
        </span>
      ),
    },
  ]

  const chequeRows = cheques.filter((c) => {
    if (chequeFilter === 'month') return c.dueDate.startsWith(monthPrefix)
    if (chequeFilter === 'overdue') return c.status === 'pending' && c.dueDate < today
    if (chequeFilter === 'bounced') return c.status === 'bounced'
    if (chequeFilter === 'upcoming') return c.status === 'pending' && c.dueDate >= today && c.dueDate <= dateFromNow(30)
    return true
  })
  const chequeColumns: Column<ChequeRow>[] = [
    {
      key: 'due',
      header: 'Due',
      sort: (c) => c.dueDate,
      cell: (c) => (
        <span className="tabular">
          <span className={cn('font-semibold', c.status === 'pending' && c.dueDate < today && 'text-danger')}>{formatDate(c.dueDate)}</span>
          <span className="block text-[12px] text-muted">
            Cheque {c.no} of {c.tenancy.cheques.length}
          </span>
        </span>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      sort: (c) => c.tenancy.unit,
      cell: (c) => (
        <span className="block max-w-[240px]">
          <span className="block truncate font-medium">{c.tenancy.unit}</span>
          <span className="block truncate text-[12px] text-muted">{customerById(c.tenancy.tenantId)?.name}</span>
        </span>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'end', sort: (c) => c.amount, cell: (c) => <span className="font-semibold tabular">{formatMoney(c.amount)}</span> },
    { key: 'cheque', header: 'Cheque no.', hideBelow: 'md', cell: (c) => <span className="tabular">{c.chequeNo}</span> },
    { key: 'bank', header: 'Bank', hideBelow: 'lg', sort: (c) => c.bank, cell: (c) => c.bank },
    { key: 'status', header: 'Status', sort: (c) => c.status, cell: (c) => <StatusBadge value={c.status} map={CHEQUE_STATUS} /> },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (c) =>
        c.status === 'cleared' ? null : (
          <span className="inline-flex gap-1">
            <Button size="sm" variant="soft" icon={<CheckCircle2 />} onClick={() => setCheque(c, 'cleared')}>
              Cleared
            </Button>
            {c.status === 'pending' && (
              <Button size="icon-sm" variant="ghost" aria-label="Mark bounced" title="Mark bounced" onClick={() => setCheque(c, 'bounced')}>
                <XCircle className="text-danger" />
              </Button>
            )}
          </span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property management"
        description="Managed units, tenancy contracts, post-dated rent cheques and maintenance for our landlords."
        breadcrumbs={[{ label: 'Services' }, { label: 'Property management' }]}
        actions={
          <>
            <Button
              variant="outline"
              icon={<Wrench />}
              onClick={() => {
                setJob(null)
                setJobFor(undefined)
                setJobOpen(true)
              }}
            >
              New request
            </Button>
            <Button icon={<Plus />} onClick={() => setCreating(true)}>
              New tenancy
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Managed units" value={kpi.units} icon={<Building />} footnote={`${formatMoneyCompact(kpi.fees)} fees / yr`} />
            <StatCard label="Occupancy" value={`${kpi.occupancy.toFixed(0)}%`} icon={<Percent />} tone="success" footnote="Units with a current tenancy" />
            <StatCard label="Rent due this month · AED" value={formatCompact(kpi.dueMonth)} icon={<Wallet />} tone="royal" footnote={`${formatMoneyCompact(kpi.dueMonthCleared)} cleared${kpi.bounced.length ? ` · ${kpi.bounced.length} bounced` : ''}`} />
            <StatCard label="Expiring in 60 days" value={kpi.expiring} icon={<CalendarClock />} tone="warning" footnote={kpi.lapsed ? `${kpi.lapsed} lapsed, awaiting renewal` : 'Renewals on track'} />
            <StatCard label="Open maintenance" value={kpi.openJobs.length} icon={<Wrench />} tone={kpi.openJobs.some((j) => j.priority === 'high') ? 'danger' : 'cyan'} footnote={`${kpi.openJobs.filter((j) => j.priority === 'high').length} high priority`} className="sm:col-span-2 xl:col-span-1" />
          </>
        )}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'tenancies', label: 'Tenancies', count: rows?.length },
          { value: 'rent', label: 'Rent collection', count: kpi.bounced.length || undefined },
          { value: 'maintenance', label: 'Maintenance', count: kpi.openJobs.length },
        ]}
      />

      {tab === 'tenancies' && (
        <DataTable
          rows={tenancyRows}
          columns={tenancyColumns}
          loading={isLoading}
          search={(t) => `${t.code} ${t.unit} ${customerById(t.tenantId)?.name} ${customerById(t.landlordId)?.name} ${t.ejariNo}`}
          searchPlaceholder="Search unit, tenant, landlord…"
          onRowClick={setViewing}
          exportName="tenancies"
          initialSort={{ key: 'end', dir: 'asc' }}
          toolbar={
            <div className="max-w-full overflow-x-auto">
              <Segmented
                value={statusFilter}
                onChange={setStatusFilter}
                options={[{ value: 'all' as const, label: 'All' }, ...(Object.keys(TENANCY_STATUS) as Tenancy['status'][]).map((s) => ({ value: s, label: TENANCY_STATUS[s][0] }))]}
              />
            </div>
          }
        />
      )}

      {tab === 'rent' && (
        <DataTable
          rows={chequeRows}
          columns={chequeColumns}
          loading={isLoading}
          search={(c) => `${c.tenancy.unit} ${c.chequeNo} ${customerById(c.tenancy.tenantId)?.name} ${c.bank}`}
          searchPlaceholder="Search unit, tenant, cheque…"
          exportName="rent-cheques"
          initialSort={{ key: 'due', dir: 'asc' }}
          toolbar={
            <div className="max-w-full overflow-x-auto">
              <Segmented<ChequeFilter>
                value={chequeFilter}
                onChange={setChequeFilter}
                options={[
                  { value: 'month', label: 'Due this month' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'bounced', label: `Bounced${kpi.bounced.length ? ` (${kpi.bounced.length})` : ''}` },
                  { value: 'upcoming', label: 'Next 30 days' },
                  { value: 'all', label: 'All' },
                ]}
              />
            </div>
          }
        />
      )}

      {tab === 'maintenance' &&
        (jobsLoading ? (
          <Skeleton className="h-[420px] rounded-card" />
        ) : (
          <Kanban
            columns={MAINTENANCE_COLUMNS}
            items={jobs}
            getColumn={(j) => j.status}
            onMove={(id, to) => {
              const j = jobs.find((x) => x.id === id)
              updateJob.mutate({ id, patch: { status: to, scheduledAt: to !== 'open' && to !== 'cancelled' && !j?.scheduledAt ? dateFromNow(1) : j?.scheduledAt ?? null, completedAt: to === 'completed' ? dateFromNow(0) : null } })
            }}
            onCardClick={(j) => {
              setJob(j)
              setJobOpen(true)
            }}
            columnSummary={(list) => (list.length ? `${formatMoney(list.reduce((a, j) => a + j.cost, 0))} cost` : 'No jobs')}
            renderCard={(j) => <JobCard job={j} />}
          />
        ))}

      <TenancyDrawer open={creating || !!editing} onClose={() => (editing ? setEditing(null) : setCreating(false))} tenancy={editing} />
      <MaintenanceDrawer open={jobOpen} onClose={() => setJobOpen(false)} request={job} defaultTenancyId={jobFor} />
      <RenewModal tenancy={renewing} onClose={() => setRenewing(null)} />
      <TenancyDetail
        tenancy={viewing ? (rows?.find((t) => t.id === viewing.id) ?? viewing) : null}
        jobs={jobs}
        onClose={() => setViewing(null)}
        onEdit={(t) => {
          setViewing(null)
          setEditing(t)
        }}
        onRenew={(t) => {
          setViewing(null)
          setRenewing(t)
        }}
        onJob={(t) => {
          setViewing(null)
          newJobFor(t)
        }}
      />
    </div>
  )
}

function JobCard({ job: j }: { job: MaintenanceRequest }) {
  const t = tenancyById(j.tenancyId)
  const v = supplierById(j.vendorId)
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-aura">{j.code}</span>
        <StatusBadge value={j.priority} map={PRIORITY} />
      </div>
      <p className="text-[13.5px] leading-snug font-semibold">{j.title}</p>
      <p className="truncate text-[12px] text-muted">{t?.unit ?? '—'}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{MAINTENANCE_CATEGORY[j.category]}</Badge>
        {j.scheduledAt && j.status !== 'completed' && <Badge tone="info">Visit {formatShortDate(j.scheduledAt)}</Badge>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-[12px]">
        <span className={cn('truncate', v ? 'text-muted' : 'font-semibold text-warning')}>{v?.name ?? 'No vendor'}</span>
        {j.cost > 0 && <span className="shrink-0 font-semibold tabular">{formatMoney(j.cost)}</span>}
      </div>
    </div>
  )
}

function TenancyDetail({ tenancy: t, jobs, onClose, onEdit, onRenew, onJob }: { tenancy: Tenancy | null; jobs: MaintenanceRequest[]; onClose: () => void; onEdit: (t: Tenancy) => void; onRenew: (t: Tenancy) => void; onJob: (t: Tenancy) => void }) {
  if (!t) return null
  const tenant = customerById(t.tenantId)
  const landlord = customerById(t.landlordId)
  const mine = jobs.filter((j) => j.tenancyId === t.id)
  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={t.unit}
      subtitle={`${t.code} · ${communityBySlug(t.communitySlug)?.name}`}
      footer={
        <>
          <Button variant="outline" icon={<Wrench />} onClick={() => onJob(t)}>
            Log maintenance
          </Button>
          {t.status !== 'ended' && (
            <Button variant="outline" icon={<RefreshCcw />} onClick={() => onRenew(t)}>
              Renew
            </Button>
          )}
          <Button icon={<Pencil />} onClick={() => onEdit(t)}>
            Edit
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={t.status} map={TENANCY_STATUS} />
          <Badge tone="brand">{t.managementFeePct}% management fee</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {tenant && <PersonCell name={tenant.name} hue={tenant.avatarHue} sub={`Tenant · ${tenant.phone}`} size={38} />}
          {landlord && <PersonCell name={landlord.name} hue={landlord.avatarHue} sub={`Landlord · ${landlord.phone}`} size={38} />}
        </div>
        <div className="divide-y divide-line">
          <DetailRow label="Annual rent">{formatMoney(t.annualRent)}</DetailRow>
          <DetailRow label="Term">
            {formatDate(t.startDate)} – {formatDate(t.endDate)}
          </DetailRow>
          <DetailRow label="Ejari">{t.ejariNo || '—'}</DetailRow>
          <DetailRow label="Security deposit">{formatMoney(t.securityDeposit)}</DetailRow>
          <DetailRow label="Management fee">{formatMoney(Math.round((t.annualRent * t.managementFeePct) / 100))} / yr</DetailRow>
        </div>
        <Card>
          <CardHeader title="Cheque schedule" subtitle={`${t.cheques.length} post-dated cheques · ${t.cheques[0]?.bank ?? ''}`} />
          <CardBody className="pt-3">
            <ul className="divide-y divide-line">
              {t.cheques.map((c) => (
                <li key={c.no} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <span className="min-w-0">
                    <span className="block font-semibold tabular">{formatDate(c.dueDate)}</span>
                    <span className="block text-[12px] text-muted tabular">
                      #{c.no} · cheque {c.chequeNo}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular">{formatMoney(c.amount)}</span>
                    <StatusBadge value={c.status} map={CHEQUE_STATUS} />
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <div>
          <h3 className="mb-2 text-[14px] font-semibold">Maintenance ({mine.length})</h3>
          {mine.length === 0 ? (
            <p className="text-[13px] text-muted">No requests logged for this unit.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{j.title}</span>
                    <span className="block text-[12px] text-muted">
                      {j.code} · {formatDate(j.reportedAt)} · {supplierById(j.vendorId)?.name ?? 'No vendor'}
                    </span>
                  </span>
                  <StatusBadge value={j.status} map={MAINTENANCE_STATUS} />
                </li>
              ))}
            </ul>
          )}
        </div>
        {t.notes && <p className="text-[13px] whitespace-pre-line text-muted">{t.notes}</p>}
      </div>
    </Drawer>
  )
}
