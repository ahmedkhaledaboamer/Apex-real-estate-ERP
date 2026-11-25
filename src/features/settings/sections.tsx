import { Bell, Database, Download, ImageUp, Lock, Mail, Monitor, Moon, RefreshCcw, Sun, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { LogoMark } from '@/components/layout/Logo'
import { PersonCell } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, Input, Segmented, Select, Switch } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { toast } from '@/components/ui/Toast'
import { resetAllCollections } from '@/api/db'
import { cn } from '@/lib/cn'
import { formatDateTime, formatNumber } from '@/lib/format'
import { optionsOf } from '@/lib/labels'
import { departmentById, employees } from '@/mocks/core'
import { ACTIONS, MODULES, NOTIFICATION_EVENTS, ROLES } from '@/mocks/settings'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme, toggleSidebarCollapsed } from '@/store/uiSlice'
import type { Employee } from '@/types/core'
import type { AppSettings, CompanyProfile, CurrencyCode, PermissionAction, Role, ThemePreference } from '@/types/settings'
import { ACTION_LABEL, CURRENCY, MODULE_LABEL, MONTHS, ROLE, ROLE_DESCRIPTION } from './labels'
import { SectionCard, useDraft, useSettings } from './shared'

type Props = { s: AppSettings }

/* ------------------------------ Company profile ---------------------------- */

export function CompanySection({ s }: Props) {
  const { save, saving } = useSettings()
  const [draft, setDraft, dirty, reset] = useDraft<CompanyProfile>(s.company)
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyProfile, string>>>({})
  const file = useRef<HTMLInputElement>(null)
  if (!draft) return null
  const set = <K extends keyof CompanyProfile>(k: K, v: CompanyProfile[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const onSave = () => {
    const e: typeof errors = {}
    if (!draft.name.trim()) e.name = 'Legal name is required'
    if (!/^\d{15}$/.test(draft.trn)) e.trn = 'UAE TRN is 15 digits'
    if (!/^\d{3,6}$/.test(draft.reraOrn ?? '')) e.reraOrn = 'RERA ORN is 3–6 digits'
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) e.email = 'Enter a valid email'
    setErrors(e)
    if (Object.keys(e).length) return
    save({ company: draft }, 'Company profile saved')
  }
  const onLogo = (f: File | undefined) => {
    if (!f) return
    if (f.size > 300_000) return toast.error('Logo must be smaller than 300 KB')
    const reader = new FileReader()
    reader.onload = () => set('logoDataUrl', String(reader.result))
    reader.readAsDataURL(f)
  }

  return (
    <SectionCard title="Company profile" subtitle="Shown on commission invoices, Form A/B/F, listing ads and payslips" dirty={dirty} saving={saving} onSave={onSave} onReset={reset}>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface-2/50 p-4">
        {draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="Company logo" className="size-16 rounded-xl object-contain" /> : <LogoMark size={64} />}
        <div className="min-w-[160px] flex-1">
          <p className="font-display text-[22px] leading-tight font-semibold">{draft.tradeName || draft.name}</p>
          <p className="text-[12.5px] text-muted">PNG or SVG, square, up to 300 KB</p>
        </div>
        <div className="flex gap-2">
          {draft.logoDataUrl && (
            <Button variant="ghost" size="sm" onClick={() => set('logoDataUrl', undefined)}>
              Remove
            </Button>
          )}
          <Button variant="outline" size="sm" icon={<ImageUp />} onClick={() => file.current?.click()}>
            Upload logo
          </Button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Legal name" required error={errors.name}>
          {(id) => <Input id={id} value={draft.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} />}
        </Field>
        <Field label="Trade name">{(id) => <Input id={id} value={draft.tradeName} onChange={(e) => set('tradeName', e.target.value)} />}</Field>
        <Field label="Tax registration number (TRN)" required error={errors.trn} hint="Federal Tax Authority, 15 digits">
          {(id) => <Input id={id} value={draft.trn} inputMode="numeric" onChange={(e) => set('trn', e.target.value.replace(/\D/g, '').slice(0, 15))} aria-invalid={!!errors.trn} className="tabular" />}
        </Field>
        <Field label="DED trade licence no." hint="Dubai Economy & Tourism">{(id) => <Input id={id} value={draft.licenseNo} onChange={(e) => set('licenseNo', e.target.value)} className="tabular" />}</Field>
        <Field label="RERA ORN" required error={errors.reraOrn} hint="Office Registration Number, printed on ads and Form A/B/F">
          {(id) => <Input id={id} value={draft.reraOrn} inputMode="numeric" onChange={(e) => set('reraOrn', e.target.value.replace(/\D/g, '').slice(0, 6))} aria-invalid={!!errors.reraOrn} className="tabular" />}
        </Field>
        <Field label="Address">
          {(id) => <Input id={id} value={draft.address} onChange={(e) => set('address', e.target.value)} />}
        </Field>
        <Field label="City">{(id) => <Input id={id} value={draft.city} onChange={(e) => set('city', e.target.value)} />}</Field>
        <Field label="Country">{(id) => <Input id={id} value={draft.country} onChange={(e) => set('country', e.target.value)} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} value={draft.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>
        <Field label="Email" required error={errors.email}>
          {(id) => <Input id={id} type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} />}
        </Field>
        <Field label="Website">{(id) => <Input id={id} value={draft.website} onChange={(e) => set('website', e.target.value)} />}</Field>
        <Field label="Fiscal year starts">
          {(id) => <Select id={id} value={String(draft.fiscalYearStart)} onChange={(e) => set('fiscalYearStart', Number(e.target.value))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />}
        </Field>
        <Field label="Base currency" hint="All amounts are stored in AED">
          {(id) => <Select id={id} value="AED" disabled options={[{ value: 'AED', label: 'AED — UAE Dirham' }]} />}
        </Field>
      </div>
    </SectionCard>
  )
}

/* ------------------------------- Users & roles ----------------------------- */

export function UsersSection({ s }: Props) {
  const { save, saving } = useSettings()
  const { data: emps, isLoading } = employees.useList()
  const [roles, setRoles, rolesDirty, resetRoles] = useDraft(s.userRoles)
  const [perms, setPerms, permsDirty, resetPerms] = useDraft(s.permissions)
  const [role, setRole] = useState<Role>('broker')
  const [roleFilter, setRoleFilter] = useState('')

  const rows = useMemo(() => (emps ?? []).filter((e) => e.status !== 'terminated' && (!roleFilter || (roles?.[e.id] ?? 'viewer') === roleFilter)), [emps, roles, roleFilter])
  const counts = useMemo(() => {
    const c = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>
    for (const e of emps ?? []) if (e.status !== 'terminated') c[roles?.[e.id] ?? 'viewer']++
    return c
  }, [emps, roles])
  if (!roles || !perms) return null

  const columns: Column<Employee>[] = [
    { key: 'name', header: 'User', cell: (e) => <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} sub={e.email} />, sort: (e) => e.name },
    { key: 'dept', header: 'Department', cell: (e) => <span className="text-muted">{departmentById(e.departmentId)?.name}</span>, sort: (e) => e.departmentId, hideBelow: 'md' },
    {
      key: 'role',
      header: 'Role',
      cell: (e) => (
        <Select
          value={roles[e.id] ?? 'viewer'}
          onChange={(ev) => setRoles((r) => ({ ...r, [e.id]: ev.target.value as Role }))}
          options={optionsOf(ROLE)}
          className="w-[150px]"
          aria-label={`Role for ${e.name}`}
          disabled={e.id === 'emp-1'}
        />
      ),
      csv: (e) => ROLE[roles[e.id] ?? 'viewer'][0],
    },
    { key: 'access', header: 'Access', cell: (e) => <span className="text-[12.5px] text-muted">{MODULES.filter((m) => perms[roles[e.id] ?? 'viewer'][m].includes('view')).length} of {MODULES.length} modules</span>, hideBelow: 'lg' },
  ]

  const toggle = (m: (typeof MODULES)[number], a: PermissionAction) =>
    setPerms((p) => {
      const cur = p[role][m]
      let next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]
      if (a === 'view' && !next.includes('view')) next = [] // no view → nothing
      if (a !== 'view' && next.includes(a) && !next.includes('view')) next = ['view', ...next]
      return { ...p, [role]: { ...p[role], [m]: next } }
    })

  return (
    <div className="space-y-6">
      <SectionCard title="Users & roles" subtitle={`${rows.length} users · roles control what each person can see and change`} dirty={rolesDirty} saving={saving} onSave={() => save({ userRoles: roles }, 'User roles saved')} onReset={resetRoles} bodyClassName="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRoleFilter('')} className={cn('rounded-full px-3 py-1 text-[12.5px] font-semibold ring-1 ring-line transition-colors', !roleFilter ? 'bg-aura text-white ring-aura' : 'text-muted hover:text-fg')}>
            All
          </button>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(roleFilter === r ? '' : r)}
              className={cn('rounded-full px-3 py-1 text-[12.5px] font-semibold ring-1 ring-line transition-colors', roleFilter === r ? 'bg-aura text-white ring-aura' : 'text-muted hover:text-fg')}
            >
              {ROLE[r][0]} <span className="ms-0.5 opacity-70 tabular">{counts[r]}</span>
            </button>
          ))}
        </div>
        <DataTable rows={rows} columns={columns} loading={isLoading} search={(e) => `${e.name} ${e.email}`} searchPlaceholder="Search users…" pageSize={8} className="shadow-none" />
      </SectionCard>

      <SectionCard title="Permissions" subtitle="What each role can do in every module" dirty={permsDirty} saving={saving} onSave={() => save({ permissions: perms }, 'Permissions saved')} onReset={resetPerms} bodyClassName="space-y-4">
        <div className="max-w-full overflow-x-auto">
          <Segmented value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r, label: ROLE[r][0] }))} />
        </div>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          {role === 'admin' && <Lock className="size-4" />}
          {ROLE_DESCRIPTION[role]}
          {role === 'admin' && ' Admin permissions cannot be changed.'}
        </p>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                <th className="px-4 py-2.5 text-start font-semibold">Module</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="px-3 py-2.5 text-center font-semibold">
                    {ACTION_LABEL[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{MODULE_LABEL[m]}</td>
                  {ACTIONS.map((a) => (
                    <td key={a} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-[var(--color-aura)] disabled:cursor-not-allowed"
                        checked={perms[role][m].includes(a)}
                        disabled={role === 'admin'}
                        onChange={() => toggle(m, a)}
                        aria-label={`${ROLE[role][0]}: ${ACTION_LABEL[a]} ${MODULE_LABEL[m]}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

/* ---------------------------- Currencies & taxes --------------------------- */

export function CurrencySection({ s }: Props) {
  const { save, saving } = useSettings()
  const [draft, setDraft, dirty, reset] = useDraft({ rates: s.rates, vatEnabled: s.vatEnabled, vatRate: s.vatRate, pricesIncludeVat: s.pricesIncludeVat })
  const [sample, setSample] = useState(10000)
  if (!draft) return null
  const codes = Object.keys(CURRENCY) as CurrencyCode[]
  const setRate = (c: CurrencyCode, v: number) => setDraft((d) => ({ ...d, rates: { ...d.rates, [c]: v } }))
  const onSave = () => {
    if (codes.some((c) => !(draft.rates[c] > 0))) return toast.error('Every exchange rate must be greater than 0')
    save({ ...draft, ratesUpdatedAt: JSON.stringify(draft.rates) !== JSON.stringify(s.rates) ? new Date().toISOString() : s.ratesUpdatedAt }, 'Currencies & taxes saved')
  }
  const vatOn = (x: number) => (draft.vatEnabled ? (draft.pricesIncludeVat ? x - x / (1 + draft.vatRate / 100) : (x * draft.vatRate) / 100) : 0)
  return (
    <div className="space-y-6">
      <SectionCard title="Exchange rates" subtitle={`Base currency AED · last updated ${formatDateTime(s.ratesUpdatedAt)}`} dirty={dirty} saving={saving} onSave={onSave} onReset={reset}>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <span>Preview conversion of</span>
          <Input type="number" min={0} step={500} value={sample} onChange={(e) => setSample(Number(e.target.value))} className="w-[130px] tabular" aria-label="Sample amount in AED" />
          <span>AED</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-[13.5px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-[11.5px] tracking-[0.04em] text-muted uppercase">
                <th className="px-4 py-2.5 text-start font-semibold">Currency</th>
                <th className="px-4 py-2.5 text-start font-semibold">1 AED =</th>
                <th className="hidden px-4 py-2.5 text-end font-semibold sm:table-cell">1 unit = AED</th>
                <th className="px-4 py-2.5 text-end font-semibold">{formatNumber(sample)} AED</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-[12px] font-bold text-muted">{CURRENCY[c].symbol}</span>
                      <div>
                        <p className="font-semibold">{c}</p>
                        <p className="text-[12px] text-muted">{CURRENCY[c].name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Input type="number" min={0} step="0.0001" value={draft.rates[c]} onChange={(e) => setRate(c, Number(e.target.value))} className="w-[120px] tabular" aria-label={`Rate AED to ${c}`} aria-invalid={!(draft.rates[c] > 0)} />
                  </td>
                  <td className="hidden px-4 py-2.5 text-end text-muted tabular sm:table-cell">{draft.rates[c] > 0 ? (1 / draft.rates[c]).toFixed(4) : '—'}</td>
                  <td className="px-4 py-2.5 text-end font-semibold tabular">
                    {CURRENCY[c].symbol} {formatNumber(sample * draft.rates[c])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="VAT" subtitle="UAE Federal Tax Authority" dirty={dirty} saving={saving} onSave={onSave} onReset={reset} bodyClassName="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-4">
          <div>
            <p className="font-semibold">Charge VAT at {draft.vatRate}%</p>
            <p className="mt-0.5 text-[13px] text-muted">Applies to commission invoices. TRN {s.company.trn} is printed on tax invoices.</p>
          </div>
          <Switch checked={draft.vatEnabled} onChange={(v) => setDraft((d) => ({ ...d, vatEnabled: v }))} />
        </div>
        <div className={cn('flex items-start justify-between gap-4 rounded-xl border border-line p-4', !draft.vatEnabled && 'opacity-60')}>
          <div>
            <p className="font-semibold">Prices include VAT</p>
            <p className="mt-0.5 text-[13px] text-muted">When on, commission amounts are VAT-inclusive and tax is extracted on the invoice.</p>
          </div>
          <Switch checked={draft.pricesIncludeVat} disabled={!draft.vatEnabled} onChange={(v) => setDraft((d) => ({ ...d, pricesIncludeVat: v }))} />
        </div>
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-muted">
          Example: a commission of <span className="font-semibold text-fg tabular">AED {formatNumber(sample)}</span> →{' '}
          {draft.vatEnabled ? (
            <>
              VAT <span className="font-semibold text-fg tabular">AED {vatOn(sample).toFixed(2)}</span>, total{' '}
              <span className="font-semibold text-fg tabular">AED {(draft.pricesIncludeVat ? sample : sample + vatOn(sample)).toFixed(2)}</span>
            </>
          ) : (
            'no VAT charged'
          )}
        </p>
      </SectionCard>
    </div>
  )
}

/* ------------------------------- Notifications ----------------------------- */

export function NotificationsSection({ s }: Props) {
  const { save, saving } = useSettings()
  const [draft, setDraft, dirty, reset] = useDraft(s.notifications)
  if (!draft) return null
  const groups = [...new Set(NOTIFICATION_EVENTS.map((n) => n.group))]
  const setAll = (k: 'inApp' | 'email', v: boolean) => setDraft((d) => Object.fromEntries(Object.entries(d).map(([id, p]) => [id, { ...p, [k]: v }])))
  return (
    <SectionCard title="Notifications" subtitle="Choose how you hear about activity" dirty={dirty} saving={saving} onSave={() => save({ notifications: draft }, 'Notification preferences saved')} onReset={reset}>
      <div className="mb-3 flex flex-wrap justify-end gap-2 text-[12.5px]">
        <Button variant="ghost" size="sm" onClick={() => setAll('email', false)}>
          Mute all email
        </Button>
        <Button variant="ghost" size="sm" onClick={() => (setAll('inApp', true), setAll('email', true))}>
          Enable all
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1fr_64px_64px] items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.04em] text-muted uppercase sm:grid-cols-[1fr_88px_88px]">
          <span>Event</span>
          <span className="inline-flex items-center justify-center gap-1">
            <Bell className="size-3.5" />
            <span className="hidden sm:inline">In-app</span>
          </span>
          <span className="inline-flex items-center justify-center gap-1">
            <Mail className="size-3.5" />
            <span className="hidden sm:inline">Email</span>
          </span>
        </div>
        {groups.map((g) => (
          <div key={g}>
            <p className="border-b border-line/70 bg-surface-2/30 px-4 py-1.5 text-[11.5px] font-semibold text-muted">{g}</p>
            {NOTIFICATION_EVENTS.filter((n) => n.group === g).map((n) => {
              const p = draft[n.id] ?? { inApp: false, email: false }
              return (
                <div key={n.id} className="grid grid-cols-[1fr_64px_64px] items-center gap-2 border-b border-line/70 px-4 py-3 last:border-0 sm:grid-cols-[1fr_88px_88px]">
                  <span className="text-[13.5px]">{n.label}</span>
                  <span className="flex justify-center">
                    <Switch checked={p.inApp} onChange={(v) => setDraft((d) => ({ ...d, [n.id]: { ...p, inApp: v } }))} />
                  </span>
                  <span className="flex justify-center">
                    <Switch checked={p.email} onChange={(v) => setDraft((d) => ({ ...d, [n.id]: { ...p, email: v } }))} />
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/* -------------------------------- Appearance ------------------------------- */

export function AppearanceSection({ s }: Props) {
  const { save } = useSettings()
  const dispatch = useAppDispatch()
  const theme = useAppSelector((st) => st.ui.theme)
  const collapsed = useAppSelector((st) => st.ui.sidebarCollapsed)
  const pref: ThemePreference = s.theme
  const choose = (t: ThemePreference) => {
    dispatch(setTheme(t === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t))
    save({ theme: t }, '')
  }
  const options: { value: ThemePreference; label: string; icon: typeof Sun; preview: string }[] = [
    { value: 'light', label: 'Light', icon: Sun, preview: 'bg-[#f6f4f9]' },
    { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-[#110b18]' },
    { value: 'system', label: 'System', icon: Monitor, preview: 'bg-[linear-gradient(135deg,#f6f4f9_50%,#110b18_50%)]' },
  ]
  return (
    <SectionCard title="Appearance" subtitle="Personal display preferences" bodyClassName="space-y-6">
      <div>
        <p className="mb-3 text-[13px] font-semibold">Theme</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => {
            const on = pref === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o.value)}
                aria-pressed={on}
                className={cn('overflow-hidden rounded-xl border text-start transition-[border-color,box-shadow]', on ? 'border-aura ring-3 ring-aura/15' : 'border-line hover:border-aura/40')}
              >
                <div className={cn('flex h-20 items-end gap-1.5 p-3', o.preview)}>
                  <span className="h-10 w-6 rounded-md bg-[#1c1226]" />
                  <span className="h-12 flex-1 rounded-md border border-black/5 bg-white/80 shadow-sm dark:bg-white/80" />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                    <o.icon className="size-4" />
                    {o.label}
                  </span>
                  {on && <Badge tone="brand">Active</Badge>}
                </div>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-muted">Currently showing the {theme} theme{pref === 'system' ? ', following your device' : ''}.</p>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-4">
        <div>
          <p className="font-semibold">Collapsed sidebar</p>
          <p className="mt-0.5 text-[13px] text-muted">Start with the sidebar collapsed to icons on desktop. Remembered on this device.</p>
        </div>
        <Switch checked={collapsed} onChange={() => dispatch(toggleSidebarCollapsed())} />
      </div>
    </SectionCard>
  )
}

/* ----------------------------------- Data ---------------------------------- */

const PREFIX = 'erp-db-v1:'

export function DataSection() {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const stats = useMemo(() => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
    let bytes = 0
    let records = 0
    for (const k of keys) {
      const v = localStorage.getItem(k) ?? ''
      bytes += v.length * 2
      try {
        records += (JSON.parse(v) as unknown[]).length
      } catch {
        /* ignore */
      }
    }
    return { collections: keys.length, records, kb: bytes / 1024 }
  }, [])

  const exportAll = () => {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k) ?? 'null')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }))
    a.download = `apex-aora-erp-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const reset = () => {
    setBusy(true)
    resetAllCollections()
    location.reload()
  }

  return (
    <SectionCard title="Data" subtitle="Demo data is stored in this browser" bodyClassName="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Collections', formatNumber(stats.collections)],
          ['Records', formatNumber(stats.records)],
          ['Storage used', `${stats.kb.toFixed(0)} KB`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-line p-4">
            <p className="text-[12px] text-muted">{l}</p>
            <p className="mt-1 text-[20px] font-bold tabular">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-royal/10 text-royal dark:text-[#8db1e6]">
            <Database className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Export all data</p>
            <p className="mt-0.5 text-[13px] text-muted">Download every collection as a JSON file.</p>
          </div>
        </div>
        <Button variant="outline" icon={<Download />} onClick={exportAll}>
          Export JSON
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-danger/30 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
            <RefreshCcw className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Reset demo data</p>
            <p className="mt-0.5 text-[13px] text-muted">Discard every change and restore the original demo records. This cannot be undone.</p>
          </div>
        </div>
        <Button variant="danger" icon={<Trash2 />} onClick={() => setConfirm(true)}>
          Reset demo data
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={reset}
        loading={busy}
        title="Reset all demo data?"
        confirmLabel="Reset & reload"
        message="All leads, deals, listings, invoices, employees, tasks and settings you created or edited will be replaced with the original demo data, and the app will reload."
      />
    </SectionCard>
  )
}

/* -------------------------------- Commission ------------------------------- */

export function CommissionSection({ s }: Props) {
  const { save, saving } = useSettings()
  const [draft, setDraft, dirty, reset] = useDraft(s.commission)
  const [errors, setErrors] = useState<Partial<Record<keyof NonNullable<typeof draft>, string>>>({})
  if (!draft) return null
  const set = (k: keyof typeof draft, v: number) => setDraft((d) => ({ ...d, [k]: v }))
  const pct = (v: number) => v >= 0 && v <= 100
  const onSave = () => {
    const e: typeof errors = {}
    if (!(draft.saleRate > 0 && draft.saleRate <= 10)) e.saleRate = 'Between 0 and 10%'
    if (!(draft.rentRate > 0 && draft.rentRate <= 20)) e.rentRate = 'Between 0 and 20%'
    if (!(draft.offplanRate >= 0 && draft.offplanRate <= 15)) e.offplanRate = 'Between 0 and 15%'
    if (!(draft.minRentCommission >= 0)) e.minRentCommission = 'Cannot be negative'
    for (const k of ['brokerSplit', 'seniorSplit', 'leadSplit'] as const) if (!pct(draft[k])) e[k] = 'Between 0 and 100%'
    setErrors(e)
    if (Object.keys(e).length) return
    save({ commission: draft }, 'Commission rules saved')
  }
  const num = (k: keyof typeof draft, label: string, hint: string, step = 0.5, suffix = '%') => (
    <Field label={label} hint={hint} error={errors[k]} required>
      {(id) => (
        <div className="relative">
          <Input id={id} type="number" min={0} step={step} value={draft[k]} onChange={(e) => set(k, Number(e.target.value))} aria-invalid={!!errors[k]} className="pe-12 tabular" />
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[12.5px] text-muted">{suffix}</span>
        </div>
      )}
    </Field>
  )
  const saleEx = 2_500_000
  const rentEx = 85_000
  const rentCommission = Math.max(draft.minRentCommission, (rentEx * draft.rentRate) / 100)
  const saleCommission = (saleEx * draft.saleRate) / 100
  return (
    <SectionCard title="Commission" subtitle="Defaults for new deals and broker payouts (RERA-standard rates)" dirty={dirty} saving={saving} onSave={onSave} onReset={reset} bodyClassName="space-y-6">
      <div>
        <p className="mb-3 text-[13px] font-semibold">Agency commission</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {num('saleRate', 'Secondary sale', 'Of the sale price, charged to buyer and/or seller')}
          {num('rentRate', 'Rental', 'Of the annual rent, charged to the tenant')}
          {num('minRentCommission', 'Minimum rental commission', 'Applied when the % is lower', 500, 'AED')}
          {num('offplanRate', 'Off-plan (default)', 'Paid by the developer; each project can override')}
        </div>
      </div>
      <div>
        <p className="mb-3 text-[13px] font-semibold">Broker split (broker's share of agency commission)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {num('brokerSplit', 'Property consultant', 'Default split', 5)}
          {num('seniorSplit', 'Senior / luxury', 'Senior consultants', 5)}
          {num('leadSplit', 'Team lead', 'Heads of department', 5)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-muted">
          Sale of <span className="font-semibold text-fg tabular">AED {formatNumber(saleEx)}</span> → commission{' '}
          <span className="font-semibold text-fg tabular">AED {formatNumber(saleCommission)}</span>, broker gets{' '}
          <span className="font-semibold text-success tabular">AED {formatNumber((saleCommission * draft.brokerSplit) / 100)}</span>
        </div>
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-muted">
          Rent of <span className="font-semibold text-fg tabular">AED {formatNumber(rentEx)}</span>/yr → commission{' '}
          <span className="font-semibold text-fg tabular">AED {formatNumber(rentCommission)}</span>, broker gets{' '}
          <span className="font-semibold text-success tabular">AED {formatNumber((rentCommission * draft.brokerSplit) / 100)}</span>
        </div>
      </div>
    </SectionCard>
  )
}
