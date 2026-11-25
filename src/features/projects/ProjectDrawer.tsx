import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { cn } from '@/lib/cn'
import { optionsOf, PRIORITY } from '@/lib/labels'
import { code, dateFromNow } from '@/lib/random'
import { COMMUNITIES, CURRENT_USER_ID, departmentById, employees } from '@/mocks/core'
import { offplanProjects } from '@/mocks/domain'
import { PROJECT_COLORS, projects } from '@/mocks/projects'
import type { Priority } from '@/types/domain'
import type { Project, ProjectStatus } from '@/types/projects'
import { PROJECT_STATUS } from './labels'

type Form = Omit<Project, 'id' | 'code' | 'createdAt'>

const blank = (): Form => ({
  name: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  ownerId: CURRENT_USER_ID,
  memberIds: [CURRENT_USER_ID],
  startDate: dateFromNow(0),
  dueDate: dateFromNow(30),
  budget: 20000,
  spent: 0,
  color: PROJECT_COLORS[0]!,
  offplanId: null,
  communitySlug: null,
})

export function ProjectDrawer({ open, onClose, project, onCreated }: { open: boolean; onClose: () => void; project?: Project | null; onCreated?: (p: Project) => void }) {
  const { data: emps = [] } = employees.useList()
  const { data: ops = [] } = offplanProjects.useList()
  const { data: all = [] } = projects.useList()
  const create = projects.useCreate()
  const update = projects.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [memberQ, setMemberQ] = useState('')

  useEffect(() => {
    if (!open) return
    setErrors({})
    setMemberQ('')
    if (project) {
      const { id: _id, code: _code, createdAt: _c, ...rest } = project
      setForm(rest)
    } else setForm(blank())
  }, [open, project])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const people = useMemo(() => emps.filter((e) => e.status !== 'terminated').sort((a, b) => a.name.localeCompare(b.name)), [emps])
  const shown = people.filter((e) => !memberQ || `${e.name} ${e.title}`.toLowerCase().includes(memberQ.toLowerCase()))
  const toggleMember = (id: string) => set('memberIds', form.memberIds.includes(id) ? form.memberIds.filter((m) => m !== id) : [...form.memberIds, id])

  const save = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Project name is required'
    if (!form.startDate) e.startDate = 'Required'
    if (!form.dueDate) e.dueDate = 'Required'
    else if (form.dueDate < form.startDate) e.dueDate = 'Due date is before the start date'
    if (form.budget < 0) e.budget = 'Cannot be negative'
    if (form.spent < 0) e.spent = 'Cannot be negative'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { ...form, name: form.name.trim(), memberIds: form.memberIds.includes(form.ownerId) ? form.memberIds : [form.ownerId, ...form.memberIds] }
    if (project) update.mutate({ id: project.id, patch: data }, { onSuccess: onClose })
    else
      create.mutate(
        { ...data, code: code('PRJ', all.length + 1, 3), createdAt: new Date().toISOString() },
        {
          onSuccess: (p) => {
            onClose()
            onCreated?.(p)
          },
        },
      )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={project ? 'Edit project' : 'New project'}
      subtitle={project ? project.code : 'Launches, listing drives, compliance, internal initiatives'}
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
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="Project name" required error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Creek Harbour launch campaign" aria-invalid={!!errors.name} autoFocus />}
        </Field>
        <Field label="Description" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Goals, scope and key deliverables" />}
        </Field>
        <Field label="Status">{(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as ProjectStatus)} options={optionsOf(PROJECT_STATUS)} />}</Field>
        <Field label="Priority">{(id) => <Select id={id} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)} options={optionsOf(PRIORITY)} />}</Field>
        <Field label="Owner" required>
          {(id) => <Select id={id} value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)} options={people.map((p) => ({ value: p.id, label: p.name }))} />}
        </Field>
        <Field label="Off-plan project" hint="Optional — launches and sell-outs">
          {(id) => (
            <Select
              id={id}
              value={form.offplanId ?? ''}
              onChange={(e) => {
                const op = ops.find((x) => x.id === e.target.value)
                setForm((f) => ({ ...f, offplanId: op?.id ?? null, communitySlug: op ? op.communitySlug : f.communitySlug }))
              }}
              options={[...ops].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ value: o.id, label: o.name }))}
              placeholder="None"
            />
          )}
        </Field>
        <Field label="Community" hint="Optional — area the project targets">
          {(id) => <Select id={id} value={form.communitySlug ?? ''} onChange={(e) => set('communitySlug', e.target.value || null)} options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} placeholder="None" />}
        </Field>
        <Field label="Start date" required error={errors.startDate}>
          {(id) => <Input id={id} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} aria-invalid={!!errors.startDate} />}
        </Field>
        <Field label="Due date" required error={errors.dueDate}>
          {(id) => <Input id={id} type="date" min={form.startDate} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} aria-invalid={!!errors.dueDate} />}
        </Field>
        <Field label="Budget (AED)" error={errors.budget}>
          {(id) => <Input id={id} type="number" min={0} step={500} value={form.budget} onChange={(e) => set('budget', Number(e.target.value))} aria-invalid={!!errors.budget} />}
        </Field>
        <Field label="Spent to date (AED)" error={errors.spent}>
          {(id) => <Input id={id} type="number" min={0} step={100} value={form.spent} onChange={(e) => set('spent', Number(e.target.value))} aria-invalid={!!errors.spent} />}
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-2 text-[12.5px] font-semibold text-fg/85">Colour</p>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={cn('grid size-8 place-items-center rounded-full text-white ring-offset-2 ring-offset-surface transition-shadow', form.color === c && 'ring-2 ring-fg/40')}
                style={{ background: c }}
                aria-label={`Colour ${c}`}
                aria-pressed={form.color === c}
              >
                {form.color === c && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-fg/85">Members</span>
            <span className="text-[12px] text-muted">{form.memberIds.length} selected</span>
          </div>
          <SearchInput value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder="Find people…" aria-label="Find members" />
          <ul className="mt-2 max-h-[240px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {shown.map((e) => {
              const on = form.memberIds.includes(e.id) || e.id === form.ownerId
              return (
                <li key={e.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-2/70">
                    <input type="checkbox" className="size-4 accent-[var(--color-aura)]" checked={on} disabled={e.id === form.ownerId} onChange={() => toggleMember(e.id)} />
                    <Avatar name={e.name} hue={e.avatarHue} photo={e.photo} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{e.name}</span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {e.title} · {departmentById(e.departmentId)?.name}
                      </span>
                    </span>
                    {e.id === form.ownerId && <span className="text-[11px] font-semibold text-aura">Owner</span>}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}
