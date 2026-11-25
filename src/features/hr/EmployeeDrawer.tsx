import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { optionsOf } from '@/lib/labels'
import { code, dateFromNow } from '@/lib/random'
import { COMMUNITIES, DEPARTMENTS, employees } from '@/mocks/core'
import type { DepartmentId, Employee, EmploymentStatus } from '@/types/core'
import { isBrokerDept } from './broker'
import { EMPLOYMENT_STATUS } from './labels'

type Form = Omit<Employee, 'id' | 'code' | 'avatarHue'>

const empty = (): Form => ({
  name: '',
  email: '',
  phone: '+971 5',
  title: '',
  departmentId: 'sales',
  managerId: 'emp-2',
  status: 'probation',
  joinDate: dateFromNow(0),
  nationality: 'UAE',
  salary: 9000,
  allowances: 2500,
  leaveBalance: 30,
  photo: undefined,
  brn: '',
  reraExpiry: dateFromNow(365),
  commissionSplit: 50,
  languages: ['English'],
  communities: [],
})

const LANGUAGES = ['English', 'Arabic', 'Hindi', 'Urdu', 'Russian', 'French', 'Mandarin', 'German', 'Persian', 'Tagalog', 'Spanish', 'Italian']

const NATIONALITIES = ['UAE', 'Egypt', 'Jordan', 'India', 'Pakistan', 'Philippines', 'Lebanon', 'UK', 'Russia', 'Germany', 'France', 'China', 'Syria', 'Saudi Arabia', 'Other']

export function EmployeeDrawer({ open, onClose, employee, onSaved }: { open: boolean; onClose: () => void; employee?: Employee | null; onSaved?: (e: Employee) => void }) {
  const { data: all = [] } = employees.useList()
  const create = employees.useCreate()
  const update = employees.useUpdate()
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (employee) {
      const { id: _id, code: _code, avatarHue: _hue, ...rest } = employee
      setForm({ ...rest, brn: rest.brn ?? '', reraExpiry: rest.reraExpiry ?? dateFromNow(365), commissionSplit: rest.commissionSplit ?? 50, languages: rest.languages ?? [], communities: rest.communities ?? [] })
    } else setForm(empty())
  }, [open, employee])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggle = (k: 'languages' | 'communities', v: string) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }))
  const broker = isBrokerDept(form.departmentId)

  const managers = useMemo(
    () =>
      all
        .filter((e) => e.id !== employee?.id && e.status !== 'terminated')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({ value: e.id, label: `${e.name} — ${e.title}` })),
    [all, employee],
  )

  const onDepartment = (d: DepartmentId) => {
    const head = DEPARTMENTS.find((x) => x.id === d)?.headId
    setForm((f) => ({ ...f, departmentId: d, managerId: head && head !== employee?.id ? head : f.managerId }))
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.title.trim()) e.title = 'Job title is required'
    if (!form.joinDate) e.joinDate = 'Join date is required'
    if (!(form.salary > 0)) e.salary = 'Salary must be greater than 0'
    if (form.allowances < 0) e.allowances = 'Cannot be negative'
    if (broker) {
      if (!/^\d{4,6}$/.test(form.brn ?? '')) e.brn = 'BRN is a 4–6 digit RERA number'
      if (!form.reraExpiry) e.reraExpiry = 'RERA card expiry is required'
      const split = form.commissionSplit ?? -1
      if (!(split >= 0 && split <= 100)) e.commissionSplit = 'Between 0 and 100%'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) return
    const data: Form = broker
      ? { ...form, name: form.name.trim(), title: form.title.trim(), brn: (form.brn ?? '').trim() }
      : { ...form, name: form.name.trim(), title: form.title.trim(), brn: null, reraExpiry: null, commissionSplit: null, communities: [] }
    if (employee) {
      update.mutate({ id: employee.id, patch: data }, { onSuccess: (e) => (onSaved?.(e), onClose()) })
    } else {
      const n = all.length + 1
      create.mutate({ ...data, code: code('EMP', n, 3), avatarHue: Math.floor(Math.random() * 360) }, { onSuccess: (e) => (onSaved?.(e), onClose()) })
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={employee ? `Edit ${employee.name}` : 'New employee'}
      subtitle={employee ? employee.code : 'Add a team member to the directory and payroll'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {employee ? 'Save changes' : 'Create employee'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <section>
          <h3 className="mb-3 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Personal</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name} className="sm:col-span-2">
              {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} placeholder="e.g. Sara Mansour" autoFocus />}
            </Field>
            <Field label="Work email" required error={errors.email}>
              {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} placeholder="name@apexaora.ae" />}
            </Field>
            <Field label="Mobile">{(id) => <Input id={id} value={form.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>
            <Field label="Nationality">{(id) => <Select id={id} value={form.nationality} onChange={(e) => set('nationality', e.target.value)} options={NATIONALITIES.map((n) => ({ value: n, label: n }))} />}</Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Job</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" required error={errors.title}>
              {(id) => <Input id={id} value={form.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} placeholder="e.g. Property Consultant" />}
            </Field>
            <Field label="Department" required>
              {(id) => <Select id={id} value={form.departmentId} onChange={(e) => onDepartment(e.target.value as DepartmentId)} options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))} />}
            </Field>
            <Field label="Reports to">
              {(id) => <Select id={id} value={form.managerId ?? ''} onChange={(e) => set('managerId', e.target.value || null)} options={managers} placeholder="No manager" />}
            </Field>
            <Field label="Status" required>
              {(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as EmploymentStatus)} options={optionsOf(EMPLOYMENT_STATUS)} />}
            </Field>
            <Field label="Join date" required error={errors.joinDate}>
              {(id) => <Input id={id} type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} aria-invalid={!!errors.joinDate} />}
            </Field>
            <Field label="Leave balance" hint="Annual leave days remaining">
              {(id) => <Input id={id} type="number" min={0} value={form.leaveBalance} onChange={(e) => set('leaveBalance', Number(e.target.value))} />}
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Languages</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LANGUAGES.map((l) => (
              <Checkbox key={l} label={l} checked={form.languages.includes(l)} onChange={() => toggle('languages', l)} />
            ))}
          </div>
        </section>

        {broker && (
          <section>
            <h3 className="mb-3 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Broker licence (RERA)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="BRN" required error={errors.brn} hint="Broker Registration Number">
                {(id) => <Input id={id} inputMode="numeric" value={form.brn ?? ''} onChange={(e) => set('brn', e.target.value)} aria-invalid={!!errors.brn} placeholder="e.g. 48213" />}
              </Field>
              <Field label="RERA card expiry" required error={errors.reraExpiry}>
                {(id) => <Input id={id} type="date" value={form.reraExpiry ?? ''} onChange={(e) => set('reraExpiry', e.target.value)} aria-invalid={!!errors.reraExpiry} />}
              </Field>
              <Field label="Commission split (%)" required error={errors.commissionSplit} hint="Broker's share of the agency commission">
                {(id) => <Input id={id} type="number" min={0} max={100} step={5} value={form.commissionSplit ?? ''} onChange={(e) => set('commissionSplit', Number(e.target.value))} aria-invalid={!!errors.commissionSplit} />}
              </Field>
            </div>
            <p className="mt-4 mb-2 text-[13px] font-medium">Specialist communities</p>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {COMMUNITIES.map((c) => (
                <Checkbox key={c.slug} label={c.name} checked={form.communities.includes(c.slug)} onChange={() => toggle('communities', c.slug)} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Compensation (monthly, AED)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Basic salary" required error={errors.salary}>
              {(id) => <Input id={id} type="number" min={0} step={250} value={form.salary} onChange={(e) => set('salary', Number(e.target.value))} aria-invalid={!!errors.salary} />}
            </Field>
            <Field label="Allowances" error={errors.allowances} hint="Housing, transport and other">
              {(id) => <Input id={id} type="number" min={0} step={100} value={form.allowances} onChange={(e) => set('allowances', Number(e.target.value))} aria-invalid={!!errors.allowances} />}
            </Field>
          </div>
          <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px] text-muted">
            Monthly gross <span className="font-semibold text-fg tabular">AED {(form.salary + form.allowances).toLocaleString('en-US')}</span> · annual{' '}
            <span className="font-semibold text-fg tabular">AED {((form.salary + form.allowances) * 12).toLocaleString('en-US')}</span>
            {broker && <> · plus {form.commissionSplit ?? 0}% of the commission on every deal closed</>}
          </p>
        </section>
        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}
