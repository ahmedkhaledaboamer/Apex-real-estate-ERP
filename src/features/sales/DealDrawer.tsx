import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { formatMoney, formatNumber } from '@/lib/format'
import { DEAL_TYPE, LEAD_SOURCE, optionsOf } from '@/lib/labels'
import { dateFromNow } from '@/lib/random'
import { communityBySlug, COMMUNITIES, customers, developerCustomer, employeeById } from '@/mocks/core'
import { agencyShare, brokerShare, deals, listings, offplanProjects } from '@/mocks/domain'
import type { Deal, DealType, LeadSource } from '@/types/domain'
import { DEFAULT_RATE } from './labels'
import { brokerOptions, calcCommission, nextCode, PropertyThumb } from './shared'
import { useDealDocsWriter } from './useDealActions'
import { materializeSeeds } from '@/mocks/sales'

type Form = Pick<Deal, 'type' | 'listingId' | 'projectId' | 'communitySlug' | 'clientId' | 'counterpartyId' | 'agentId' | 'price' | 'commissionRate' | 'expectedCloseDate' | 'source' | 'notes'>

const blank = (type: DealType = 'sale'): Form => ({
  type,
  listingId: null,
  projectId: null,
  communitySlug: COMMUNITIES[0]!.slug,
  clientId: '',
  counterpartyId: '',
  agentId: '',
  price: 0,
  commissionRate: DEFAULT_RATE[type],
  expectedCloseDate: dateFromNow(type === 'rent' ? 14 : type === 'offplan' ? 30 : 60),
  source: 'property-finder',
  notes: '',
})

export function DealDrawer({ open, onClose, deal, initial, onCreated }: { open: boolean; onClose: () => void; deal?: Deal | null; initial?: Partial<Form>; onCreated?: (d: Deal) => void }) {
  const { data: all = [] } = deals.useList()
  const { data: lst = [] } = listings.useList()
  const { data: projects = [] } = offplanProjects.useList()
  const { data: custs = [] } = customers.useList()
  const create = deals.useCreate()
  const update = deals.useUpdate()
  const updateListing = listings.useUpdate({ silent: true })
  const writeDocs = useDealDocsWriter()
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (deal) {
      const { type, listingId, projectId, communitySlug, clientId, counterpartyId, agentId, price, commissionRate, expectedCloseDate, source, notes } = deal
      setForm({ type, listingId, projectId, communitySlug, clientId, counterpartyId, agentId, price, commissionRate, expectedCloseDate, source, notes })
    } else setForm({ ...blank(initial?.type), ...initial })
  }, [open, deal, initial])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const setType = (type: DealType) => setForm((f) => ({ ...blank(type), clientId: f.clientId, agentId: f.agentId, source: f.source, notes: f.notes }))

  const units = useMemo(
    () =>
      lst
        .filter((l) => l.purpose === (form.type === 'rent' ? 'rent' : 'sale') && (l.status === 'active' || l.status === 'under-offer' || l.id === form.listingId))
        .sort((a, b) => a.ref.localeCompare(b.ref)),
    [lst, form.type, form.listingId],
  )
  const openProjects = useMemo(() => projects.filter((p) => p.status !== 'completed' || p.id === form.projectId), [projects, form.projectId])
  const clientOptions = useMemo(
    () =>
      custs
        .filter((c) => (form.type === 'rent' ? c.type === 'tenant' : c.type === 'buyer' || c.type === 'investor') || c.id === form.clientId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: `${c.name} · ${c.code}` })),
    [custs, form.type, form.clientId],
  )
  const counterpartyOptions = useMemo(
    () =>
      custs
        .filter((c) => (form.type === 'offplan' ? c.type === 'developer' : form.type === 'rent' ? c.type === 'landlord' || c.type === 'investor' : c.type === 'seller' || c.type === 'investor' || c.type === 'landlord') || c.id === form.counterpartyId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: c.name })),
    [custs, form.type, form.counterpartyId],
  )

  const pickListing = (id: string) => {
    const l = lst.find((x) => x.id === id)
    if (!l) return set('listingId', null)
    setForm((f) => ({ ...f, listingId: l.id, communitySlug: l.communitySlug, counterpartyId: l.ownerId, price: l.price, agentId: f.agentId || l.agentId }))
  }
  const pickProject = (id: string) => {
    const p = projects.find((x) => x.id === id)
    if (!p) return set('projectId', null)
    setForm((f) => ({ ...f, projectId: p.id, communitySlug: p.communitySlug, counterpartyId: developerCustomer(p.developerSlug)?.id ?? f.counterpartyId, price: f.price || p.fromPrice, commissionRate: p.commissionRate }))
  }

  const commission = calcCommission(form.type, form.price || 0, form.commissionRate || 0)
  const broker = employeeById(form.agentId)
  const split = broker?.commissionSplit ?? 50
  const selectedUnit = lst.find((l) => l.id === form.listingId)
  const selectedProject = projects.find((p) => p.id === form.projectId)

  const save = () => {
    materializeSeeds()
    const e: typeof errors = {}
    if (form.type === 'offplan' ? !form.projectId : !form.listingId) e[form.type === 'offplan' ? 'projectId' : 'listingId'] = form.type === 'offplan' ? 'Choose the project' : 'Choose the unit'
    if (!form.clientId) e.clientId = form.type === 'rent' ? 'Choose the tenant' : 'Choose the buyer'
    if (!form.counterpartyId) e.counterpartyId = 'Required'
    else if (form.counterpartyId === form.clientId) e.counterpartyId = 'Counterparty cannot be the client'
    if (!form.agentId) e.agentId = 'Assign a broker'
    if (!(form.price > 0)) e.price = 'Enter the price'
    if (!(form.commissionRate > 0) || form.commissionRate > 20) e.commissionRate = 'Between 0 and 20%'
    if (!form.expectedCloseDate) e.expectedCloseDate = 'Required'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { ...form, commission, agentSplit: split, notes: form.notes.trim() }
    if (deal) {
      const collected = Math.min(deal.collected, commission)
      update.mutate({ id: deal.id, patch: { ...data, collected } }, { onSuccess: onClose })
      return
    }
    create.mutate(
      { ...data, code: nextCode('DL', all, 3000), stage: 'offer', collected: 0, createdAt: new Date().toISOString(), closedAt: null },
      {
        onSuccess: (d) => {
          if (selectedUnit && selectedUnit.status === 'active') updateListing.mutate({ id: selectedUnit.id, patch: { status: 'under-offer' } })
          void writeDocs(d, { log: `Deal created at ${formatMoney(d.price)} — offer stage` })
          onClose()
          onCreated?.(d)
        },
      },
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={deal ? `Edit ${deal.code}` : 'New deal'}
      subtitle={deal ? 'Update terms, parties and commission' : 'Sale, rental or off-plan — commission is calculated live'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {deal ? 'Save changes' : 'Create deal'}
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
        <div className="sm:col-span-2">
          <p className="mb-2 text-[12.5px] font-semibold text-fg/85">Deal type</p>
          {deal ? (
            <p className="text-[13.5px] font-semibold">{DEAL_TYPE[deal.type]}</p>
          ) : (
            <Segmented value={form.type} onChange={setType} options={(['sale', 'rent', 'offplan'] as const).map((t) => ({ value: t, label: DEAL_TYPE[t] }))} />
          )}
        </div>

        {form.type === 'offplan' ? (
          <Field label="Off-plan project" required error={errors.projectId} className="sm:col-span-2">
            {(id) => <Select id={id} value={form.projectId ?? ''} onChange={(e) => pickProject(e.target.value)} placeholder="Choose a project…" aria-invalid={!!errors.projectId} options={openProjects.map((p) => ({ value: p.id, label: `${p.name} · ${communityBySlug(p.communitySlug)?.name} · ${p.commissionRate}%` }))} />}
          </Field>
        ) : (
          <Field label={form.type === 'rent' ? 'Rental listing' : 'Listing'} required error={errors.listingId} className="sm:col-span-2">
            {(id) => <Select id={id} value={form.listingId ?? ''} onChange={(e) => pickListing(e.target.value)} placeholder="Choose a unit…" aria-invalid={!!errors.listingId} options={units.map((l) => ({ value: l.id, label: `${l.ref} · ${l.title} · ${formatNumber(l.price)}` }))} />}
          </Field>
        )}

        {(selectedUnit || selectedProject) && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3 sm:col-span-2">
            <PropertyThumb image={selectedUnit?.images[0] ?? selectedProject?.image} size={52} />
            <div className="min-w-0 text-[13px]">
              <p className="truncate font-semibold">{selectedUnit?.title ?? selectedProject?.name}</p>
              <p className="truncate text-muted">
                {communityBySlug(form.communitySlug)?.name}
                {selectedUnit && ` · ${selectedUnit.beds ? `${selectedUnit.beds} BR` : selectedUnit.propertyType} · ${formatNumber(selectedUnit.sqft)} sq ft · asking ${formatMoney(selectedUnit.price)}`}
                {selectedProject && ` · from ${formatMoney(selectedProject.fromPrice)} · ${selectedProject.plan} plan`}
              </p>
            </div>
          </div>
        )}

        <Field label={form.type === 'rent' ? 'Tenant' : 'Buyer'} required error={errors.clientId}>
          {(id) => <Select id={id} value={form.clientId} onChange={(e) => set('clientId', e.target.value)} placeholder="Choose a client…" aria-invalid={!!errors.clientId} options={clientOptions} />}
        </Field>
        <Field label={form.type === 'offplan' ? 'Developer' : form.type === 'rent' ? 'Landlord' : 'Seller'} required error={errors.counterpartyId} hint={form.type === 'offplan' ? 'Pays the commission' : 'Pre-filled from the listing owner'}>
          {(id) => <Select id={id} value={form.counterpartyId} onChange={(e) => set('counterpartyId', e.target.value)} placeholder="Choose…" aria-invalid={!!errors.counterpartyId} options={counterpartyOptions} />}
        </Field>
        <Field label="Broker" required error={errors.agentId}>
          {(id) => <Select id={id} value={form.agentId} onChange={(e) => set('agentId', e.target.value)} placeholder="Assign…" aria-invalid={!!errors.agentId} options={brokerOptions()} />}
        </Field>
        <Field label="Source">{(id) => <Select id={id} value={form.source} onChange={(e) => set('source', e.target.value as LeadSource)} options={optionsOf(LEAD_SOURCE)} />}</Field>
        <Field label={form.type === 'rent' ? 'Annual rent (AED)' : 'Price (AED)'} required error={errors.price}>
          {(id) => <Input id={id} type="number" min={0} step={form.type === 'rent' ? 1000 : 5000} value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} aria-invalid={!!errors.price} />}
        </Field>
        <Field label="Commission (%)" required error={errors.commissionRate} hint={form.type === 'rent' ? 'Min. AED 5,000' : form.type === 'offplan' ? 'From the project agreement' : 'Standard 2%'}>
          {(id) => <Input id={id} type="number" min={0} max={20} step={0.25} value={form.commissionRate || ''} onChange={(e) => set('commissionRate', Number(e.target.value))} aria-invalid={!!errors.commissionRate} />}
        </Field>
        <Field label="Expected close" required error={errors.expectedCloseDate}>
          {(id) => <Input id={id} type="date" value={form.expectedCloseDate} onChange={(e) => set('expectedCloseDate', e.target.value)} aria-invalid={!!errors.expectedCloseDate} />}
        </Field>
        <Field label="Community">
          {(id) => <Select id={id} value={form.communitySlug} onChange={(e) => set('communitySlug', e.target.value)} disabled={!!(selectedUnit || selectedProject)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}
        </Field>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-aura/20 bg-aura/5 p-4 sm:col-span-2 sm:grid-cols-4">
          <Summary label="Commission (GCI)" value={formatMoney(commission)} strong />
          <Summary label="+ VAT 5%" value={formatMoney(Math.round(commission * 0.05))} />
          <Summary label={`Broker ${split}%`} value={formatMoney(brokerShare({ commission, agentSplit: split }))} />
          <Summary label="Agency share" value={formatMoney(agencyShare({ commission, agentSplit: split }))} />
        </div>

        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Conditions, mortgage, handover date…" />}
        </Field>
      </form>
    </Drawer>
  )
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11.5px] font-medium text-muted">{label}</p>
      <p className={strong ? 'mt-0.5 truncate text-[15px] font-bold text-aura tabular dark:text-[#d6a8e3]' : 'mt-0.5 truncate text-[13.5px] font-semibold tabular'}>{value}</p>
    </div>
  )
}
