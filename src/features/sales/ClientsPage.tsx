import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Form'
import { PageHeader, Tabs } from '@/components/ui/misc'
import { useCreateParam } from '@/hooks/useCreateParam'
import { formatMoney } from '@/lib/format'
import { CUSTOMER_TYPE } from '@/lib/labels'
import { customers, employeeById } from '@/mocks/core'
import { deals } from '@/mocks/domain'
import type { Customer, CustomerType } from '@/types/core'
import type { Deal } from '@/types/domain'
import { ClientDrawer } from './ClientDrawer'
import { CUSTOMER_TYPE_TONE } from './labels'
import { brokerOptions } from './shared'

/** Deals a client is part of (as buyer/tenant or as seller/landlord/developer) and the GCI they generated. */
export function clientStats(rows: Deal[]) {
  const m = new Map<string, { deals: number; gci: number }>()
  const add = (id: string, d: Deal) => {
    const s = m.get(id) ?? { deals: 0, gci: 0 }
    s.deals += d.stage === 'cancelled' ? 0 : 1
    if (d.stage === 'closed') s.gci += d.commission
    m.set(id, s)
  }
  for (const d of rows) {
    add(d.clientId, d)
    if (d.counterpartyId !== d.clientId) add(d.counterpartyId, d)
  }
  return m
}

const TYPES: CustomerType[] = ['buyer', 'seller', 'landlord', 'tenant', 'investor', 'developer']

export function ClientsPage() {
  const { data: all, isLoading } = customers.useList()
  const { data: dls = [] } = deals.useList()
  const [creating, setCreating] = useCreateParam()
  const navigate = useNavigate()
  const [type, setType] = useState<'all' | CustomerType>('all')
  const [owner, setOwner] = useState('')
  const [tag, setTag] = useState('')

  const rows = all ?? []
  const stats = useMemo(() => clientStats(dls), [dls])
  const tags = useMemo(() => [...new Set(rows.flatMap((c) => c.tags))].sort(), [rows])
  const base = rows.filter((c) => (!owner || c.ownerId === owner) && (!tag || c.tags.includes(tag)))
  const filtered = base.filter((c) => type === 'all' || c.type === type)

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Client', sort: (c) => c.name, cell: (c) => <PersonCell name={c.name} hue={c.avatarHue} sub={`${c.code} · ${c.phone}`} size={34} /> },
    { key: 'type', header: 'Type', sort: (c) => c.type, cell: (c) => <StatusBadge value={c.type} map={CUSTOMER_TYPE_TONE} /> },
    { key: 'nationality', header: 'Nationality', hideBelow: 'xl', sort: (c) => c.nationality, cell: (c) => <span className="text-muted">{c.nationality}</span> },
    { key: 'city', header: 'City', hideBelow: 'xl', sort: (c) => c.city, cell: (c) => <span className="text-muted">{c.city}</span> },
    {
      key: 'owner',
      header: 'Owner',
      hideBelow: 'lg',
      sort: (c) => employeeById(c.ownerId)?.name ?? '',
      cell: (c) => {
        const e = employeeById(c.ownerId)
        return e ? <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} size={26} /> : '—'
      },
    },
    { key: 'deals', header: 'Deals', align: 'end', hideBelow: 'sm', sort: (c) => stats.get(c.id)?.deals ?? 0, cell: (c) => <span className="tabular">{stats.get(c.id)?.deals ?? 0}</span> },
    { key: 'gci', header: 'GCI generated', align: 'end', hideBelow: 'md', sort: (c) => stats.get(c.id)?.gci ?? 0, cell: (c) => <span className="font-semibold tabular">{formatMoney(stats.get(c.id)?.gci ?? 0)}</span> },
    {
      key: 'tags',
      header: 'Tags',
      hideBelow: '2xl',
      csv: (c) => c.tags.join('; '),
      cell: (c) => (
        <div className="flex max-w-[240px] flex-wrap gap-1">
          {c.tags.slice(0, 3).map((t) => (
            <Badge key={t} className="px-2 text-[11px]">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Buyers, sellers, landlords, tenants, investors and the developers who pay off-plan commission."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Clients' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New client
          </Button>
        }
      />

      <Tabs
        value={type}
        onChange={setType}
        tabs={[{ value: 'all' as const, label: 'All', count: base.length }, ...TYPES.map((t) => ({ value: t, label: `${CUSTOMER_TYPE[t]}s`, count: base.filter((c) => c.type === t).length }))]}
      />

      <DataTable
        rows={filtered}
        columns={columns}
        loading={isLoading}
        search={(c) => `${c.name} ${c.code} ${c.email} ${c.phone} ${c.nationality} ${c.tags.join(' ')}`}
        searchPlaceholder="Search name, email, phone…"
        toolbar={
          <>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} options={brokerOptions()} placeholder="All brokers" className="w-[calc(50%-4px)] sm:w-[180px]" aria-label="Owner broker" />
            <Select value={tag} onChange={(e) => setTag(e.target.value)} options={tags.map((t) => ({ value: t, label: t }))} placeholder="All tags" className="w-[calc(50%-4px)] sm:w-[170px]" aria-label="Tag" />
          </>
        }
        onRowClick={(c) => navigate({ to: '/sales/clients/$clientId', params: { clientId: c.id } })}
        exportName="clients"
        initialSort={{ key: 'gci', dir: 'desc' }}
      />

      <ClientDrawer open={creating} onClose={() => setCreating(false)} onCreated={(c) => navigate({ to: '/sales/clients/$clientId', params: { clientId: c.id } })} />
    </div>
  )
}
