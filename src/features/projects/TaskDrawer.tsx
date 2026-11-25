import { Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form'
import { ConfirmDialog, Drawer } from '@/components/ui/Overlay'
import { formatDateTime } from '@/lib/format'
import { optionsOf, PRIORITY } from '@/lib/labels'
import { code, dateFromNow } from '@/lib/random'
import { CURRENT_USER_ID, employees } from '@/mocks/core'
import { projects, tasks } from '@/mocks/projects'
import type { Priority } from '@/types/domain'
import type { ChecklistItem, Task, TaskStatus } from '@/types/projects'
import { TASK_STATUS } from './labels'

type Form = Pick<Task, 'title' | 'description' | 'projectId' | 'assigneeId' | 'status' | 'priority' | 'dueDate' | 'checklist'> & { tags: string }

export function TaskDrawer({ open, onClose, task, defaults }: { open: boolean; onClose: () => void; task?: Task | null; defaults?: Partial<Pick<Task, 'projectId' | 'assigneeId' | 'status'>> }) {
  const { data: emps = [] } = employees.useList()
  const { data: projs = [] } = projects.useList()
  const { data: all = [] } = tasks.useList()
  const create = tasks.useCreate()
  const update = tasks.useUpdate()
  const remove = tasks.useRemove()
  const [form, setForm] = useState<Form>(() => blank())
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({})
  const [newItem, setNewItem] = useState('')
  const [confirm, setConfirm] = useState(false)

  function blank(): Form {
    return { title: '', description: '', projectId: defaults?.projectId ?? null, assigneeId: defaults?.assigneeId ?? CURRENT_USER_ID, status: defaults?.status ?? 'todo', priority: 'medium', dueDate: dateFromNow(3), checklist: [], tags: '' }
  }

  useEffect(() => {
    if (!open) return
    setErrors({})
    setNewItem('')
    setForm(task ? { title: task.title, description: task.description, projectId: task.projectId, assigneeId: task.assigneeId, status: task.status, priority: task.priority, dueDate: task.dueDate, checklist: task.checklist, tags: task.tags.join(', ') } : blank())
  }, [open, task])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const people = useMemo(() => emps.filter((e) => e.status !== 'terminated').sort((a, b) => a.name.localeCompare(b.name)).map((e) => ({ value: e.id, label: e.name })), [emps])
  const projectOptions = useMemo(() => projs.map((p) => ({ value: p.id, label: p.name })), [projs])

  const addItem = () => {
    const text = newItem.trim()
    if (!text) return
    set('checklist', [...form.checklist, { id: `ck-${Date.now().toString(36)}`, text, done: false }])
    setNewItem('')
  }
  const patchItem = (id: string, patch: Partial<ChecklistItem>) => set('checklist', form.checklist.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const save = () => {
    const e: typeof errors = {}
    if (!form.title.trim()) e.title = 'Give the task a title'
    if (!form.dueDate) e.dueDate = 'Pick a due date'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = {
      ...form,
      title: form.title.trim(),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      completedAt: form.status === 'done' ? (task?.completedAt ?? new Date().toISOString()) : null,
    }
    if (task) update.mutate({ id: task.id, patch: data }, { onSuccess: onClose })
    else create.mutate({ ...data, code: code('TSK', all.length + 1), comments: 0, createdAt: new Date().toISOString() }, { onSuccess: onClose })
  }

  const done = form.checklist.filter((c) => c.done).length
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      subtitle={task ? `${task.code} · created ${formatDateTime(task.createdAt)}` : 'Assign work and set a due date'}
      footer={
        <>
          {task && (
            <Button variant="ghost" className="me-auto text-danger hover:bg-danger/10 hover:text-danger" icon={<Trash2 />} onClick={() => setConfirm(true)}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {task ? 'Save changes' : 'Create task'}
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
        <Field label="Title" required error={errors.title} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Renew Trakheesi permit for AA-S-2714" aria-invalid={!!errors.title} autoFocus />}
        </Field>
        <Field label="Description" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Add details, links or context…" className="min-h-[80px]" />}
        </Field>
        <Field label="Project" className="sm:col-span-2">
          {(id) => <Select id={id} value={form.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)} options={projectOptions} placeholder="No project (general)" />}
        </Field>
        <Field label="Assignee" required>
          {(id) => <Select id={id} value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)} options={people} />}
        </Field>
        <Field label="Due date" required error={errors.dueDate}>
          {(id) => <Input id={id} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} aria-invalid={!!errors.dueDate} />}
        </Field>
        <Field label="Status">
          {(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)} options={optionsOf(TASK_STATUS)} />}
        </Field>
        <Field label="Priority">
          {(id) => <Select id={id} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)} options={optionsOf(PRIORITY)} />}
        </Field>
        <Field label="Tags" hint="Separate with commas" className="sm:col-span-2">
          {(id) => <Input id={id} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Listings, RERA" />}
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-fg/85">Checklist</span>
            {form.checklist.length > 0 && (
              <span className="text-[12px] text-muted tabular">
                {done}/{form.checklist.length} done
              </span>
            )}
          </div>
          {form.checklist.length > 0 && (
            <ul className="mb-2 divide-y divide-line rounded-xl border border-line">
              {form.checklist.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                  <Checkbox checked={c.done} onChange={(e) => patchItem(c.id, { done: e.target.checked })} aria-label={c.text} />
                  <input
                    value={c.text}
                    onChange={(e) => patchItem(c.id, { text: e.target.value })}
                    className={`min-w-0 flex-1 bg-transparent text-[13.5px] outline-none ${c.done ? 'text-muted line-through' : ''}`}
                    aria-label="Checklist item"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => set('checklist', form.checklist.filter((x) => x.id !== c.id))} aria-label={`Remove ${c.text}`}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addItem()
                }
              }}
              placeholder="Add a subtask…"
              aria-label="New checklist item"
            />
            <Button variant="outline" icon={<Plus />} onClick={addItem} disabled={!newItem.trim()}>
              Add
            </Button>
          </div>
        </div>
        <button type="submit" hidden />
      </form>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={remove.isPending}
        title="Delete this task?"
        message={`“${task?.title}” will be removed permanently.`}
        onConfirm={() =>
          task &&
          remove.mutate(task.id, {
            onSuccess: () => {
              setConfirm(false)
              onClose()
            },
          })
        }
      />
    </Drawer>
  )
}
