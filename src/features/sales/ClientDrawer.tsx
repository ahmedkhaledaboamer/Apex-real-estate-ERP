import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { CUSTOMER_TYPE, optionsOf } from '@/lib/labels'
import { customers, DEVELOPERS } from '@/mocks/core'
import type { Customer, CustomerType } from '@/types/core'
import { brokerOptions, nextCode } from './shared'
import { materializeSeeds } from '@/mocks/sales'

type Form = Pick<Customer, 'name' | 'type' | 'email' | 'phone' | 'nationality' | 'city' | 'ownerId' | 'tags'> & { developerSlug: string }

const NATIONALITIES = ['UAE', 'Saudi Arabia', 'Egypt', 'Jordan', 'Lebanon', 'India', 'Pakistan', 'UK', 'Russia', 'Germany', 'France', 'China', 'USA', 'Canada', 'Italy', 'Other']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const blank = (): Form => ({ name: '', type: 'buyer', email: '', phone: '', nationality: 'UAE', city: 'Dubai', ownerId: 'emp-2', tags: [], developerSlug: '' })

export function ClientDrawer({ open, onClose, client, onCreated }: { open: boolean; onClose: () => void; client?: Customer | null; onCreated?: (c: Customer) => void }) {
  const { data: all = [] } = customers.useList()
  const create = customers.useCreate()
  const update = customers.useUpdate()
  const [form, setForm] = useState<Form>(blank)
  const [tag, setTag] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setTag('')
    if (client) setForm({ name: client.name, type: client.type, email: client.email, phone: client.phone, nationality: client.nationality, city: client.city, ownerId: client.ownerId, tags: client.tags, developerSlug: client.developerSlug ?? '' })
    else setForm(blank())
  }, [open, client])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const knownTags = useMemo(() => [...new Set(all.flatMap((c) => c.tags))].sort(), [all])
  const addTag = (t: string) => {
    const v = t.trim()
    if (v && !form.tags.includes(v)) set('tags', [...form.tags, v])
    setTag('')
  }

  const save = () => {
    materializeSeeds()
    const e: typeof errors = {}
    const email = form.email.trim().toLowerCase()
    if (!form.name.trim()) e.name = 'Name is required'
    if (!email) e.email = 'Email is required'
    else if (!EMAIL.test(email)) e.email = 'Invalid email address'
    else {
      const dup = all.find((c) => c.id !== client?.id && c.email.toLowerCase() === email)
      if (dup) e.email = `Already used by ${dup.name} (${dup.code})`
    }
    if (!form.phone.trim()) e.phone = 'Phone is required'
    else if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Phone number looks too short'
    if (form.type === 'developer' && !form.developerSlug) e.developerSlug = 'Choose the developer'
    if (!form.ownerId) e.ownerId = 'Assign a broker'
    setErrors(e)
    if (Object.keys(e).length) return
    const { developerSlug, ...rest } = form
    const data = { ...rest, name: form.name.trim(), email, phone: form.phone.trim(), city: form.city.trim() || 'Dubai', ...(form.type === 'developer' ? { developerSlug } : {}) }
    if (client) update.mutate({ id: client.id, patch: data }, { onSuccess: onClose })
    else
      create.mutate(
        { ...data, code: nextCode('CL', all, 0), createdAt: new Date().toISOString(), avatarHue: Math.floor(Math.random() * 360) },
        {
          onSuccess: (c) => {
            onClose()
            onCreated?.(c)
          },
        },
      )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={client ? `Edit ${client.name}` : 'New client'}
      subtitle={client ? client.code : 'Buyer, seller, landlord, tenant, investor or developer'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {client ? 'Save changes' : 'Create client'}
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
        <Field label="Full name / company" required error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} autoFocus />}
        </Field>
        <Field label="Type" required>
          {(id) => <Select id={id} value={form.type} onChange={(e) => set('type', e.target.value as CustomerType)} options={optionsOf(CUSTOMER_TYPE)} />}
        </Field>
        {form.type === 'developer' ? (
          <Field label="Developer" required error={errors.developerSlug}>
            {(id) => <Select id={id} value={form.developerSlug} onChange={(e) => set('developerSlug', e.target.value)} placeholder="Choose…" options={DEVELOPERS.map((d) => ({ value: d.slug, label: d.name }))} aria-invalid={!!errors.developerSlug} />}
          </Field>
        ) : (
          <Field label="Owner broker" required error={errors.ownerId}>
            {(id) => <Select id={id} value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)} placeholder="Assign…" options={brokerOptions()} aria-invalid={!!errors.ownerId} />}
          </Field>
        )}
        <Field label="Email" required error={errors.email}>
          {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@mail.com" aria-invalid={!!errors.email} />}
        </Field>
        <Field label="Phone" required error={errors.phone}>
          {(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971 50 123 4567" aria-invalid={!!errors.phone} />}
        </Field>
        <Field label="Nationality">{(id) => <Select id={id} value={form.nationality} onChange={(e) => set('nationality', e.target.value)} options={(NATIONALITIES.includes(form.nationality) ? NATIONALITIES : [form.nationality, ...NATIONALITIES]).map((n) => ({ value: n, label: n }))} />}</Field>
        <Field label="City of residence">{(id) => <Input id={id} value={form.city} onChange={(e) => set('city', e.target.value)} />}</Field>
        {form.type === 'developer' && (
          <Field label="Account manager" required error={errors.ownerId}>
            {(id) => <Select id={id} value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)} placeholder="Assign…" options={brokerOptions()} aria-invalid={!!errors.ownerId} />}
          </Field>
        )}
        <Field label="Tags" className="sm:col-span-2" hint="Press Enter to add">
          {(id) => (
            <div className="space-y-2">
              <Input
                id={id}
                list="client-tags"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag(tag)
                  }
                }}
                onBlur={() => tag && addTag(tag)}
                placeholder="e.g. Golden Visa, Cash buyer"
              />
              <datalist id="client-tags">
                {knownTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-aura/10 py-0.5 ps-2.5 pe-1 text-[12px] font-semibold text-aura dark:text-[#d6a8e3]">
                      {t}
                      <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-aura/15" aria-label={`Remove ${t}`}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>
      </form>
    </Drawer>
  )
}
