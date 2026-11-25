import type { ReactNode } from 'react'
import { Building2, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { LEAD_SOURCE } from '@/lib/labels'
import { code } from '@/lib/random'
import { brokers, customerById, employeeById } from '@/mocks/core'
import { leadById } from '@/mocks/domain'
import type { Employee } from '@/types/core'
import type { DealType, Lead, LeadSource, Listing, OffPlanProject, Viewing } from '@/types/domain'
import { SOURCE_TONE } from './labels'

/** GCI for a deal: price × rate, rentals carry a AED 5,000 minimum. */
export function calcCommission(type: DealType, price: number, rate: number) {
  const c = Math.round((price * rate) / 100)
  return type === 'rent' ? Math.max(5_000, c) : c
}

/** Next sequential document code from existing ones, e.g. DL-3421. */
export function nextCode(prefix: string, existing: { code: string }[], fallback: number, width = 4) {
  const max = existing.reduce((m, r) => {
    const n = Number(r.code.split('-')[1])
    return Number.isFinite(n) && n > m ? n : m
  }, fallback)
  return code(prefix, max + 1, width)
}

export function PropertyThumb({ image, size = 44, className, rounded = 'rounded-xl' }: { image?: string; size?: number; className?: string; rounded?: string }) {
  if (image) return <img src={image} alt="" loading="lazy" decoding="async" className={cn('shrink-0 object-cover', rounded, className)} style={{ width: size, height: size }} />
  return (
    <span className={cn('grid shrink-0 place-items-center bg-surface-2 text-muted', rounded, className)} style={{ width: size, height: size }}>
      <Building2 className="size-5" />
    </span>
  )
}

export function SourceChip({ source, className }: { source: LeadSource; className?: string }) {
  const tone = SOURCE_TONE[source]
  if (!tone) return <Badge className={className}>{LEAD_SOURCE[source]}</Badge>
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ring-1 ring-inset', tone, className)}>{LEAD_SOURCE[source]}</span>
}

export function Stars({ value, onChange, size = 16 }: { value: number | null; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value ? `${value} of 5` : 'Not rated'}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n
        const icon = <Star className={cn(on ? 'fill-warning text-warning' : 'text-line')} style={{ width: size, height: size }} />
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} className="rounded p-0.5 transition-transform hover:scale-110" aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={on}>
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        )
      })}
    </span>
  )
}

export const brokerOptions = () =>
  brokers()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((b) => ({ value: b.id, label: b.name }))

export const brokerOf = (id: string | null | undefined): Employee | undefined => employeeById(id)

/** Who is being shown around: a lead or a client. */
export function viewingWho(v: Pick<Viewing, 'leadId' | 'clientId'>) {
  const lead = leadById(v.leadId)
  if (lead) return { name: lead.name, kind: 'Lead' as const, hue: undefined as number | undefined }
  const c = customerById(v.clientId)
  return { name: c?.name ?? 'Client', kind: 'Client' as const, hue: c?.avatarHue }
}

/** Active listings that fit a lead: purpose, community, beds ±1, price within budget + 10%. */
export function matchingListings(lead: Lead, all: Listing[]) {
  const purpose = lead.interest === 'buy' ? 'sale' : lead.interest === 'rent' ? 'rent' : null
  if (!purpose) return []
  return all
    .filter((l) => l.status === 'active' && l.purpose === purpose && l.communitySlug === lead.communitySlug && Math.abs(l.beds - lead.beds) <= 1 && l.price <= lead.budget * 1.1)
    .sort((a, b) => Math.abs(a.price - lead.budget) - Math.abs(b.price - lead.budget))
}

/** Off-plan projects that fit an off-plan lead (community + starting price within budget + 10%). */
export function matchingProjects(lead: Lead, all: OffPlanProject[]) {
  if (lead.interest !== 'offplan') return []
  return all.filter((p) => (p.status === 'selling' || p.status === 'launching') && p.fromPrice <= lead.budget * 1.1).sort((a, b) => Number(b.communitySlug === lead.communitySlug) - Number(a.communitySlug === lead.communitySlug))
}

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** yyyy-mm-dd + HH:mm (local) → ISO string. */
export function localToIso(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).toISOString()
}
export function isoToLocal(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` }
}

/** Mini label/value block for KPI rows inside cards. */
export function MiniStat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'success' | 'danger' | 'warning' }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2/70 px-3.5 py-3">
      <p className="truncate text-[11.5px] font-medium text-muted">{label}</p>
      <p className={cn('mt-1 truncate text-[16px] font-bold tabular', tone === 'success' && 'text-success', tone === 'danger' && 'text-danger', tone === 'warning' && 'text-warning')}>{value}</p>
    </div>
  )
}
