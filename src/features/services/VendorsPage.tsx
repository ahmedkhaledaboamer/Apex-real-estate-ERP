import { Mail, Pencil, Phone, Plus, Star, Truck, Wallet, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, Input, Select, Switch } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { DetailRow, PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { formatDate, formatMoney, formatMoneyCompact } from '@/lib/format'
import { optionsOf, SUPPLIER_CATEGORY } from '@/lib/labels'
import { code } from '@/lib/random'
import { suppliers } from '@/mocks/core'
import { maintenanceRequests, mortgageReferrals, tenancyById } from '@/mocks/services'
import type { Supplier, SupplierCategory } from '@/types/core'
import { MAINTENANCE_STATUS, MORTGAGE_STATUS } from './labels'
import { Stars } from './shared'

type Cat = 'all' | SupplierCategory

export function VendorsPage() {
  const { data, isLoading } = suppliers.useList()
  const update = suppliers.useUpdate()
  const [creating, setCreating] = useCreateParam()
  const [cat, setCat] = useState<Cat>('all')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [viewing, setViewing] = useState<Supplier | null>(null)

  const all = data ?? []
  const rows = all.filter((s) => cat === 'all' || s.category === cat)
  const counts = useMemo(() => {
    const m: Partial<Record<SupplierCategory, number>> = {}
    for (const s of data ?? []) m[s.category] = (m[s.category] ?? 0) + 1
    return m
  }, [data])
  const categories = (Object.keys(SUPPLIER_CATEGORY) as SupplierCategory[]).filter((c) => counts[c])

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Vendor',
      sort: (s) => s.name,
      cell: (s) => (
        <span className="block max-w-[240px]">
          <span className="block truncate font-semibold">{s.name}</span>
          <span className="block text-[12px] text-muted">
            {s.code} · {s.city}
          </span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', sort: (s) => SUPPLIER_CATEGORY[s.category], csv: (s) => SUPPLIER_CATEGORY[s.category], hideBelow: 'md', cell: (s) => <Badge tone="brand">{SUPPLIER_CATEGORY[s.category]}</Badge> },
    {
      key: 'contact',
      header: 'Contact',
      sort: (s) => s.contactName,
      hideBelow: 'lg',
      cell: (s) => (
        <span>
          <span className="block font-medium">{s.contactName}</span>
          <span className="block text-[12px] text-muted tabular">{s.phone}</span>
        </span>
      ),
    },
    { key: 'terms', header: 'Terms', sort: (s) => s.paymentTerms, hideBelow: 'xl', cell: (s) => (s.paymentTerms ? `Net ${s.paymentTerms}` : 'On receipt') },
    { key: 'rating', header: 'Rating', sort: (s) => s.rating, hideBelow: 'sm', cell: (s) => <Stars value={s.rating} /> },
    { key: 'balance', header: 'Balance', align: 'end', sort: (s) => s.balance, cell: (s) => <span className={s.balance ? 'font-semibold tabular' : 'text-muted tabular'}>{formatMoney(s.balance)}</span> },
    {
      key: 'active',
      header: 'Active',
      sort: (s) => (s.active ? 1 : 0),
      cell: (s) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch checked={s.active} onChange={(v) => update.mutate({ id: s.id, patch: { active: v } })} label={<span className="sr-only">Active</span>} />
        </span>
      ),
    },
  ]

  const owed = all.reduce((a, s) => a + s.balance, 0)
  const avgRating = all.length ? all.reduce((a, s) => a + s.rating, 0) / all.length : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Portals, media, maintenance contractors, conveyancers and other partners we pay or work with."
        breadcrumbs={[{ label: 'Services' }, { label: 'Vendors' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New vendor
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Active vendors" value={all.filter((s) => s.active).length} icon={<Truck />} footnote={`${all.length} on file`} />
            <StatCard label="Outstanding payables" value={formatMoneyCompact(owed)} icon={<Wallet />} tone="warning" footnote={`${all.filter((s) => s.balance > 0).length} vendors with a balance`} />
            <StatCard label="Maintenance contractors" value={counts.maintenance ?? 0} icon={<Wrench />} tone="royal" footnote="Dispatched from Property management" />
            <StatCard label="Average rating" value={avgRating.toFixed(1)} icon={<Star />} tone="cyan" footnote="Out of 5" />
          </>
        )}
      </div>

      <Tabs value={cat} onChange={setCat} tabs={[{ value: 'all' as Cat, label: 'All', count: all.length }, ...categories.map((c) => ({ value: c as Cat, label: SUPPLIER_CATEGORY[c], count: counts[c] }))]} />

      <DataTable rows={rows} columns={columns} loading={isLoading} search={(s) => `${s.name} ${s.code} ${s.contactName} ${s.email}`} searchPlaceholder="Search vendors…" onRowClick={setViewing} exportName="vendors" initialSort={{ key: 'name', dir: 'asc' }} />

      <VendorDrawer open={creating || !!editing} onClose={() => (editing ? setEditing(null) : setCreating(false))} vendor={editing} count={all.length} />
      <VendorDetail
        vendor={viewing ? (all.find((s) => s.id === viewing.id) ?? viewing) : null}
        onClose={() => setViewing(null)}
        onEdit={(s) => {
          setViewing(null)
          setEditing(s)
        }}
      />
    </div>
  )
}

type Form = Omit<Supplier, 'id' | 'code'>
const blank = (): Form => ({ name: '', category: 'maintenance', country: 'UAE', city: 'Dubai', contactName: '', email: '', phone: '', paymentTerms: 30, rating: 4, balance: 0, active: true })

function VendorDrawer({ open, onClose, vendor, count }: { open: boolean; onClose: () => void; vendor: Supplier | null; count: number }) {
  const create = suppliers.useCreate()
  const update = suppliers.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  useEffect(() => {
    if (!open) return
    setErrors({})
    if (vendor) {
      const { id: _id, code: _c, ...rest } = vendor
      setForm(rest)
    } else setForm(blank())
  }, [open, vendor])
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }
  const save = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Vendor name is required'
    if (!form.contactName.trim()) e.contactName = 'Required'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.phone.trim()) e.phone = 'Required'
    if (form.rating < 1 || form.rating > 5) e.rating = '1–5'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { ...form, name: form.name.trim(), contactName: form.contactName.trim() }
    if (vendor) update.mutate({ id: vendor.id, patch: data }, { onSuccess: onClose })
    else create.mutate({ ...data, code: code('VEN', count + 1, 3) }, { onSuccess: onClose })
  }
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={vendor ? 'Edit vendor' : 'New vendor'}
      subtitle={vendor?.code}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {vendor ? 'Save changes' : 'Create vendor'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label="Vendor name" required error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} autoFocus />}
        </Field>
        <Field label="Category">{(id) => <Select id={id} value={form.category} onChange={(e) => set('category', e.target.value as SupplierCategory)} options={optionsOf(SUPPLIER_CATEGORY)} />}</Field>
        <Field label="City">{(id) => <Input id={id} value={form.city} onChange={(e) => set('city', e.target.value)} />}</Field>
        <Field label="Contact person" required error={errors.contactName}>
          {(id) => <Input id={id} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} aria-invalid={!!errors.contactName} />}
        </Field>
        <Field label="Phone" required error={errors.phone}>
          {(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971 4 000 0000" aria-invalid={!!errors.phone} />}
        </Field>
        <Field label="Email" error={errors.email} className="sm:col-span-2">
          {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} />}
        </Field>
        <Field label="Payment terms">{(id) => <Select id={id} value={String(form.paymentTerms)} onChange={(e) => set('paymentTerms', Number(e.target.value))} options={[0, 15, 30, 45, 60].map((n) => ({ value: String(n), label: n ? `Net ${n} days` : 'On receipt' }))} />}</Field>
        <Field label="Rating (1–5)" error={errors.rating}>
          {(id) => <Input id={id} type="number" min={1} max={5} step={0.1} value={form.rating} onChange={(e) => set('rating', Number(e.target.value))} aria-invalid={!!errors.rating} />}
        </Field>
        <Field label="Opening balance (AED)">{(id) => <Input id={id} type="number" min={0} step={50} value={form.balance} onChange={(e) => set('balance', Number(e.target.value))} />}</Field>
        <div className="flex items-end pb-2">
          <Switch checked={form.active} onChange={(v) => set('active', v)} label="Active" />
        </div>
      </form>
    </Drawer>
  )
}

function VendorDetail({ vendor: s, onClose, onEdit }: { vendor: Supplier | null; onClose: () => void; onEdit: (s: Supplier) => void }) {
  const { data: jobs = [] } = maintenanceRequests.useList()
  const { data: mtgs = [] } = mortgageReferrals.useList()
  if (!s) return null
  const myJobs = jobs.filter((j) => j.vendorId === s.id).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
  const myMtgs = mtgs.filter((m) => m.partnerId === s.id)
  const jobCost = myJobs.filter((j) => j.status === 'completed').reduce((a, j) => a + j.cost, 0)
  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={s.name}
      subtitle={`${s.code} · ${SUPPLIER_CATEGORY[s.category]}`}
      footer={
        <Button icon={<Pencil />} onClick={() => onEdit(s)}>
          Edit vendor
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={s.active ? 'success' : 'neutral'} dot>
            {s.active ? 'Active' : 'Inactive'}
          </Badge>
          <Stars value={s.rating} />
        </div>
        <div className="divide-y divide-line">
          <DetailRow label="Contact">{s.contactName}</DetailRow>
          <DetailRow label="Phone">
            <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-aura">
              <Phone className="size-3.5" /> {s.phone}
            </a>
          </DetailRow>
          <DetailRow label="Email">
            <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 break-all hover:text-aura">
              <Mail className="size-3.5 shrink-0" /> {s.email}
            </a>
          </DetailRow>
          <DetailRow label="Location">
            {s.city}, {s.country}
          </DetailRow>
          <DetailRow label="Payment terms">{s.paymentTerms ? `Net ${s.paymentTerms} days` : 'On receipt'}</DetailRow>
          <DetailRow label="Outstanding balance">{formatMoney(s.balance)}</DetailRow>
        </div>

        {s.category === 'maintenance' && (
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-[14px] font-semibold">Maintenance jobs ({myJobs.length})</h3>
              <span className="text-[12.5px] text-muted">{formatMoney(jobCost)} completed work</span>
            </div>
            {myJobs.length === 0 ? (
              <p className="text-[13px] text-muted">No jobs assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {myJobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{j.title}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {j.code} · {tenancyById(j.tenancyId)?.unit ?? '—'} · {formatDate(j.reportedAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge value={j.status} map={MAINTENANCE_STATUS} />
                      {j.cost > 0 && <span className="text-[12px] font-semibold tabular">{formatMoney(j.cost)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {s.category === 'mortgage' && (
          <div>
            <h3 className="mb-2 text-[14px] font-semibold">Mortgage referrals ({myMtgs.length})</h3>
            <ul className="space-y-2">
              {myMtgs.slice(0, 12).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {m.code} · {m.bank}
                    </span>
                    <span className="block text-[12px] text-muted tabular">
                      {formatMoneyCompact(m.loanAmount)} loan · fee {formatMoney(m.referralFee)}
                    </span>
                  </span>
                  <StatusBadge value={m.status} map={MORTGAGE_STATUS} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Drawer>
  )
}
