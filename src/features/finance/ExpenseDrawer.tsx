import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { formatMoney } from '@/lib/format'
import { optionsOf, PAYMENT_METHOD } from '@/lib/labels'
import { CURRENT_USER_ID, suppliers } from '@/mocks/core'
import { accounts, expenses } from '@/mocks/finance'
import type { PaymentMethod } from '@/types/domain'
import type { Expense, ExpenseCategory } from '@/types/finance'
import { EXPENSE_CATEGORY } from './labels'
import { expenseGross, nextNumber, todayIso } from './lib'

type Draft = Omit<Expense, 'id' | 'number'>
const SUPPLIER_CATEGORY_MAP: Record<string, ExpenseCategory> = { portal: 'portals', marketing: 'advertising', photography: 'media', conveyancing: 'conveyancing', legal: 'legal', office: 'rent', it: 'software', maintenance: 'office', mortgage: 'legal' }
const blank = (): Draft => ({ date: todayIso(), category: 'office', supplierId: null, payee: '', description: '', amount: 0, vatRate: 5, status: 'pending', accountId: 'acc-enbd', method: 'bank-transfer', reference: '', submittedById: CURRENT_USER_ID, approvedById: null, paidAt: null, recurring: false, notes: '' })

export function ExpenseDrawer({ open, onClose, expense }: { open: boolean; onClose: () => void; expense?: Expense | null }) {
  const { data: vendors } = suppliers.useList()
  const { data: accs } = accounts.useList()
  const create = expenses.useCreate()
  const update = expenses.useUpdate()
  const [f, setF] = useState<Draft>(blank)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setTried(false)
    if (expense) {
      const { id: _i, number: _n, ...rest } = expense
      setF(rest)
    } else setF(blank())
  }, [open, expense])

  const vendorOptions = useMemo(() => (vendors ?? []).filter((v) => v.active).map((v) => ({ value: v.id, label: v.name })), [vendors])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((s) => ({ ...s, [k]: v }))
  const errors = {
    payee: !f.payee.trim() ? 'Who is being paid?' : undefined,
    description: !f.description.trim() ? 'Describe the expense' : undefined,
    amount: !(f.amount > 0) ? 'Enter an amount' : undefined,
    date: !f.date ? 'Required' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean)
  const save = () => {
    setTried(true)
    if (!valid) return
    const data = { ...f, payee: f.payee.trim(), description: f.description.trim() }
    if (expense) update.mutate({ id: expense.id, patch: data }, { onSuccess: onClose })
    else create.mutate({ ...data, number: nextNumber(expenses.collection.all().map((e) => e.number), 'EXP') }, { onSuccess: onClose })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={expense ? `Edit ${expense.number}` : 'New expense'}
      subtitle={expense ? expense.payee : 'Submitted for approval by the Finance Manager'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {expense ? 'Save changes' : 'Submit expense'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vendor" hint="Optional — registered vendors">
          {(id) => (
            <Select
              id={id}
              value={f.supplierId ?? ''}
              onChange={(e) => {
                const v = (vendors ?? []).find((x) => x.id === e.target.value)
                setF((s) => ({ ...s, supplierId: v?.id ?? null, payee: v ? v.name.replace(/ \(.*\)$/, '') : s.payee, category: v ? (SUPPLIER_CATEGORY_MAP[v.category] ?? s.category) : s.category }))
              }}
              placeholder="Other payee"
              options={vendorOptions}
            />
          )}
        </Field>
        <Field label="Payee" required error={tried ? errors.payee : undefined}>
          {(id) => <Input id={id} value={f.payee} onChange={(e) => set('payee', e.target.value)} placeholder="e.g. Dubai Land Department" aria-invalid={tried && !!errors.payee} />}
        </Field>
        <Field label="Category" required>
          {(id) => <Select id={id} value={f.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)} options={optionsOf(EXPENSE_CATEGORY)} />}
        </Field>
        <Field label="Bill date" required error={tried ? errors.date : undefined}>
          {(id) => <Input id={id} type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />}
        </Field>
        <Field label="Description" required className="sm:col-span-2" error={tried ? errors.description : undefined}>
          {(id) => <Input id={id} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Trakheesi advertising permits × 6" aria-invalid={tried && !!errors.description} />}
        </Field>
        <Field label="Amount excl. VAT (AED)" required error={tried ? errors.amount : undefined}>
          {(id) => <Input id={id} type="number" min={0} step="0.01" value={f.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} aria-invalid={tried && !!errors.amount} />}
        </Field>
        <Field label="VAT" hint={`Total ${formatMoney(expenseGross(f), { decimals: true })}`}>
          {(id) => <Select id={id} value={String(f.vatRate)} onChange={(e) => set('vatRate', Number(e.target.value))} options={[{ value: '5', label: '5% (standard)' }, { value: '0', label: '0% / exempt (salaries, government fees)' }]} />}
        </Field>
        <Field label="Pay from">
          {(id) => <Select id={id} value={f.accountId} onChange={(e) => set('accountId', e.target.value)} options={(accs ?? []).filter((a) => !a.clientMoney && a.kind !== 'card-clearing').map((a) => ({ value: a.id, label: `${a.name} · ${a.bank}` }))} />}
        </Field>
        <Field label="Method">
          {(id) => <Select id={id} value={f.method} onChange={(e) => set('method', e.target.value as PaymentMethod)} options={optionsOf(PAYMENT_METHOD)} />}
        </Field>
        <Field label="Vendor invoice / receipt no.">
          {(id) => <Input id={id} value={f.reference} onChange={(e) => set('reference', e.target.value)} />}
        </Field>
        <div className="flex items-end pb-2">
          <Switch checked={f.recurring} onChange={(v) => set('recurring', v)} label="Recurring monthly" />
        </div>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-[72px]" />}
        </Field>
      </div>
    </Drawer>
  )
}
