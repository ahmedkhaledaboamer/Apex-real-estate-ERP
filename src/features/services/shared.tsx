import { CalendarCheck2, Check, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { IMG, srcSetOf } from '@/assets/images'
import { PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, formatMoney, formatMoneyCompact } from '@/lib/format'
import { DEAL_STAGE, DEAL_TYPE, VIEWING_STATUS } from '@/lib/labels'
import { communityBySlug, customerById, employeeById } from '@/mocks/core'
import { leadById, listingById, offplanById } from '@/mocks/domain'
import type { Deal, Viewing } from '@/types/domain'

/* ------------------------------------------------------------------ */
/*  Photos                                                             */
/* ------------------------------------------------------------------ */

/** Photo library offered by the image pickers (website photography). */
export const PHOTO_LIBRARY: { key: string; label: string; src: string }[] = (
  [
    ['marina', 'Dubai Marina'],
    ['downtown', 'Downtown'],
    ['palm', 'Palm Jumeirah'],
    ['businessBay', 'Business Bay'],
    ['jvc', 'JVC'],
    ['dubaiHills', 'Dubai Hills'],
    ['creekHarbour', 'Creek Harbour'],
    ['damacLagoons', 'DAMAC Lagoons'],
    ['villa', 'Villa'],
    ['living', 'Living room'],
    ['kitchen', 'Kitchen'],
    ['bedroom', 'Bedroom'],
    ['pool', 'Pool'],
    ['balcony', 'Balcony'],
    ['offplanTower', 'Tower render'],
    ['offplanWaterfront', 'Waterfront render'],
    ['offplanVillas', 'Villas render'],
    ['coastBand', 'Coastline'],
  ] as const
).map(([key, label]) => ({ key, label, src: IMG[key] }))

/** Lazy, async-decoded photo with srcSet; the wrapper fixes the aspect ratio so nothing shifts. */
export function Photo({ src, alt = '', className, imgClassName, sizes = '(min-width: 1024px) 33vw, 100vw', children }: { src: string | undefined; alt?: string; className?: string; imgClassName?: string; sizes?: string; children?: ReactNode }) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', className)}>
      {src && <img src={src} srcSet={srcSetOf(src)} sizes={sizes} alt={alt} loading="lazy" decoding="async" className={cn('absolute inset-0 size-full object-cover', imgClassName)} />}
      {children}
    </div>
  )
}

/** Grid of library photos; multi-select (ordered — first = cover) or single. */
export function ImagePicker({ value, onChange, multiple = true }: { value: string[]; onChange: (v: string[]) => void; multiple?: boolean }) {
  const toggle = (src: string) => {
    if (!multiple) return onChange([src])
    onChange(value.includes(src) ? value.filter((v) => v !== src) : [...value, src])
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {PHOTO_LIBRARY.map((p) => {
        const idx = value.indexOf(p.src)
        const on = idx >= 0
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => toggle(p.src)}
            aria-pressed={on}
            aria-label={p.label}
            className={cn('group relative overflow-hidden rounded-lg ring-offset-2 ring-offset-surface transition-shadow', on ? 'ring-2 ring-aura' : 'ring-1 ring-line hover:ring-aura/50')}
          >
            <Photo src={p.src} className="aspect-[4/3]" sizes="120px" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pt-4 pb-1 text-start text-[10.5px] font-semibold text-white">{p.label}</span>
            {on && (
              <span className="absolute end-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-aura text-[10.5px] font-bold text-white">
                {multiple ? idx + 1 : <Check className="size-3" />}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('size-3.5', i < Math.round(value) ? 'fill-warning text-warning' : 'text-line')} />
      ))}
      <span className="ms-1 text-[12px] font-semibold text-muted tabular">{value.toFixed(1)}</span>
    </span>
  )
}

/** Compact key-fact tile for detail pages. */
export function Fact({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3">
      <p className="truncate text-[11.5px] font-medium text-muted">{label}</p>
      <p className="mt-1 truncate text-[15px] font-bold tabular">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11.5px] text-muted">{sub}</p>}
    </div>
  )
}

export function ExclusiveBadge() {
  return (
    <Badge tone="brand" className="bg-brand-gradient text-white ring-0 dark:text-white">
      Exclusive
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/*  Business helpers                                                   */
/* ------------------------------------------------------------------ */
const DAY = 86_400_000
export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY))
/** Deals closed within the last `days` (GCI basis). */
export const closedWithin = (d: Deal, days: number) => d.stage === 'closed' && !!d.closedAt && Date.now() - new Date(d.closedAt).getTime() <= days * DAY
export const isClosed = (d: Deal) => d.stage === 'closed'

/** "Marina Gate 1 · Dubai Marina" or the off-plan project name. */
export function dealProperty(d: Pick<Deal, 'listingId' | 'projectId' | 'communitySlug'>) {
  const l = listingById(d.listingId)
  if (l) return { title: l.title, sub: communityBySlug(l.communitySlug)?.name ?? '' }
  const p = offplanById(d.projectId)
  if (p) return { title: p.name, sub: communityBySlug(p.communitySlug)?.name ?? '' }
  return { title: communityBySlug(d.communitySlug)?.name ?? '—', sub: '' }
}

/** Expand a "60/40" summary into milestones (booking + construction instalments + handover). */
export function planFromString(plan: string, handover: string): { label: string; percent: number; due: string }[] {
  const [a = 60, b = 40] = plan.split('/').map((n) => Number(n.trim()))
  const during = Math.max(0, a)
  const booking = Math.min(20, during >= 50 ? 20 : 10)
  const rest = during - booking
  const parts = rest >= 30 ? 3 : rest > 0 ? 1 : 0
  const step = parts ? Math.floor(rest / parts / 5) * 5 : 0
  const out = [{ label: 'Booking', percent: booking, due: 'On reservation' }]
  for (let i = 0; i < parts; i++) {
    const pct = i === parts - 1 ? rest - step * (parts - 1) : step
    out.push({ label: `Construction ${Math.round(((i + 1) / (parts + 1)) * 100)}%`, percent: pct, due: `During construction` })
  }
  out.push({ label: handover === 'Ready' ? 'On completion' : 'On handover', percent: b, due: handover })
  return out
}

/* ------------------------------------------------------------------ */
/*  Reusable cards                                                     */
/* ------------------------------------------------------------------ */

export function DealsCard({ deals, title = 'Deals', subtitle, loading, hideProperty }: { deals: Deal[] | undefined; title?: string; subtitle?: string; loading?: boolean; hideProperty?: boolean }) {
  const columns: Column<Deal>[] = [
    {
      key: 'code',
      header: 'Deal',
      sort: (d) => d.code,
      cell: (d) => (
        <span>
          <span className="font-semibold text-aura">{d.code}</span>
          <span className="block text-[12px] text-muted">{DEAL_TYPE[d.type]}</span>
        </span>
      ),
    },
    ...(hideProperty
      ? []
      : [
          {
            key: 'property',
            header: 'Property',
            hideBelow: 'md' as const,
            cell: (d: Deal) => {
              const p = dealProperty(d)
              return (
                <span className="block max-w-[240px]">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block truncate text-[12px] text-muted">{p.sub}</span>
                </span>
              )
            },
          },
        ]),
    {
      key: 'client',
      header: 'Client',
      hideBelow: 'lg',
      cell: (d) => {
        const c = customerById(d.clientId)
        return c ? <PersonCell name={c.name} hue={c.avatarHue} size={26} /> : '—'
      },
    },
    { key: 'price', header: 'Price', align: 'end', sort: (d) => d.price, cell: (d) => <span className="font-semibold tabular">{formatMoneyCompact(d.price)}</span> },
    { key: 'commission', header: 'Commission', align: 'end', hideBelow: 'sm', sort: (d) => d.commission, cell: (d) => <span className="tabular">{formatMoney(d.commission)}</span> },
    { key: 'stage', header: 'Stage', sort: (d) => d.stage, cell: (d) => <StatusBadge value={d.stage} map={DEAL_STAGE} /> },
    { key: 'date', header: 'Date', hideBelow: 'xl', sort: (d) => d.closedAt ?? d.createdAt, cell: (d) => <span className="text-muted tabular">{formatDate(d.closedAt ?? d.createdAt)}</span> },
  ]
  return (
    <div className="min-w-0 space-y-3">
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      <DataTable rows={deals} columns={columns} loading={loading} pageSize={6} initialSort={{ key: 'date', dir: 'desc' }} empty={<EmptyState title="No deals yet" />} />
    </div>
  )
}

export function ViewingsCard({ viewings, title = 'Viewings', className }: { viewings: Viewing[]; title?: string; className?: string }) {
  const sorted = [...viewings].sort((a, b) => b.at.localeCompare(a.at))
  const upcoming = viewings.filter((v) => v.status === 'scheduled' && new Date(v.at).getTime() > Date.now()).length
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader title={title} subtitle={`${viewings.length} total · ${upcoming} upcoming`} />
      <div className="p-3 pt-3">
        {sorted.length === 0 ? (
          <EmptyState icon={<CalendarCheck2 />} title="No viewings yet" className="py-8" />
        ) : (
          <ul className="max-h-[340px] space-y-1 overflow-y-auto">
            {sorted.map((v) => {
              const who = leadById(v.leadId)?.name ?? customerById(v.clientId)?.name ?? 'Client'
              const agent = employeeById(v.agentId)
              return (
                <li key={v.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-aura/10 text-aura dark:text-[#d6a8e3]">
                    <CalendarCheck2 className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{who}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {formatDateTime(v.at)}
                      {agent ? ` · ${agent.name}` : ''}
                      {v.feedback ? ` · “${v.feedback}”` : ''}
                    </span>
                  </span>
                  <StatusBadge value={v.status} map={VIEWING_STATUS} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}

/** Monthly buckets (last n months, oldest first) keyed "Mmm". */
export function lastMonths(n: number) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('en-GB', { month: 'short' }) }
  })
}
export const monthKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}
