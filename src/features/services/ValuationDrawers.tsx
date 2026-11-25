import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { formatMoney } from '@/lib/format'
import { CUSTOMER_TYPE, optionsOf } from '@/lib/labels'
import { code, dateFromNow } from '@/lib/random'
import { brokers, COMMUNITIES, customers, suppliers } from '@/mocks/core'
import { mortgageReferrals, UAE_BANKS, valuationRequests } from '@/mocks/services'
import type { PropertyType } from '@/types/domain'
import type { MortgageReferral, MortgageStatus, ValuationPurpose, ValuationRequest, ValuationStatus } from '@/types/services'
import { MORTGAGE_STATUS, VALUATION_PURPOSE, VALUATION_STATUS } from './labels'

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio', 'Office']

/* ------------------------------------------------------------------ */
/*  Valuation request                                                  */
/* ------------------------------------------------------------------ */
type VForm = Omit<ValuationRequest, 'id' | 'code'>
const blankValuation = (): VForm => ({
  clientId: '',
  communitySlug: COMMUNITIES[0]!.slug,
  building: '',
  propertyType: 'Apartment',
  beds: 2,
  sqft: 1200,
  purpose: 'sale',
  requestedAt: dateFromNow(0),
  scheduledAt: null,
  valuerId: brokers().find((b) => b.departmentId === 'sales')?.id ?? 'emp-2',
  estimateLow: null,
  estimateHigh: null,
  status: 'new',
  reportDate: null,
  notes: '',
})

export function ValuationDrawer({ open, onClose, request }: { open: boolean; onClose: () => void; request?: ValuationRequest | null }) {
  const { data: custs = [] } = customers.useList()
  const { data: all = [] } = valuationRequests.useList()
  const create = valuationRequests.useCreate()
  const update = valuationRequests.useUpdate()
  const [form, setForm] = useState<VForm>(blankValuation)
  const [errors, setErrors] = useState<Partial<Record<keyof VForm, string>>>({})
  useEffect(() => {
    if (!open) return
    setErrors({})
    if (request) {
      const { id: _id, code: _c, ...rest } = request
      setForm(rest)
    } else setForm(blankValuation())
  }, [open, request])
  const set = <K extends keyof VForm>(k: K, v: VForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }
  const clients = custs.filter((c) => c.type !== 'developer').map((c) => ({ value: c.id, label: `${c.name} · ${CUSTOMER_TYPE[c.type]}` }))
  const community = COMMUNITIES.find((c) => c.slug === form.communitySlug)

  const save = () => {
    const e: typeof errors = {}
    if (!form.clientId) e.clientId = 'Choose the client'
    if (!(form.sqft > 0)) e.sqft = 'Enter the size'
    if (form.status !== 'new' && !form.scheduledAt) e.scheduledAt = 'Set the inspection date'
    if (form.status === 'completed') {
      if (!form.estimateLow || !form.estimateHigh) e.estimateLow = 'Enter the value range'
      else if (form.estimateHigh < form.estimateLow) e.estimateHigh = 'High is below low'
    }
    setErrors(e)
    if (Object.keys(e).length) return
    const data: VForm = { ...form, building: form.building.trim(), reportDate: form.status === 'completed' ? (form.reportDate ?? dateFromNow(0)) : null }
    if (request) update.mutate({ id: request.id, patch: data }, { onSuccess: onClose })
    else create.mutate({ ...data, code: code('VAL', 300 + all.length + 1) }, { onSuccess: onClose })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={request ? 'Edit valuation' : 'New valuation request'}
      subtitle={request ? request.code : 'Market valuation by one of our RERA-certified brokers'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {request ? 'Save changes' : 'Create request'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label="Client" required error={errors.clientId} className="sm:col-span-2">
          {(id) => <Select id={id} value={form.clientId} onChange={(e) => set('clientId', e.target.value)} options={clients} placeholder="Select client…" aria-invalid={!!errors.clientId} />}
        </Field>
        <Field label="Community">{(id) => <Select id={id} value={form.communitySlug} onChange={(e) => set('communitySlug', e.target.value)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}</Field>
        <Field label="Building / unit">{(id) => <Input id={id} value={form.building} onChange={(e) => set('building', e.target.value)} placeholder="e.g. Cayan Tower, 3204" />}</Field>
        <Field label="Property type">{(id) => <Select id={id} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value as PropertyType)} options={PROPERTY_TYPES.map((t) => ({ value: t, label: t }))} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Beds">{(id) => <Input id={id} type="number" min={0} value={form.beds} onChange={(e) => set('beds', Number(e.target.value))} />}</Field>
          <Field label="Sqft" required error={errors.sqft}>
            {(id) => <Input id={id} type="number" min={0} step={10} value={form.sqft || ''} onChange={(e) => set('sqft', Number(e.target.value))} aria-invalid={!!errors.sqft} />}
          </Field>
        </div>
        <Field label="Purpose">{(id) => <Select id={id} value={form.purpose} onChange={(e) => set('purpose', e.target.value as ValuationPurpose)} options={optionsOf(VALUATION_PURPOSE)} />}</Field>
        <Field label="Valuer">{(id) => <Select id={id} value={form.valuerId} onChange={(e) => set('valuerId', e.target.value)} options={brokers().map((b) => ({ value: b.id, label: b.name }))} />}</Field>
        <Field label="Requested">{(id) => <Input id={id} type="date" value={form.requestedAt} onChange={(e) => set('requestedAt', e.target.value)} />}</Field>
        <Field label="Status">{(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as ValuationStatus)} options={optionsOf(VALUATION_STATUS)} />}</Field>
        <Field label="Inspection date" error={errors.scheduledAt}>
          {(id) => <Input id={id} type="date" min={form.requestedAt} value={form.scheduledAt ?? ''} onChange={(e) => set('scheduledAt', e.target.value || null)} aria-invalid={!!errors.scheduledAt} />}
        </Field>
        {form.status === 'completed' && (
          <Field label="Report date">{(id) => <Input id={id} type="date" value={form.reportDate ?? dateFromNow(0)} onChange={(e) => set('reportDate', e.target.value || null)} />}</Field>
        )}
        <Field label="Estimated value — low (AED)" error={errors.estimateLow} hint={community?.ppsf ? `Community avg ≈ ${formatMoney(community.ppsf * form.sqft)}` : undefined}>
          {(id) => <Input id={id} type="number" min={0} step={10000} value={form.estimateLow ?? ''} onChange={(e) => set('estimateLow', e.target.value ? Number(e.target.value) : null)} aria-invalid={!!errors.estimateLow} />}
        </Field>
        <Field label="Estimated value — high (AED)" error={errors.estimateHigh}>
          {(id) => <Input id={id} type="number" min={0} step={10000} value={form.estimateHigh ?? ''} onChange={(e) => set('estimateHigh', e.target.value ? Number(e.target.value) : null)} aria-invalid={!!errors.estimateHigh} />}
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} />}
        </Field>
      </form>
    </Drawer>
  )
}

/* ------------------------------------------------------------------ */
/*  Mortgage referral                                                  */
/* ------------------------------------------------------------------ */
type MForm = Omit<MortgageReferral, 'id' | 'code' | 'loanAmount'>
const blankMortgage = (): MForm => ({
  clientId: '',
  bank: UAE_BANKS[0],
  propertyPrice: 0,
  ltvPct: 80,
  status: 'referred',
  referralFee: 0,
  brokerId: brokers()[0]?.id ?? 'emp-2',
  partnerId: suppliers.collection.all().find((s) => s.category === 'mortgage')?.id ?? 'sup-13',
  referredAt: dateFromNow(0),
  notes: '',
})

export function MortgageDrawer({ open, onClose, referral }: { open: boolean; onClose: () => void; referral?: MortgageReferral | null }) {
  const { data: custs = [] } = customers.useList()
  const { data: vendors = [] } = suppliers.useList()
  const { data: all = [] } = mortgageReferrals.useList()
  const create = mortgageReferrals.useCreate()
  const update = mortgageReferrals.useUpdate()
  const [form, setForm] = useState<MForm>(blankMortgage)
  const [feeTouched, setFeeTouched] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof MForm, string>>>({})
  useEffect(() => {
    if (!open) return
    setErrors({})
    setFeeTouched(!!referral)
    if (referral) {
      const { id: _id, code: _c, loanAmount: _l, ...rest } = referral
      setForm(rest)
    } else setForm(blankMortgage())
  }, [open, referral])
  const loan = Math.round((form.propertyPrice * form.ltvPct) / 100 / 1000) * 1000
  const suggestedFee = Math.round((loan * 0.4) / 100 / 50) * 50
  const set = <K extends keyof MForm>(k: K, v: MForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }
  const buyers = custs.filter((c) => c.type === 'buyer' || c.type === 'investor').map((c) => ({ value: c.id, label: `${c.name} · ${CUSTOMER_TYPE[c.type]}` }))
  const partners = vendors.filter((v) => v.category === 'mortgage').map((v) => ({ value: v.id, label: v.name }))

  const save = () => {
    const e: typeof errors = {}
    if (!form.clientId) e.clientId = 'Choose the buyer'
    if (!(form.propertyPrice > 0)) e.propertyPrice = 'Enter the property price'
    if (form.ltvPct <= 0 || form.ltvPct > 85) e.ltvPct = 'UAE Central Bank cap: up to 80–85%'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { ...form, loanAmount: loan, referralFee: feeTouched ? form.referralFee : suggestedFee }
    if (referral) update.mutate({ id: referral.id, patch: data }, { onSuccess: onClose })
    else create.mutate({ ...data, code: code('MTG', 500 + all.length + 1) }, { onSuccess: onClose })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={referral ? 'Edit mortgage referral' : 'New mortgage referral'}
      subtitle={referral ? referral.code : 'Refer a buyer to our mortgage partner'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {referral ? 'Save changes' : 'Create referral'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label="Buyer" required error={errors.clientId} className="sm:col-span-2">
          {(id) => <Select id={id} value={form.clientId} onChange={(e) => set('clientId', e.target.value)} options={buyers} placeholder="Select buyer…" aria-invalid={!!errors.clientId} />}
        </Field>
        <Field label="Property price (AED)" required error={errors.propertyPrice}>
          {(id) => <Input id={id} type="number" min={0} step={50000} value={form.propertyPrice || ''} onChange={(e) => set('propertyPrice', Number(e.target.value))} aria-invalid={!!errors.propertyPrice} />}
        </Field>
        <Field label="LTV (%)" error={errors.ltvPct} hint={loan ? `Loan ${formatMoney(loan)}` : undefined}>
          {(id) => <Input id={id} type="number" min={0} max={85} step={5} value={form.ltvPct} onChange={(e) => set('ltvPct', Number(e.target.value))} aria-invalid={!!errors.ltvPct} />}
        </Field>
        <Field label="Bank">{(id) => <Select id={id} value={form.bank} onChange={(e) => set('bank', e.target.value)} options={UAE_BANKS.map((b) => ({ value: b, label: b }))} />}</Field>
        <Field label="Status">{(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as MortgageStatus)} options={optionsOf(MORTGAGE_STATUS)} />}</Field>
        <Field label="Partner">{(id) => <Select id={id} value={form.partnerId} onChange={(e) => set('partnerId', e.target.value)} options={partners} />}</Field>
        <Field label="Referring broker">{(id) => <Select id={id} value={form.brokerId} onChange={(e) => set('brokerId', e.target.value)} options={brokers().map((b) => ({ value: b.id, label: b.name }))} />}</Field>
        <Field label="Referral fee (AED)" hint="Paid by the partner on disbursement (≈0.4% of loan)">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={0}
              step={50}
              value={feeTouched ? form.referralFee : suggestedFee}
              onChange={(e) => {
                setFeeTouched(true)
                set('referralFee', Number(e.target.value))
              }}
            />
          )}
        </Field>
        <Field label="Referred on">{(id) => <Input id={id} type="date" value={form.referredAt} onChange={(e) => set('referredAt', e.target.value)} />}</Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Salary transfer, employer, existing liabilities…" />}
        </Field>
      </form>
    </Drawer>
  )
}
