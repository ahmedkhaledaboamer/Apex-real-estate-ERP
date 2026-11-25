import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { OFFPLAN_STATUS, optionsOf } from '@/lib/labels'
import { COMMUNITIES, DEVELOPERS } from '@/mocks/core'
import { offplanProjects } from '@/mocks/domain'
import type { OffPlanProject, OffPlanStatus } from '@/types/domain'
import { ImagePicker, PHOTO_LIBRARY } from './shared'

type Form = Omit<OffPlanProject, 'id'>

const blank = (): Form => ({
  name: '',
  developerSlug: DEVELOPERS[0]!.slug,
  communitySlug: COMMUNITIES[0]!.slug,
  image: PHOTO_LIBRARY.find((p) => p.key === 'offplanTower')!.src,
  handover: `Q4 ${new Date().getFullYear() + 2}`,
  fromPrice: 0,
  plan: '60/40',
  status: 'launching',
  totalUnits: 200,
  allocated: 20,
  commissionRate: 5,
})

export function OffplanDrawer({ open, onClose, project, onCreated }: { open: boolean; onClose: () => void; project?: OffPlanProject | null; onCreated?: (p: OffPlanProject) => void }) {
  const create = offplanProjects.useCreate()
  const update = offplanProjects.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (project) {
      const { id: _id, ...rest } = project
      setForm(rest)
    } else setForm(blank())
  }, [open, project])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }

  const save = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Project name is required'
    if (!(form.fromPrice > 0)) e.fromPrice = 'Enter the starting price'
    if (!/^\d{1,2}\s*\/\s*\d{1,2}$/.test(form.plan.trim()) || form.plan.split('/').reduce((a, n) => a + Number(n), 0) !== 100) e.plan = 'Use “during / on handover”, e.g. 60/40 (adds up to 100)'
    if (!form.handover.trim()) e.handover = 'Required'
    if (!(form.totalUnits > 0)) e.totalUnits = 'Enter the number of units'
    if (form.allocated < 0 || form.allocated > form.totalUnits) e.allocated = 'Between 0 and total units'
    if (!(form.commissionRate > 0 && form.commissionRate <= 12)) e.commissionRate = '0–12%'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { ...form, name: form.name.trim(), plan: form.plan.replace(/\s/g, '') }
    if (project) update.mutate({ id: project.id, patch: data }, { onSuccess: onClose })
    else
      create.mutate(data, {
        onSuccess: (p) => {
          onClose()
          onCreated?.(p)
        },
      })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={project ? 'Edit project' : 'New off-plan project'}
      subtitle={project ? project.name : 'Developer launch the agency is allocated units in'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {project ? 'Save changes' : 'Create project'}
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
        <Field label="Project name" required error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Aurelia Residences" aria-invalid={!!errors.name} autoFocus />}
        </Field>
        <Field label="Developer" required>
          {(id) => <Select id={id} value={form.developerSlug} onChange={(e) => set('developerSlug', e.target.value)} options={DEVELOPERS.map((d) => ({ value: d.slug, label: d.name }))} />}
        </Field>
        <Field label="Community" required>
          {(id) => <Select id={id} value={form.communitySlug} onChange={(e) => set('communitySlug', e.target.value)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}
        </Field>
        <Field label="Status">{(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as OffPlanStatus)} options={optionsOf(OFFPLAN_STATUS)} />}</Field>
        <Field label="Handover" required error={errors.handover} hint="e.g. Q2 2029 or Ready">
          {(id) => <Input id={id} value={form.handover} onChange={(e) => set('handover', e.target.value)} aria-invalid={!!errors.handover} />}
        </Field>
        <Field label="Starting price (AED)" required error={errors.fromPrice}>
          {(id) => <Input id={id} type="number" min={0} step={10000} value={form.fromPrice || ''} onChange={(e) => set('fromPrice', Number(e.target.value))} aria-invalid={!!errors.fromPrice} />}
        </Field>
        <Field label="Payment plan" required error={errors.plan} hint="During construction / on handover">
          {(id) => <Input id={id} value={form.plan} onChange={(e) => set('plan', e.target.value)} placeholder="60/40" aria-invalid={!!errors.plan} />}
        </Field>
        <Field label="Total units" required error={errors.totalUnits}>
          {(id) => <Input id={id} type="number" min={1} value={form.totalUnits || ''} onChange={(e) => set('totalUnits', Number(e.target.value))} aria-invalid={!!errors.totalUnits} />}
        </Field>
        <Field label="Units allocated to us" error={errors.allocated}>
          {(id) => <Input id={id} type="number" min={0} value={form.allocated} onChange={(e) => set('allocated', Number(e.target.value))} aria-invalid={!!errors.allocated} />}
        </Field>
        <Field label="Developer commission (%)" required error={errors.commissionRate}>
          {(id) => <Input id={id} type="number" min={0} max={12} step={0.5} value={form.commissionRate} onChange={(e) => set('commissionRate', Number(e.target.value))} aria-invalid={!!errors.commissionRate} />}
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-2 text-[12.5px] font-semibold text-fg/85">Project image</p>
          <ImagePicker multiple={false} value={[form.image]} onChange={(v) => set('image', v[0]!)} />
        </div>
      </form>
    </Drawer>
  )
}
