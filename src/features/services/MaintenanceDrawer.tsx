import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { optionsOf, PRIORITY } from '@/lib/labels'
import { code, dateFromNow } from '@/lib/random'
import { suppliers } from '@/mocks/core'
import { maintenanceRequests, tenancies } from '@/mocks/services'
import type { Priority } from '@/types/domain'
import type { MaintenanceCategory, MaintenanceRequest, MaintenanceStatus } from '@/types/services'
import { MAINTENANCE_CATEGORY, MAINTENANCE_STATUS } from './labels'

type Form = Omit<MaintenanceRequest, 'id' | 'code'>

const blank = (tenancyId = ''): Form => ({
  tenancyId,
  title: '',
  description: '',
  category: 'ac',
  priority: 'medium',
  vendorId: null,
  reportedAt: dateFromNow(0),
  scheduledAt: null,
  completedAt: null,
  cost: 0,
  status: 'open',
})

export function MaintenanceDrawer({ open, onClose, request, defaultTenancyId }: { open: boolean; onClose: () => void; request?: MaintenanceRequest | null; defaultTenancyId?: string }) {
  const { data: allTenancies = [] } = tenancies.useList()
  const { data: vendors = [] } = suppliers.useList()
  const { data: all = [] } = maintenanceRequests.useList()
  const create = maintenanceRequests.useCreate()
  const update = maintenanceRequests.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (request) {
      const { id: _id, code: _c, ...rest } = request
      setForm(rest)
    } else setForm(blank(defaultTenancyId))
  }, [open, request, defaultTenancyId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }
  const setStatus = (s: MaintenanceStatus) =>
    setForm((f) => ({
      ...f,
      status: s,
      scheduledAt: s !== 'open' && s !== 'cancelled' && !f.scheduledAt ? dateFromNow(1) : f.scheduledAt,
      completedAt: s === 'completed' ? (f.completedAt ?? dateFromNow(0)) : null,
    }))
  const maintenanceVendors = vendors.filter((v) => v.category === 'maintenance' && (v.active || v.id === form.vendorId))
  const units = allTenancies.filter((t) => t.status !== 'ended' || t.id === form.tenancyId)

  const save = () => {
    const e: typeof errors = {}
    if (!form.tenancyId) e.tenancyId = 'Choose the unit'
    if (!form.title.trim()) e.title = 'Describe the issue'
    if ((form.status === 'scheduled' || form.status === 'in-progress') && !form.vendorId) e.vendorId = 'Assign a vendor before scheduling'
    if (form.status !== 'open' && form.status !== 'cancelled' && !form.scheduledAt) e.scheduledAt = 'Set the visit date'
    if (form.scheduledAt && form.scheduledAt < form.reportedAt) e.scheduledAt = 'Before the reported date'
    if (form.cost < 0) e.cost = 'Cannot be negative'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { ...form, title: form.title.trim() }
    if (request) update.mutate({ id: request.id, patch: data }, { onSuccess: onClose })
    else create.mutate({ ...data, code: code('MR', 900 + all.length + 1) }, { onSuccess: onClose })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={request ? 'Edit maintenance request' : 'New maintenance request'}
      subtitle={request ? request.code : 'Log a tenant issue and dispatch a vendor'}
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
      <form
        className="grid gap-4 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="Unit / tenancy" required error={errors.tenancyId} className="sm:col-span-2">
          {(id) => <Select id={id} name="tenancy" value={form.tenancyId} onChange={(e) => set('tenancyId', e.target.value)} options={units.map((t) => ({ value: t.id, label: `${t.code} · ${t.unit}` }))} placeholder="Select unit…" aria-invalid={!!errors.tenancyId} />}
        </Field>
        <Field label="Issue" required error={errors.title} className="sm:col-span-2">
          {(id) => <Input id={id} name="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. AC not cooling in master bedroom" aria-invalid={!!errors.title} />}
        </Field>
        <Field label="Category">{(id) => <Select id={id} name="category" value={form.category} onChange={(e) => set('category', e.target.value as MaintenanceCategory)} options={optionsOf(MAINTENANCE_CATEGORY)} />}</Field>
        <Field label="Priority">{(id) => <Select id={id} name="priority" value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)} options={optionsOf(PRIORITY)} />}</Field>
        <Field label="Status">{(id) => <Select id={id} name="status" value={form.status} onChange={(e) => setStatus(e.target.value as MaintenanceStatus)} options={optionsOf(MAINTENANCE_STATUS)} />}</Field>
        <Field label="Vendor" error={errors.vendorId}>
          {(id) => <Select id={id} name="vendor" value={form.vendorId ?? ''} onChange={(e) => set('vendorId', e.target.value || null)} options={maintenanceVendors.map((v) => ({ value: v.id, label: v.name }))} placeholder="Not assigned" aria-invalid={!!errors.vendorId} />}
        </Field>
        <Field label="Reported">{(id) => <Input id={id} type="date" value={form.reportedAt} onChange={(e) => set('reportedAt', e.target.value)} />}</Field>
        <Field label="Scheduled visit" error={errors.scheduledAt}>
          {(id) => <Input id={id} type="date" min={form.reportedAt} value={form.scheduledAt ?? ''} onChange={(e) => set('scheduledAt', e.target.value || null)} aria-invalid={!!errors.scheduledAt} />}
        </Field>
        {form.status === 'completed' && (
          <Field label="Completed">{(id) => <Input id={id} type="date" value={form.completedAt ?? ''} onChange={(e) => set('completedAt', e.target.value || null)} />}</Field>
        )}
        <Field label="Cost (AED)" error={errors.cost} hint="Billed to the landlord">
          {(id) => <Input id={id} type="number" min={0} step={50} value={form.cost} onChange={(e) => set('cost', Number(e.target.value))} aria-invalid={!!errors.cost} />}
        </Field>
        <Field label="Details" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Access instructions, tenant availability…" />}
        </Field>
      </form>
    </Drawer>
  )
}
