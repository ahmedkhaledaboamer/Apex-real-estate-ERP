import { Link } from '@tanstack/react-router'
import { Bath, BedDouble, Eye, MessageSquare, Ruler } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { pricePerSqft } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatCompact, formatMoney, formatNumber } from '@/lib/format'
import { LISTING_PURPOSE, LISTING_STATUS } from '@/lib/labels'
import { communityBySlug, employeeById } from '@/mocks/core'
import type { Listing } from '@/types/domain'
import { ExclusiveBadge, Photo } from './shared'

export function listingPrice(l: Pick<Listing, 'price' | 'purpose'>) {
  return l.purpose === 'rent' ? `${formatMoney(l.price)} / yr` : formatMoney(l.price)
}

export function ListingCard({ listing: l }: { listing: Listing }) {
  const agent = employeeById(l.agentId)
  const community = communityBySlug(l.communitySlug)
  return (
    <Link
      to="/services/listings/$listingId"
      params={{ listingId: l.id }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[box-shadow,border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-aura/30 hover:shadow-lift"
    >
      <Photo src={l.images[0]} alt={l.title} className="aspect-[4/3]" sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" imgClassName="transition-transform duration-500 group-hover:scale-[1.03]">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className={cn('rounded-full px-2.5 py-1 text-[11.5px] font-bold text-white shadow-sm backdrop-blur-sm', l.purpose === 'sale' ? 'bg-plum/85' : 'bg-royal/85')}>{LISTING_PURPOSE[l.purpose]}</span>
          {l.exclusive && <ExclusiveBadge />}
        </div>
        <div className="absolute start-3 bottom-3 rounded-full bg-surface/95 shadow-sm">
          <StatusBadge value={l.status} map={LISTING_STATUS} />
        </div>
      </Photo>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[17px] font-bold tracking-[-0.01em] tabular">{listingPrice(l)}</p>
        <p className="mt-0.5 truncate text-[13.5px] font-semibold">{l.title}</p>
        <p className="truncate text-[12.5px] text-muted">
          {l.building} · {community?.name}
        </p>
        <div className="mt-3 mb-4 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] text-muted [&_svg]:size-3.5">
          <span className="inline-flex items-center gap-1">
            <BedDouble /> {l.beds === 0 ? 'Studio' : `${l.beds} bd`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath /> {l.baths} ba
          </span>
          <span className="inline-flex items-center gap-1 tabular">
            <Ruler /> {formatNumber(l.sqft)} sqft
          </span>
          {l.purpose === 'sale' && <span className="tabular">AED {formatNumber(pricePerSqft(l.price, l.sqft))}/sqft</span>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="flex min-w-0 items-center gap-2">
            {agent && <Avatar name={agent.name} hue={agent.avatarHue} photo={agent.photo} size={26} />}
            <span className="truncate text-[12.5px] font-medium">{agent?.name ?? '—'}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5 text-[12px] text-muted tabular [&_svg]:size-3.5">
            <span className="inline-flex items-center gap-1" title="Portal views">
              <Eye /> {formatCompact(l.views)}
            </span>
            <span className="inline-flex items-center gap-1" title="Enquiries">
              <MessageSquare /> {l.enquiries}
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}
