import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Switch } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { CUSTOMER_TYPE, LISTING_STATUS, optionsOf } from '@/lib/labels'
import { brokers, COMMUNITIES, customers } from '@/mocks/core'
import { listings } from '@/mocks/domain'
import type { Listing, ListingPurpose, ListingStatus, PropertyType } from '@/types/domain'
import { FURNISHING } from './labels'
import { ImagePicker } from './shared'

type Form = Omit<Listing, 'id' | 'ref' | 'siteId'>
const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio', 'Office']

const blank = (): Form => ({
  purpose: 'sale',
  status: 'active',
  title: '',
  propertyType: 'Apartment',
  communitySlug: COMMUNITIES[0]!.slug,
  building: '',
  beds: 2,
  baths: 2,
  sqft: 1200,
  price: 0,
  ownerId: '',
  agentId: brokers()[0]?.id ?? 'emp-2',
  permit: '',
  furnishing: 'unfurnished',
  cheques: null,
  images: [],
  listedAt: new Date().toISOString(),
  views: 0,
  enquiries: 0,
  exclusive: false,
})

export function ListingDrawer({ open, onClose, listing, onCreated }: { open: boolean; onClose: () => void; listing?: Listing | null; onCreated?: (l: Listing) => void }) {
  const { data: custs = [] } = customers.useList()
  const { data: all = [] } = listings.useList()
  const create = listings.useCreate()
  const update = listings.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (listing) {
      const { id: _id, ref: _ref, siteId: _s, ...rest } = listing
      setForm(rest)
    } else setForm(blank())
  }, [open, listing])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }
  const owners = useMemo(
    () =>
      custs
        .filter((c) => c.type === 'seller' || c.type === 'landlord' || c.type === 'investor')
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (form.purpose === 'sale' ? a.type === 'seller' : a.type === 'landlord') ? -1 : 1))
        .map((c) => ({ value: c.id, label: `${c.name} · ${CUSTOMER_TYPE[c.type]}` })),
    [custs, form.purpose],
  )
  const agents = brokers().map((b) => ({ value: b.id, label: b.name }))
  const statuses = optionsOf(LISTING_STATUS).filter((o) => (form.purpose === 'sale' ? o.value !== 'rented' : o.value !== 'sold'))

  const save = () => {
    const e: typeof errors = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.building.trim()) e.building = 'Building / project is required'
    if (!(form.sqft > 0)) e.sqft = 'Enter the size'
    if (!(form.price > 0)) e.price = form.purpose === 'rent' ? 'Enter the annual rent' : 'Enter the asking price'
    if (!form.ownerId) e.ownerId = 'Choose the owner'
    if (!/^\d{6,12}$/.test(form.permit.trim())) e.permit = 'Trakheesi permit is 6–12 digits'
    if (form.purpose === 'rent' && !(form.cheques && form.cheques >= 1 && form.cheques <= 12)) e.cheques = '1–12 cheques'
    if (!form.images.length) e.images = 'Pick at least one photo (the first is the cover)'
    setErrors(e)
    if (Object.keys(e).length) return
    const data: Form = { ...form, title: form.title.trim(), building: form.building.trim(), permit: form.permit.trim(), cheques: form.purpose === 'rent' ? form.cheques : null }
    if (listing) update.mutate({ id: listing.id, patch: data }, { onSuccess: onClose })
    else {
      const prefix = form.purpose === 'sale' ? 'S' : 'R'
      const max = Math.max(2800, ...all.map((l) => Number(l.ref.match(/(\d+)$/)?.[1] ?? 0)).filter((n) => n < 9000))
      create.mutate(
        { ...data, ref: `AA-${prefix}-${max + 1}`, listedAt: new Date().toISOString() },
        {
          onSuccess: (l) => {
            onClose()
            onCreated?.(l)
          },
        },
      )
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={listing ? 'Edit listing' : 'New listing'}
      subtitle={listing ? `${listing.ref} · ${listing.title}` : 'Secondary sale or rental unit'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {listing ? 'Save changes' : 'Create listing'}
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
        noValidate
      >
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <Segmented<ListingPurpose>
            value={form.purpose}
            onChange={(v) => setForm((f) => ({ ...f, purpose: v, cheques: v === 'rent' ? (f.cheques ?? 4) : null, status: v === 'sale' && f.status === 'rented' ? 'active' : v === 'rent' && f.status === 'sold' ? 'active' : f.status }))}
            options={[
              { value: 'sale', label: 'For sale' },
              { value: 'rent', label: 'For rent' },
            ]}
          />
          <Switch checked={form.exclusive} onChange={(v) => set('exclusive', v)} label="Exclusive mandate" />
        </div>
        <Field label="Title" required error={errors.title} className="sm:col-span-2">
          {(id) => <Input id={id} name="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Marina-view 2-bed apartment" aria-invalid={!!errors.title} autoFocus />}
        </Field>
        <Field label="Community" required>
          {(id) => <Select id={id} name="community" value={form.communitySlug} onChange={(e) => set('communitySlug', e.target.value)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}
        </Field>
        <Field label="Building / project" required error={errors.building}>
          {(id) => <Input id={id} name="building" value={form.building} onChange={(e) => set('building', e.target.value)} placeholder="e.g. Marina Gate 1" aria-invalid={!!errors.building} />}
        </Field>
        <Field label="Property type">
          {(id) => <Select id={id} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value as PropertyType)} options={PROPERTY_TYPES.map((t) => ({ value: t, label: t }))} />}
        </Field>
        <Field label="Status">{(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as ListingStatus)} options={statuses} />}</Field>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <Field label="Beds" hint="0 = studio">
            {(id) => <Input id={id} type="number" min={0} max={10} value={form.beds} onChange={(e) => set('beds', Number(e.target.value))} />}
          </Field>
          <Field label="Baths">{(id) => <Input id={id} type="number" min={1} max={12} value={form.baths} onChange={(e) => set('baths', Number(e.target.value))} />}</Field>
          <Field label="Size (sqft)" required error={errors.sqft}>
            {(id) => <Input id={id} name="sqft" type="number" min={0} step={10} value={form.sqft || ''} onChange={(e) => set('sqft', Number(e.target.value))} aria-invalid={!!errors.sqft} />}
          </Field>
        </div>
        <Field label={form.purpose === 'rent' ? 'Annual rent (AED)' : 'Asking price (AED)'} required error={errors.price}>
          {(id) => <Input id={id} name="price" type="number" min={0} step={form.purpose === 'rent' ? 1000 : 10000} value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} aria-invalid={!!errors.price} />}
        </Field>
        {form.purpose === 'rent' ? (
          <Field label="Cheques accepted" required error={errors.cheques}>
            {(id) => <Select id={id} value={String(form.cheques ?? 4)} onChange={(e) => set('cheques', Number(e.target.value))} options={[1, 2, 3, 4, 6, 12].map((n) => ({ value: String(n), label: `${n} cheque${n > 1 ? 's' : ''}` }))} />}
          </Field>
        ) : (
          <Field label="Furnishing">{(id) => <Select id={id} value={form.furnishing} onChange={(e) => set('furnishing', e.target.value as Form['furnishing'])} options={optionsOf(FURNISHING)} />}</Field>
        )}
        {form.purpose === 'rent' && (
          <Field label="Furnishing">{(id) => <Select id={id} value={form.furnishing} onChange={(e) => set('furnishing', e.target.value as Form['furnishing'])} options={optionsOf(FURNISHING)} />}</Field>
        )}
        <Field label="Trakheesi permit no." required error={errors.permit} hint="DLD advertising permit">
          {(id) => <Input id={id} name="permit" inputMode="numeric" value={form.permit} onChange={(e) => set('permit', e.target.value)} placeholder="71200000000" aria-invalid={!!errors.permit} />}
        </Field>
        <Field label="Owner" required error={errors.ownerId} hint="Sellers, landlords and investors">
          {(id) => <Select id={id} name="owner" value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)} options={owners} placeholder="Select owner…" aria-invalid={!!errors.ownerId} />}
        </Field>
        <Field label="Listing broker" required>
          {(id) => <Select id={id} value={form.agentId} onChange={(e) => set('agentId', e.target.value)} options={agents} />}
        </Field>
        {listing && (
          <>
            <Field label="Portal views">{(id) => <Input id={id} type="number" min={0} value={form.views} onChange={(e) => set('views', Number(e.target.value))} />}</Field>
            <Field label="Enquiries">{(id) => <Input id={id} type="number" min={0} value={form.enquiries} onChange={(e) => set('enquiries', Number(e.target.value))} />}</Field>
          </>
        )}
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[12.5px] font-semibold text-fg/85">
              Photos<span className="ms-0.5 text-danger">*</span>
            </p>
            <p className="text-[12px] text-muted">{form.images.length} selected · first = cover</p>
          </div>
          <ImagePicker value={form.images} onChange={(v) => set('images', v)} />
          {errors.images && <p className="mt-1.5 text-[12px] text-danger">{errors.images}</p>}
        </div>
      </form>
    </Drawer>
  )
}
