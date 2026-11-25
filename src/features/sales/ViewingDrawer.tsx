import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { formatNumber } from '@/lib/format'
import { dateFromNow } from '@/lib/random'
import { communityBySlug, customers, employeeById } from '@/mocks/core'
import { leads, listings, offplanProjects, viewings } from '@/mocks/domain'
import type { Viewing } from '@/types/domain'
import { brokerOptions, fmtTime, isoToLocal, localToIso, PropertyThumb, Stars } from './shared'
import { materializeSeeds } from '@/mocks/sales'

export type ViewingInitial = Partial<Pick<Viewing, 'listingId' | 'projectId' | 'leadId' | 'clientId' | 'agentId'>>

interface Form {
  what: 'listing' | 'project'
  who: 'lead' | 'client'
  listingId: string
  projectId: string
  leadId: string
  clientId: string
  agentId: string
  date: string
  time: string
}

const GAP = 45 * 60_000

/** Schedule or reschedule a viewing. Rejects double-booking the same broker within 45 minutes. */
export function ViewingDrawer({ open, onClose, viewing, initial }: { open: boolean; onClose: () => void; viewing?: Viewing | null; initial?: ViewingInitial }) {
  const { data: lst = [] } = listings.useList()
  const { data: projects = [] } = offplanProjects.useList()
  const { data: lds = [] } = leads.useList()
  const { data: custs = [] } = customers.useList()
  const { data: all = [] } = viewings.useList()
  const create = viewings.useCreate()
  const update = viewings.useUpdate()
  const updateLead = leads.useUpdate({ silent: true })
  const [form, setForm] = useState<Form>(() => blank())
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'when', string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    const src = viewing ?? initial ?? {}
    const when = viewing ? isoToLocal(viewing.at) : { date: dateFromNow(1), time: '11:00' }
    setForm({
      what: src.projectId ? 'project' : 'listing',
      who: src.clientId && !src.leadId ? 'client' : 'lead',
      listingId: src.listingId ?? '',
      projectId: src.projectId ?? '',
      leadId: src.leadId ?? '',
      clientId: src.clientId ?? '',
      agentId: src.agentId ?? '',
      ...when,
    })
  }, [open, viewing, initial])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const unitOptions = useMemo(() => lst.filter((l) => l.status === 'active' || l.status === 'under-offer' || l.id === form.listingId).map((l) => ({ value: l.id, label: `${l.ref} · ${l.title} · ${l.purpose === 'rent' ? 'rent' : 'sale'} ${formatNumber(l.price)}` })), [lst, form.listingId])
  const projectOptions = useMemo(() => projects.filter((p) => p.status !== 'completed' || p.id === form.projectId).map((p) => ({ value: p.id, label: `${p.name} · ${communityBySlug(p.communitySlug)?.name}` })), [projects, form.projectId])
  const leadOptions = useMemo(() => lds.filter((l) => (l.stage !== 'lost' && l.stage !== 'won') || l.id === form.leadId).sort((a, b) => a.name.localeCompare(b.name)).map((l) => ({ value: l.id, label: `${l.name} · ${l.code}` })), [lds, form.leadId])
  const clientOptions = useMemo(() => custs.filter((c) => c.type !== 'developer').sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: `${c.name} · ${c.code}` })), [custs])

  const pickListing = (id: string) => {
    const l = lst.find((x) => x.id === id)
    setForm((f) => ({ ...f, listingId: id, agentId: f.agentId || l?.agentId || '' }))
  }
  const pickLead = (id: string) => {
    const l = lds.find((x) => x.id === id)
    setForm((f) => ({ ...f, leadId: id, agentId: f.agentId || l?.ownerId || '' }))
  }

  const unit = form.what === 'listing' ? lst.find((l) => l.id === form.listingId) : undefined
  const project = form.what === 'project' ? projects.find((p) => p.id === form.projectId) : undefined

  // Broker's other viewings on the chosen day (helps pick a free slot).
  const dayAgenda = useMemo(() => {
    if (!form.agentId || !form.date) return []
    return all.filter((v) => v.agentId === form.agentId && v.status === 'scheduled' && v.id !== viewing?.id && isoToLocal(v.at).date === form.date).sort((a, b) => a.at.localeCompare(b.at))
  }, [all, form.agentId, form.date, viewing])

  const save = () => {
    materializeSeeds()
    const e: typeof errors = {}
    if (form.what === 'listing' && !form.listingId) e.listingId = 'Choose a listing'
    if (form.what === 'project' && !form.projectId) e.projectId = 'Choose a project'
    if (form.who === 'lead' && !form.leadId) e.leadId = 'Choose a lead'
    if (form.who === 'client' && !form.clientId) e.clientId = 'Choose a client'
    if (!form.agentId) e.agentId = 'Assign a broker'
    if (!form.date || !form.time) e.when = 'Pick a date and time'
    const at = form.date && form.time ? localToIso(form.date, form.time) : ''
    if (at && !viewing && new Date(at).getTime() < Date.now()) e.when = 'That time has already passed'
    if (at && form.agentId) {
      const clash = all.find((v) => v.id !== viewing?.id && v.agentId === form.agentId && v.status === 'scheduled' && Math.abs(new Date(v.at).getTime() - new Date(at).getTime()) < GAP)
      if (clash) e.when = `${employeeById(form.agentId)?.name.split(' ')[0] ?? 'The broker'} already has a viewing at ${fmtTime(clash.at)} — leave at least 45 minutes`
    }
    setErrors(e)
    if (Object.keys(e).length) return
    const data = {
      listingId: form.what === 'listing' ? form.listingId : null,
      projectId: form.what === 'project' ? form.projectId : null,
      leadId: form.who === 'lead' ? form.leadId : null,
      clientId: form.who === 'client' ? form.clientId : null,
      agentId: form.agentId,
      at,
    }
    if (viewing) update.mutate({ id: viewing.id, patch: data }, { onSuccess: onClose })
    else
      create.mutate(
        { ...data, status: 'scheduled', feedback: '', interest: null },
        {
          onSuccess: () => {
            // Booking a viewing moves an early-stage lead to "Viewing".
            const lead = lds.find((l) => l.id === data.leadId)
            if (lead && (lead.stage === 'new' || lead.stage === 'contacted' || lead.stage === 'qualified')) updateLead.mutate({ id: lead.id, patch: { stage: 'viewing', lastActivityAt: new Date().toISOString() } })
            onClose()
          },
        },
      )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={viewing ? 'Reschedule viewing' : 'Schedule viewing'}
      subtitle="Property, who's coming, broker and time"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {viewing ? 'Save' : 'Schedule'}
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
          <Segmented
            size="sm"
            value={form.what}
            onChange={(v) => set('what', v)}
            options={[
              { value: 'listing', label: 'Listing' },
              { value: 'project', label: 'Off-plan project' },
            ]}
          />
        </div>
        {form.what === 'listing' ? (
          <Field label="Listing" required error={errors.listingId} className="sm:col-span-2">
            {(id) => <Select id={id} value={form.listingId} onChange={(e) => pickListing(e.target.value)} placeholder="Choose a unit…" options={unitOptions} aria-invalid={!!errors.listingId} />}
          </Field>
        ) : (
          <Field label="Project" required error={errors.projectId} className="sm:col-span-2">
            {(id) => <Select id={id} value={form.projectId} onChange={(e) => set('projectId', e.target.value)} placeholder="Choose a project…" options={projectOptions} aria-invalid={!!errors.projectId} />}
          </Field>
        )}
        {(unit || project) && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3 sm:col-span-2">
            <PropertyThumb image={unit?.images[0] ?? project?.image} size={48} />
            <div className="min-w-0 text-[13px]">
              <p className="truncate font-semibold">{unit?.title ?? project?.name}</p>
              <p className="truncate text-muted">
                {communityBySlug(unit?.communitySlug ?? project?.communitySlug)?.name}
                {unit && ` · ${unit.building} · ${unit.beds ? `${unit.beds} BR` : unit.propertyType}`}
              </p>
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <Segmented
            size="sm"
            value={form.who}
            onChange={(v) => set('who', v)}
            options={[
              { value: 'lead', label: 'Lead' },
              { value: 'client', label: 'Client' },
            ]}
          />
        </div>
        {form.who === 'lead' ? (
          <Field label="Lead" required error={errors.leadId}>
            {(id) => <Select id={id} value={form.leadId} onChange={(e) => pickLead(e.target.value)} placeholder="Choose a lead…" options={leadOptions} aria-invalid={!!errors.leadId} />}
          </Field>
        ) : (
          <Field label="Client" required error={errors.clientId}>
            {(id) => <Select id={id} value={form.clientId} onChange={(e) => set('clientId', e.target.value)} placeholder="Choose a client…" options={clientOptions} aria-invalid={!!errors.clientId} />}
          </Field>
        )}
        <Field label="Broker" required error={errors.agentId}>
          {(id) => <Select id={id} value={form.agentId} onChange={(e) => set('agentId', e.target.value)} placeholder="Assign…" options={brokerOptions()} aria-invalid={!!errors.agentId} />}
        </Field>
        <Field label="Date" required>
          {(id) => <Input id={id} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} aria-invalid={!!errors.when} />}
        </Field>
        <Field label="Time" required>
          {(id) => <Input id={id} type="time" step={900} min="08:00" max="21:00" value={form.time} onChange={(e) => set('time', e.target.value)} aria-invalid={!!errors.when} />}
        </Field>
        {errors.when && <p className="-mt-2 text-[12px] text-danger sm:col-span-2">{errors.when}</p>}
        {form.agentId && form.date && (
          <div className="rounded-xl bg-surface-2/70 p-3 text-[12.5px] sm:col-span-2">
            <p className="font-semibold">{employeeById(form.agentId)?.name}'s viewings that day</p>
            {dayAgenda.length === 0 ? (
              <p className="mt-1 text-muted">No other viewings — the day is free.</p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {dayAgenda.map((v) => (
                  <li key={v.id} className="rounded-md bg-surface px-2 py-0.5 font-semibold tabular ring-1 ring-line">
                    {fmtTime(v.at)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </Drawer>
  )
}

function blank(): Form {
  return { what: 'listing', who: 'lead', listingId: '', projectId: '', leadId: '', clientId: '', agentId: '', date: dateFromNow(1), time: '11:00' }
}

/** Record the outcome of a viewing: feedback + 1–5 interest. */
export function ViewingCompleteDrawer({ viewing, onClose }: { viewing: Viewing | null; onClose: () => void }) {
  const update = viewings.useUpdate()
  const [feedback, setFeedback] = useState('')
  const [interest, setInterest] = useState<number | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!viewing) return
    setFeedback(viewing.feedback)
    setInterest(viewing.interest)
    setError('')
  }, [viewing])
  const save = () => {
    if (!viewing) return
    if (!interest) return setError('Rate the client’s interest')
    update.mutate({ id: viewing.id, patch: { status: 'completed', feedback: feedback.trim(), interest } }, { onSuccess: onClose })
  }
  return (
    <Drawer
      open={!!viewing}
      onClose={onClose}
      title="Complete viewing"
      subtitle="How did it go?"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={update.isPending}>
            Save feedback
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-fg/85">
            Interest<span className="ms-0.5 text-danger">*</span>
          </p>
          <Stars value={interest} onChange={(n) => (setInterest(n), setError(''))} size={26} />
          <p className="mt-1 text-[12px] text-muted">{['', 'Not interested', 'Lukewarm', 'Considering', 'Keen', 'Ready to offer'][interest ?? 0] || 'Tap to rate'}</p>
          {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
        </div>
        <Field label="Feedback">{(id) => <Textarea id={id} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What they liked, objections, next steps…" />}</Field>
      </div>
    </Drawer>
  )
}
