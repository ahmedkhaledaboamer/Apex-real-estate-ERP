import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { formatMoney } from '@/lib/format'
import { LEAD_INTEREST, LEAD_SOURCE, LEAD_STAGE, optionsOf, PRIORITY } from '@/lib/labels'
import { COMMUNITIES } from '@/mocks/core'
import { leads } from '@/mocks/domain'
import type { Lead, LeadInterest, LeadSource, LeadStage, Priority, PropertyType } from '@/types/domain'
import { brokerOptions, nextCode } from './shared'
import { materializeSeeds } from '@/mocks/sales'

type Form = Pick<Lead, 'name' | 'email' | 'phone' | 'source' | 'stage' | 'interest' | 'communitySlug' | 'propertyType' | 'beds' | 'budget' | 'ownerId' | 'priority' | 'notes'>

export const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio', 'Office']

const blank = (): Form => ({
  name: '',
  email: '',
  phone: '',
  source: 'property-finder',
  stage: 'new',
  interest: 'buy',
  communitySlug: COMMUNITIES[0]!.slug,
  propertyType: 'Apartment',
  beds: 2,
  budget: 0,
  ownerId: 'emp-2',
  priority: 'medium',
  notes: '',
})

/** Expected commission if the lead converts (sale 2%, off-plan ~5%, rent 5% min AED 5,000). */
export function leadValue(interest: LeadInterest, budget: number) {
  const rent = interest === 'rent' || interest === 'list-rental'
  const rate = rent || interest === 'offplan' ? 5 : 2
  return Math.max(rent ? 5000 : 0, Math.round((budget * rate) / 100))
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LeadDrawer({ open, onClose, lead, onCreated }: { open: boolean; onClose: () => void; lead?: Lead | null; onCreated?: (l: Lead) => void }) {
  const { data: all = [] } = leads.useList()
  const create = leads.useCreate()
  const update = leads.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (lead) {
      const { name, email, phone, source, stage, interest, communitySlug, propertyType, beds, budget, ownerId, priority, notes } = lead
      setForm({ name, email, phone, source, stage, interest, communitySlug, propertyType, beds, budget, ownerId, priority, notes })
    } else setForm(blank())
  }, [open, lead])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const rent = form.interest === 'rent' || form.interest === 'list-rental'

  const save = () => {
    materializeSeeds()
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.phone.trim() && !form.email.trim()) e.phone = 'Add a phone number or email'
    if (form.email.trim() && !EMAIL.test(form.email.trim())) e.email = 'Invalid email address'
    if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 7) e.phone = 'Phone number looks too short'
    if (!(form.budget > 0)) e.budget = rent ? 'Enter the annual rent budget' : 'Enter the budget'
    if (form.beds < 0 || form.beds > 10) e.beds = '0–10'
    if (!form.ownerId) e.ownerId = 'Assign a broker'
    setErrors(e)
    if (Object.keys(e).length) return
    const now = new Date().toISOString()
    const data = { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), notes: form.notes.trim(), value: leadValue(form.interest, form.budget), lastActivityAt: now }
    if (lead) update.mutate({ id: lead.id, patch: data }, { onSuccess: onClose })
    else
      create.mutate(
        { ...data, code: nextCode('LD', all, 800), createdAt: now, customerId: null },
        {
          onSuccess: (l) => {
            onClose()
            onCreated?.(l)
          },
        },
      )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={lead ? `Edit ${lead.name}` : 'New lead'}
      subtitle={lead ? lead.code : 'Enquiry from a portal, the website, social or a referral'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {lead ? 'Save changes' : 'Create lead'}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="Full name" required error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mona Al Hashimi" aria-invalid={!!errors.name} autoFocus />}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971 50 123 4567" aria-invalid={!!errors.phone} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@mail.com" aria-invalid={!!errors.email} />}
        </Field>
        <Field label="Source">{(id) => <Select id={id} value={form.source} onChange={(e) => set('source', e.target.value as LeadSource)} options={optionsOf(LEAD_SOURCE)} />}</Field>
        <Field label="Interest">{(id) => <Select id={id} value={form.interest} onChange={(e) => set('interest', e.target.value as LeadInterest)} options={optionsOf(LEAD_INTEREST)} />}</Field>
        <Field label="Community">{(id) => <Select id={id} value={form.communitySlug} onChange={(e) => set('communitySlug', e.target.value)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}</Field>
        <Field label="Property type">{(id) => <Select id={id} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value as PropertyType)} options={PROPERTY_TYPES.map((t) => ({ value: t, label: t }))} />}</Field>
        <Field label="Bedrooms" error={errors.beds} hint="0 = studio">
          {(id) => <Input id={id} type="number" min={0} max={10} value={form.beds} onChange={(e) => set('beds', Number(e.target.value))} aria-invalid={!!errors.beds} />}
        </Field>
        <Field label={rent ? 'Annual rent budget (AED)' : 'Budget (AED)'} required error={errors.budget} hint={form.budget > 0 ? `≈ ${formatMoney(leadValue(form.interest, form.budget))} commission` : undefined}>
          {(id) => <Input id={id} type="number" min={0} step={rent ? 5000 : 50000} value={form.budget || ''} onChange={(e) => set('budget', Number(e.target.value))} aria-invalid={!!errors.budget} />}
        </Field>
        <Field label="Owner broker" required error={errors.ownerId}>
          {(id) => <Select id={id} value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)} placeholder="Assign…" options={brokerOptions()} aria-invalid={!!errors.ownerId} />}
        </Field>
        <Field label="Priority">{(id) => <Select id={id} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)} options={optionsOf(PRIORITY)} />}</Field>
        <Field label="Stage">{(id) => <Select id={id} value={form.stage} onChange={(e) => set('stage', e.target.value as LeadStage)} options={optionsOf(LEAD_STAGE).filter((o) => o.value === lead?.stage || (o.value !== 'won' && o.value !== 'lost'))} />}</Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Requirements, timeline, financing…" />}
        </Field>
      </form>
    </Drawer>
  )
}
