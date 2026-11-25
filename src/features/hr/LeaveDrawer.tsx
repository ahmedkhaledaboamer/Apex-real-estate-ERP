import { CalendarRange } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { cn } from '@/lib/cn'
import { optionsOf } from '@/lib/labels'
import { code } from '@/lib/random'
import { employees } from '@/mocks/core'
import { leaveRequests, shiftWorkingDays, todayIso, workingDaysBetween } from '@/mocks/hr'
import type { LeaveType } from '@/types/hr'
import { DEDUCTS_BALANCE, LEAVE_TYPE } from './labels'

interface Form {
  employeeId: string
  type: LeaveType
  from: string
  to: string
  reason: string
}

export function LeaveDrawer({ open, onClose, employeeId }: { open: boolean; onClose: () => void; employeeId?: string }) {
  const { data: emps = [] } = employees.useList()
  const { data: all = [] } = leaveRequests.useList()
  const create = leaveRequests.useCreate()
  const blank = (): Form => {
    const from = shiftWorkingDays(todayIso(), 5)
    return { employeeId: employeeId ?? '', type: 'annual', from, to: shiftWorkingDays(from, 2), reason: '' }
  }
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(blank())
      setErrors({})
    }
  }, [open, employeeId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const days = workingDaysBetween(form.from, form.to)
  const emp = emps.find((e) => e.id === form.employeeId)
  const deducts = DEDUCTS_BALANCE.includes(form.type)
  const overBalance = !!emp && deducts && days > emp.leaveBalance
  const overlap = useMemo(
    () => all.find((l) => l.employeeId === form.employeeId && l.status !== 'rejected' && l.from <= form.to && form.from <= l.to),
    [all, form.employeeId, form.from, form.to],
  )

  const options = useMemo(() => emps.filter((e) => e.status !== 'terminated').sort((a, b) => a.name.localeCompare(b.name)).map((e) => ({ value: e.id, label: e.name })), [emps])

  const save = () => {
    const e: typeof errors = {}
    if (!form.employeeId) e.employeeId = 'Choose an employee'
    if (!form.from) e.from = 'Start date is required'
    if (!form.to) e.to = 'End date is required'
    else if (form.to < form.from) e.to = 'End date is before the start date'
    else if (days === 0) e.to = 'The range has no working days'
    if (!form.reason.trim()) e.reason = 'Add a short reason'
    setErrors(e)
    if (Object.keys(e).length) return
    const manager = emp?.managerId ?? 'emp-6'
    create.mutate(
      {
        code: code('LV', all.length + 1),
        employeeId: form.employeeId,
        type: form.type,
        from: form.from,
        to: form.to,
        days,
        reason: form.reason.trim(),
        status: 'pending',
        approverId: manager,
        requestedAt: new Date().toISOString(),
        decidedAt: null,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New leave request"
      subtitle="Working days are counted Monday to Friday"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending}>
            Submit request
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee" required error={errors.employeeId} className="sm:col-span-2">
          {(id) => <Select id={id} value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} options={options} placeholder="Select employee…" aria-invalid={!!errors.employeeId} />}
        </Field>
        <Field label="Leave type" required className="sm:col-span-2">
          {(id) => <Select id={id} value={form.type} onChange={(e) => set('type', e.target.value as LeaveType)} options={optionsOf(LEAVE_TYPE)} />}
        </Field>
        <Field label="From" required error={errors.from}>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to }))}
              aria-invalid={!!errors.from}
            />
          )}
        </Field>
        <Field label="To" required error={errors.to}>
          {(id) => <Input id={id} type="date" min={form.from} value={form.to} onChange={(e) => set('to', e.target.value)} aria-invalid={!!errors.to} />}
        </Field>

        <div className={cn('flex items-center gap-3 rounded-xl border p-3.5 sm:col-span-2', overBalance ? 'border-danger/30 bg-danger/5' : 'border-line bg-surface-2/60')}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-aura/10 text-aura dark:text-[#d6a8e3]">
            <CalendarRange className="size-5" />
          </span>
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-semibold">
              <span className="tabular">{days}</span> working {days === 1 ? 'day' : 'days'}
            </p>
            <p className="text-muted">
              {emp ? (
                deducts ? (
                  <>
                    Balance {emp.leaveBalance} → <span className={cn('font-semibold tabular', overBalance ? 'text-danger' : 'text-fg')}>{emp.leaveBalance - days}</span> days after approval
                  </>
                ) : (
                  `${LEAVE_TYPE[form.type][0]} leave is not deducted from the annual balance`
                )
              ) : (
                'Select an employee to see their balance'
              )}
            </p>
          </div>
        </div>
        {overlap && (
          <p className="rounded-xl bg-warning/10 px-3.5 py-2.5 text-[12.5px] text-[#b06d0f] sm:col-span-2 dark:text-[#f0b25a]">
            Overlaps with an existing {overlap.status} request ({overlap.code}, {overlap.from} → {overlap.to}).
          </p>
        )}

        <Field label="Reason" required error={errors.reason} className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="e.g. Family vacation" aria-invalid={!!errors.reason} />}
        </Field>
      </div>
    </Drawer>
  )
}
