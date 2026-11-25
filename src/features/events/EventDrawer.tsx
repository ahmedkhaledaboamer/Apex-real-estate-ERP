import { useEffect, useMemo } from 'react'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { formatMoney } from '@/lib/format'
import { optionsOf } from '@/lib/labels'
import { code, daysFromNow } from '@/lib/random'
import { COMMUNITIES, employees } from '@/mocks/core'
import { listings, offplanProjects } from '@/mocks/domain'
import { events } from '@/mocks/events'
import type { AgencyEvent, EventType } from '@/types/events'
import { FormFooter, FormSection, fromLocalInput, NumberInput, toLocalInput, useForm } from './formParts'
import { CHECKLIST_TEMPLATE, EVENT_STATUS, EVENT_TYPE } from './labels'

type Draft = Omit<AgencyEvent, 'id'>

const CITIES = ['Dubai', 'Abu Dhabi', 'London', 'Riyadh', 'Mumbai', 'Moscow', 'Cairo', 'Shanghai', 'Berlin']

function blank(date?: Date | null): Draft {
  const start = date ? new Date(date) : new Date(daysFromNow(14))
  start.setHours(11, 0, 0, 0)
  const end = new Date(start)
  end.setHours(15, 0, 0, 0)
  return {
    code: code('EVT', 300 + events.collection.all().length + 1),
    title: '',
    type: 'open-house',
    start: start.toISOString(),
    end: end.toISOString(),
    location: '',
    city: 'Dubai',
    projectId: null,
    listingId: null,
    communitySlug: null,
    capacity: 30,
    attendees: [],
    budget: 0,
    actualCost: 0,
    leadsGenerated: 0,
    dealsAttributed: 0,
    attributedGci: 0,
    status: 'planning',
    ownerId: '',
    checklist: [],
    description: '',
  }
}

export function EventDrawer({ open, onClose, editing, defaultDate, onSaved }: { open: boolean; onClose: () => void; editing?: AgencyEvent | null; defaultDate?: Date | null; onSaved?: (e: AgencyEvent) => void }) {
  const create = events.useCreate()
  const update = events.useUpdate()
  const { data: emps } = employees.useList()
  const { data: ops = [] } = offplanProjects.useList()
  const { data: lst = [] } = listings.useList()
  const { values: v, set, errors, reset, validate } = useForm<Draft>(blank())

  useEffect(() => {
    if (!open) return
    if (editing) {
      const { id: _id, ...rest } = editing
      reset(rest)
    } else reset(blank(defaultDate))
  }, [open, editing, defaultDate, reset])

  const listingOptions = useMemo(
    () =>
      lst
        .filter((l) => l.status === 'active' || l.status === 'under-offer' || l.id === v.listingId)
        .filter((l) => !v.communitySlug || l.communitySlug === v.communitySlug)
        .sort((a, b) => a.ref.localeCompare(b.ref))
        .map((l) => ({ value: l.id, label: `${l.ref} · ${l.title}` })),
    [lst, v.communitySlug, v.listingId],
  )

  const save = () => {
    const ok = validate({
      title: (x) => !x.title.trim() && 'Title is required',
      location: (x) => !x.location.trim() && 'Location / venue is required',
      ownerId: (x) => !x.ownerId && 'Assign an owner',
      end: (x) => x.end < x.start && 'Ends before it starts',
      capacity: (x) => x.capacity < 1 && 'At least 1',
    })
    if (!ok) return
    const data: Draft = {
      ...v,
      title: v.title.trim(),
      checklist: editing ? v.checklist : CHECKLIST_TEMPLATE[v.type].map((label, i) => ({ id: `chk-${Date.now().toString(36)}-${i}`, label, done: false })),
    }
    const done = (e: AgencyEvent) => {
      onSaved?.(e)
      onClose()
    }
    if (editing) update.mutate({ id: editing.id, patch: data }, { onSuccess: done })
    else create.mutate(data, { onSuccess: done })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={editing ? 'Edit event' : 'New event'}
      subtitle={editing ? `${editing.code} · ${editing.title}` : 'A starter checklist is added for the event type'}
      footer={<FormFooter onCancel={onClose} onSave={save} saving={create.isPending || update.isPending} saveLabel={editing ? 'Save changes' : 'Create event'} />}
    >
      <div className="space-y-7">
        <FormSection title="Event">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title} className="sm:col-span-2">
              {(id) => <Input id={id} value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Open house — Marina Gate 1" aria-invalid={!!errors.title} />}
            </Field>
            <Field label="Type">{(id) => <Select id={id} value={v.type} onChange={(e) => set('type', e.target.value as EventType)} options={optionsOf(EVENT_TYPE)} />}</Field>
            <Field label="Status">{(id) => <Select id={id} value={v.status} onChange={(e) => set('status', e.target.value as Draft['status'])} options={optionsOf(EVENT_STATUS)} />}</Field>
            <Field label="Starts" required>
              {(id) => <Input id={id} type="datetime-local" value={toLocalInput(v.start)} onChange={(e) => e.target.value && set('start', fromLocalInput(e.target.value))} />}
            </Field>
            <Field label="Ends" required error={errors.end}>
              {(id) => <Input id={id} type="datetime-local" value={toLocalInput(v.end)} onChange={(e) => e.target.value && set('end', fromLocalInput(e.target.value))} aria-invalid={!!errors.end} />}
            </Field>
            <Field label="Venue / location" required error={errors.location}>
              {(id) => <Input id={id} value={v.location} onChange={(e) => set('location', e.target.value)} placeholder="Building, sales gallery or venue" aria-invalid={!!errors.location} />}
            </Field>
            <Field label="City">{(id) => <Select id={id} value={v.city} onChange={(e) => set('city', e.target.value)} options={CITIES.map((c) => ({ value: c, label: c }))} />}</Field>
            <Field label="Owner" required error={errors.ownerId}>
              {(id) => <Select id={id} value={v.ownerId} onChange={(e) => set('ownerId', e.target.value)} placeholder="Select owner" options={(emps ?? []).filter((e) => e.status !== 'terminated').map((e) => ({ value: e.id, label: `${e.name} — ${e.title}` }))} aria-invalid={!!errors.ownerId} />}
            </Field>
            <Field label="Capacity" required error={errors.capacity}>
              {(id) => <NumberInput id={id} value={v.capacity} min={1} onChange={(n) => set('capacity', n)} invalid={!!errors.capacity} />}
            </Field>
          </div>
        </FormSection>
        <FormSection title="What it promotes (optional)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Off-plan project">
              {(id) => (
                <Select
                  id={id}
                  value={v.projectId ?? ''}
                  onChange={(e) => {
                    const op = ops.find((x) => x.id === e.target.value)
                    set('projectId', op?.id ?? null)
                    if (op) set('communitySlug', op.communitySlug)
                  }}
                  placeholder="None"
                  options={[...ops].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ value: o.id, label: o.name }))}
                />
              )}
            </Field>
            <Field label="Community">{(id) => <Select id={id} value={v.communitySlug ?? ''} onChange={(e) => set('communitySlug', e.target.value || null)} placeholder="None" options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}</Field>
            <Field label="Listing" hint="For open houses" className="sm:col-span-2">
              {(id) => <Select id={id} value={v.listingId ?? ''} onChange={(e) => set('listingId', e.target.value || null)} placeholder="None" options={listingOptions} />}
            </Field>
          </div>
        </FormSection>
        <FormSection title="Budget & results">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budget">{(id) => <NumberInput id={id} prefix="AED" step={500} value={v.budget} onChange={(n) => set('budget', n)} />}</Field>
            <Field label="Actual cost">{(id) => <NumberInput id={id} prefix="AED" step={100} value={v.actualCost} onChange={(n) => set('actualCost', n)} />}</Field>
            <Field label="Leads generated">{(id) => <NumberInput id={id} value={v.leadsGenerated} onChange={(n) => set('leadsGenerated', n)} />}</Field>
            <Field label="Deals attributed">{(id) => <NumberInput id={id} value={v.dealsAttributed} onChange={(n) => set('dealsAttributed', n)} />}</Field>
            <Field label="Attributed GCI" hint="Commission from the attributed deals" className="sm:col-span-2">
              {(id) => <NumberInput id={id} prefix="AED" step={1000} value={v.attributedGci} onChange={(n) => set('attributedGci', n)} />}
            </Field>
          </div>
          {v.actualCost > 0 && (
            <p className="text-[12.5px] text-muted">
              {v.leadsGenerated ? `Cost per lead ${formatMoney(v.actualCost / v.leadsGenerated)} · ` : ''}
              ROI <span className="font-semibold text-fg">{v.attributedGci ? `${((v.attributedGci / v.actualCost) * 100).toFixed(0)}%` : '—'}</span>
            </p>
          )}
        </FormSection>
        <Field label="Description">{(id) => <Textarea id={id} value={v.description} onChange={(e) => set('description', e.target.value)} placeholder="Goals, audience, notes for the team…" />}</Field>
      </div>
    </Drawer>
  )
}
