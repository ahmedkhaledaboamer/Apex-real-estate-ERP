import { addDays, addMonths, format, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Form'
import { Drawer, Modal } from '@/components/ui/Overlay'
import { formatDate, formatMoney } from '@/lib/format'
import { code, dateFromNow } from '@/lib/random'
import { COMMUNITIES, customers, employees } from '@/mocks/core'
import { listings } from '@/mocks/domain'
import { chequeSchedule, tenancies, tenancyStatusFor, UAE_BANKS } from '@/mocks/services'
import type { Tenancy } from '@/types/services'

type Form = Omit<Tenancy, 'id' | 'code' | 'cheques' | 'status'> & { chequeCount: number; bank: string }

const oneYear = (start: string) => format(addDays(addMonths(parseISO(start), 12), -1), 'yyyy-MM-dd')

const blank = (): Form => {
  const start = dateFromNow(0)
  return {
    listingId: null,
    unit: '',
    communitySlug: COMMUNITIES[0]!.slug,
    landlordId: '',
    tenantId: '',
    annualRent: 0,
    startDate: start,
    endDate: oneYear(start),
    ejariNo: '',
    securityDeposit: 0,
    managementFeePct: 5,
    managerId: employees.collection.all().find((e) => e.departmentId === 'property-management')?.id ?? 'emp-6',
    notes: '',
    chequeCount: 4,
    bank: UAE_BANKS[0],
  }
}

export function TenancyDrawer({ open, onClose, tenancy }: { open: boolean; onClose: () => void; tenancy?: Tenancy | null }) {
  const { data: custs = [] } = customers.useList()
  const { data: allListings = [] } = listings.useList()
  const { data: emps = [] } = employees.useList()
  const { data: all = [] } = tenancies.useList()
  const create = tenancies.useCreate()
  const update = tenancies.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [source, setSource] = useState<'listing' | 'manual'>('listing')
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (tenancy) {
      const { id: _id, code: _c, cheques, status: _s, ...rest } = tenancy
      setForm({ ...rest, chequeCount: cheques.length, bank: cheques[0]?.bank ?? UAE_BANKS[0] })
      setSource(tenancy.listingId ? 'listing' : 'manual')
    } else {
      setForm(blank())
      setSource('listing')
    }
  }, [open, tenancy])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }
  const rentals = useMemo(() => allListings.filter((l) => l.purpose === 'rent').sort((a, b) => a.title.localeCompare(b.title)), [allListings])
  const landlords = custs.filter((c) => c.type === 'landlord' || c.type === 'investor').map((c) => ({ value: c.id, label: c.name }))
  const tenants = custs.filter((c) => c.type === 'tenant').map((c) => ({ value: c.id, label: c.name }))
  const managers = emps.filter((e) => e.departmentId === 'property-management' || e.departmentId === 'leasing').map((e) => ({ value: e.id, label: e.name }))

  const pickListing = (id: string) => {
    const l = rentals.find((x) => x.id === id)
    if (!l) return set('listingId', null)
    setForm((f) => ({
      ...f,
      listingId: l.id,
      unit: l.title.includes(' in ') ? l.title : `${l.title}, ${l.building}`,
      communitySlug: l.communitySlug,
      landlordId: l.ownerId,
      annualRent: l.price,
      chequeCount: l.cheques ?? f.chequeCount,
      securityDeposit: Math.round((l.price * (l.furnishing === 'furnished' ? 0.1 : 0.05)) / 100) * 100,
    }))
  }

  const save = () => {
    const e: typeof errors = {}
    if (source === 'listing' && !form.listingId) e.listingId = 'Choose the rental listing'
    if (source === 'manual' && !form.unit.trim()) e.unit = 'Describe the unit'
    if (!form.landlordId) e.landlordId = 'Choose the landlord'
    if (!form.tenantId) e.tenantId = 'Choose the tenant'
    if (!(form.annualRent > 0)) e.annualRent = 'Enter the annual rent'
    if (!form.startDate) e.startDate = 'Required'
    if (!form.endDate || form.endDate <= form.startDate) e.endDate = 'Must be after the start date'
    if (form.ejariNo && !/^\d{8,16}$/.test(form.ejariNo)) e.ejariNo = '8–16 digits'
    if (form.managementFeePct < 0 || form.managementFeePct > 20) e.managementFeePct = '0–20%'
    setErrors(e)
    if (Object.keys(e).length) return
    const { chequeCount, bank, ...rest } = form
    const scheduleChanged = !tenancy || tenancy.annualRent !== form.annualRent || tenancy.startDate !== form.startDate || tenancy.cheques.length !== chequeCount || tenancy.cheques[0]?.bank !== bank
    const data = {
      ...rest,
      listingId: source === 'listing' ? form.listingId : null,
      unit: form.unit.trim(),
      cheques: scheduleChanged ? chequeSchedule(form.startDate, form.annualRent, chequeCount, bank, all.length + 7, () => 'pending') : tenancy!.cheques,
      status: tenancyStatusFor(form.endDate, tenancy?.status === 'ended' ? 'ended' : undefined),
    }
    if (tenancy) update.mutate({ id: tenancy.id, patch: data }, { onSuccess: onClose })
    else create.mutate({ ...data, code: code('TN', 400 + all.length + 1) }, { onSuccess: onClose })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={tenancy ? 'Edit tenancy' : 'New managed tenancy'}
      subtitle={tenancy ? `${tenancy.code} · ${tenancy.unit}` : 'Unit under management + tenancy contract'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {tenancy ? 'Save changes' : 'Create tenancy'}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="sm:col-span-2">
          <Segmented
            value={source}
            onChange={setSource}
            options={[
              { value: 'listing', label: 'From a rental listing' },
              { value: 'manual', label: 'Other unit' },
            ]}
          />
        </div>
        {source === 'listing' ? (
          <Field label="Rental listing" required error={errors.listingId} className="sm:col-span-2">
            {(id) => <Select id={id} value={form.listingId ?? ''} onChange={(e) => pickListing(e.target.value)} options={rentals.map((l) => ({ value: l.id, label: `${l.ref} · ${l.title} · ${l.building}` }))} placeholder="Select listing…" aria-invalid={!!errors.listingId} />}
          </Field>
        ) : (
          <>
            <Field label="Unit" required error={errors.unit}>
              {(id) => <Input id={id} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="e.g. Marina Gate 1, apt 2304" aria-invalid={!!errors.unit} />}
            </Field>
            <Field label="Community">{(id) => <Select id={id} value={form.communitySlug} onChange={(e) => set('communitySlug', e.target.value)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}</Field>
          </>
        )}
        <Field label="Landlord" required error={errors.landlordId}>
          {(id) => <Select id={id} value={form.landlordId} onChange={(e) => set('landlordId', e.target.value)} options={landlords} placeholder="Select landlord…" aria-invalid={!!errors.landlordId} />}
        </Field>
        <Field label="Tenant" required error={errors.tenantId}>
          {(id) => <Select id={id} value={form.tenantId} onChange={(e) => set('tenantId', e.target.value)} options={tenants} placeholder="Select tenant…" aria-invalid={!!errors.tenantId} />}
        </Field>
        <Field label="Annual rent (AED)" required error={errors.annualRent}>
          {(id) => <Input id={id} type="number" min={0} step={1000} value={form.annualRent || ''} onChange={(e) => set('annualRent', Number(e.target.value))} aria-invalid={!!errors.annualRent} />}
        </Field>
        <Field label="Cheques" hint={form.annualRent ? `${formatMoney(Math.floor(form.annualRent / form.chequeCount))} each` : undefined}>
          {(id) => <Select id={id} value={String(form.chequeCount)} onChange={(e) => set('chequeCount', Number(e.target.value))} options={[1, 2, 3, 4, 6, 12].map((n) => ({ value: String(n), label: `${n} cheque${n > 1 ? 's' : ''}` }))} />}
        </Field>
        <Field label="Start date" required error={errors.startDate}>
          {(id) => <Input id={id} type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: e.target.value ? oneYear(e.target.value) : f.endDate }))} aria-invalid={!!errors.startDate} />}
        </Field>
        <Field label="End date" required error={errors.endDate}>
          {(id) => <Input id={id} type="date" min={form.startDate} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} aria-invalid={!!errors.endDate} />}
        </Field>
        <Field label="Cheque bank">{(id) => <Select id={id} value={form.bank} onChange={(e) => set('bank', e.target.value)} options={UAE_BANKS.map((b) => ({ value: b, label: b }))} />}</Field>
        <Field label="Ejari number" error={errors.ejariNo} hint="Registered tenancy contract">
          {(id) => <Input id={id} inputMode="numeric" value={form.ejariNo} onChange={(e) => set('ejariNo', e.target.value.trim())} aria-invalid={!!errors.ejariNo} />}
        </Field>
        <Field label="Security deposit (AED)">{(id) => <Input id={id} type="number" min={0} step={500} value={form.securityDeposit} onChange={(e) => set('securityDeposit', Number(e.target.value))} />}</Field>
        <Field label="Management fee (%)" error={errors.managementFeePct} hint={form.annualRent ? `${formatMoney(Math.round((form.annualRent * form.managementFeePct) / 100))} / year` : undefined}>
          {(id) => <Input id={id} type="number" min={0} max={20} step={0.5} value={form.managementFeePct} onChange={(e) => set('managementFeePct', Number(e.target.value))} aria-invalid={!!errors.managementFeePct} />}
        </Field>
        <Field label="Property manager">{(id) => <Select id={id} value={form.managerId} onChange={(e) => set('managerId', e.target.value)} options={managers} />}</Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Access, parking bay, keys held…" />}
        </Field>
      </form>
    </Drawer>
  )
}

/** Renew an expiring / lapsed tenancy for another year: new rent, new cheque schedule. */
export function RenewModal({ tenancy, onClose }: { tenancy: Tenancy | null; onClose: () => void }) {
  const update = tenancies.useUpdate()
  const [increase, setIncrease] = useState(0)
  const [count, setCount] = useState(4)
  useEffect(() => {
    if (tenancy) {
      setIncrease(5)
      setCount(tenancy.cheques.length)
    }
  }, [tenancy])
  if (!tenancy) return null
  const start = format(addDays(parseISO(tenancy.endDate), 1), 'yyyy-MM-dd')
  const end = oneYear(start)
  const rent = Math.round((tenancy.annualRent * (1 + increase / 100)) / 500) * 500
  const confirm = () =>
    update.mutate(
      {
        id: tenancy.id,
        patch: {
          startDate: start,
          endDate: end,
          annualRent: rent,
          cheques: chequeSchedule(start, rent, count, tenancy.cheques[0]?.bank ?? UAE_BANKS[0], Number(tenancy.id.replace(/\D/g, '')) + 50, () => 'pending'),
          status: tenancyStatusFor(end),
          notes: `${tenancy.notes ? tenancy.notes + '\n' : ''}Renewed ${formatDate(new Date())}: ${formatMoney(tenancy.annualRent)} → ${formatMoney(rent)}`.trim(),
        },
      },
      { onSuccess: onClose },
    )
  return (
    <Modal
      open
      onClose={onClose}
      title={`Renew ${tenancy.code}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} loading={update.isPending}>
            Renew tenancy
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13.5px] text-muted">
          New term <span className="font-semibold text-fg">{formatDate(start)}</span> – <span className="font-semibold text-fg">{formatDate(end)}</span>. Check the RERA rental index before increasing the rent.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rent increase (%)" hint="RERA calculator: 0–20%">
            {(id) => <Input id={id} type="number" min={0} max={20} step={1} value={increase} onChange={(e) => setIncrease(Math.max(0, Math.min(20, Number(e.target.value))))} />}
          </Field>
          <Field label="Cheques">{(id) => <Select id={id} value={String(count)} onChange={(e) => setCount(Number(e.target.value))} options={[1, 2, 3, 4, 6, 12].map((n) => ({ value: String(n), label: `${n} cheque${n > 1 ? 's' : ''}` }))} />}</Field>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-[13.5px]">
          <span className="text-muted">New annual rent</span>
          <span className="font-bold tabular">
            {formatMoney(rent)} <span className="text-[12px] font-medium text-muted">was {formatMoney(tenancy.annualRent)}</span>
          </span>
        </div>
      </div>
    </Modal>
  )
}
