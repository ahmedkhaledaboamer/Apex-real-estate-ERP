import { Link } from '@tanstack/react-router'
import { ArchiveX, ArrowLeft, Bath, BedDouble, CheckCircle2, Eye, FileBadge2, Handshake, Mail, MessageSquare, Pencil, Phone, RotateCcw, Ruler, Sofa } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarsChart } from '@/components/charts/Charts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { DetailRow, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { pricePerSqft, sum } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { formatCompact, formatDate, formatMoney, formatNumber, formatPercent } from '@/lib/format'
import { CUSTOMER_TYPE, LISTING_PURPOSE, LISTING_STATUS } from '@/lib/labels'
import { communityBySlug, customerById, employeeById } from '@/mocks/core'
import { deals, listings, viewings } from '@/mocks/domain'
import type { Listing, ListingStatus } from '@/types/domain'
import { FURNISHING } from './labels'
import { listingPrice } from './ListingCard'
import { ListingDrawer } from './ListingDrawer'
import { DealsCard, daysSince, ExclusiveBadge, Fact, Photo, ViewingsCard } from './shared'

/** Portal split of views/enquiries (the portals report a combined total in the feed). */
const PORTALS = [
  ['Property Finder', 0.46],
  ['Bayut', 0.36],
  ['Dubizzle', 0.18],
] as const

export function ListingDetailPage({ listingId }: { listingId: string }) {
  const { data: all, isLoading } = listings.useList()
  const { data: allDeals } = deals.useList()
  const { data: allViewings = [] } = viewings.useList()
  const update = listings.useUpdate()
  const [editing, setEditing] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [photo, setPhoto] = useState(0)
  const l = all?.find((x) => x.id === listingId)

  const market = useMemo(() => {
    if (!l || !all) return null
    const peers = all.filter((x) => x.id !== l.id && x.communitySlug === l.communitySlug && x.purpose === l.purpose && x.sqft > 0)
    const sameType = peers.filter((x) => x.propertyType === l.propertyType)
    const avg = (rows: Listing[]) => (rows.length ? Math.round(sum(rows, (x) => x.price / x.sqft) / rows.length) : 0)
    const own = Math.round(l.price / Math.max(1, l.sqft))
    const community = communityBySlug(l.communitySlug)
    const reference = l.purpose === 'sale' ? (community?.ppsf ?? avg(peers)) : avg(peers)
    return { own, peers: avg(peers), sameType: avg(sameType), reference, count: peers.length, typeCount: sameType.length, siteSnapshot: l.purpose === 'sale' && !!community?.ppsf }
  }, [l, all])

  if (isLoading) return <Skeleton className="h-[70vh] rounded-card" />
  if (!l)
    return (
      <Card>
        <EmptyState
          title="Listing not found"
          message="It may have been deleted."
          action={
            <ButtonLink to="/services" variant="outline" icon={<ArrowLeft />}>
              Back to listings
            </ButtonLink>
          }
        />
      </Card>
    )

  const community = communityBySlug(l.communitySlug)
  const owner = customerById(l.ownerId)
  const agent = employeeById(l.agentId)
  const listingDeals = (allDeals ?? []).filter((d) => d.listingId === l.id)
  const listingViewings = allViewings.filter((v) => v.listingId === l.id)
  const setStatus = (status: ListingStatus, extra: Partial<Listing> = {}) => update.mutate({ id: l.id, patch: { status, ...extra } })
  const conversion = l.views ? (l.enquiries / l.views) * 100 : 0
  const ppsf = pricePerSqft(l.price, l.sqft)
  const diff = market && market.reference ? ((market.own - market.reference) / market.reference) * 100 : 0
  const closedDeal = listingDeals.find((d) => d.stage === 'closed')

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Services' }, { label: 'Listings', to: '/services' }, { label: l.ref }]}
        title={l.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {l.building} · {community?.name}
            </span>
            <StatusBadge value={l.status} map={LISTING_STATUS} />
            {l.exclusive && <ExclusiveBadge />}
          </span>
        }
        actions={
          <>
            {l.status === 'active' && (
              <Button variant="soft" icon={<Handshake />} onClick={() => setStatus('under-offer')}>
                Mark under offer
              </Button>
            )}
            {l.status === 'under-offer' && (
              <Button variant="soft" icon={<CheckCircle2 />} onClick={() => setStatus(l.purpose === 'sale' ? 'sold' : 'rented')}>
                Mark {l.purpose === 'sale' ? 'sold' : 'rented'}
              </Button>
            )}
            {(l.status === 'withdrawn' || l.status === 'under-offer' || l.status === 'draft' || l.status === 'sold' || l.status === 'rented') && (
              <Button variant="outline" icon={<RotateCcw />} onClick={() => setStatus('active', l.status === 'under-offer' ? {} : { listedAt: new Date().toISOString() })}>
                {l.status === 'draft' ? 'Publish' : l.status === 'under-offer' ? 'Back on market' : 'Relist'}
              </Button>
            )}
            {(l.status === 'active' || l.status === 'under-offer' || l.status === 'draft') && (
              <Button variant="outline" icon={<ArchiveX />} onClick={() => setWithdrawing(true)}>
                Withdraw
              </Button>
            )}
            <Button icon={<Pencil />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gallery */}
        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <Photo src={l.images[photo] ?? l.images[0]} alt={l.title} className="aspect-[16/10]" sizes="(min-width: 1024px) 60vw, 100vw">
            <span className={cn('absolute start-4 top-4 rounded-full px-3 py-1 text-[12px] font-bold text-white shadow-sm', l.purpose === 'sale' ? 'bg-plum/85' : 'bg-royal/85')}>{LISTING_PURPOSE[l.purpose]}</span>
            <span className="absolute end-4 bottom-4 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white tabular">
              {photo + 1} / {l.images.length}
            </span>
          </Photo>
          {l.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {l.images.map((src, i) => (
                <button key={i} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} aria-pressed={photo === i} className={cn('shrink-0 overflow-hidden rounded-lg ring-offset-2 ring-offset-surface transition-shadow', photo === i ? 'ring-2 ring-aura' : 'opacity-80 hover:opacity-100')}>
                  <Photo src={src} className="h-14 w-20" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Price + key facts */}
        <Card className="min-w-0">
          <CardBody className="space-y-4">
            <div>
              <p className="text-[12.5px] font-medium text-muted">{l.purpose === 'rent' ? 'Annual rent' : 'Asking price'}</p>
              <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.02em] tabular">{listingPrice(l)}</p>
              <p className="mt-1.5 text-[12.5px] text-muted tabular">
                AED {formatNumber(ppsf)} / sqft{l.purpose === 'rent' && l.cheques ? ` · ${l.cheques} cheque${l.cheques > 1 ? 's' : ''}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Fact label="Bedrooms" value={<span className="inline-flex items-center gap-1.5"><BedDouble className="size-4 text-muted" />{l.beds === 0 ? 'Studio' : l.beds}</span>} />
              <Fact label="Bathrooms" value={<span className="inline-flex items-center gap-1.5"><Bath className="size-4 text-muted" />{l.baths}</span>} />
              <Fact label="Built-up area" value={<span className="inline-flex items-center gap-1.5"><Ruler className="size-4 text-muted" />{formatNumber(l.sqft)} sqft</span>} />
              <Fact label="Furnishing" value={<span className="inline-flex items-center gap-1.5"><Sofa className="size-4 text-muted" />{FURNISHING[l.furnishing].replace(' furnished', '')}</span>} />
            </div>
            <div className="divide-y divide-line">
              <DetailRow label="Reference">{l.ref}</DetailRow>
              <DetailRow label="Property type">{l.propertyType}</DetailRow>
              <DetailRow label="Trakheesi permit">
                <span className="inline-flex items-center gap-1.5 tabular">
                  <FileBadge2 className="size-4 text-success" /> {l.permit}
                </span>
              </DetailRow>
              <DetailRow label="Listed">
                {formatDate(l.listedAt)} <span className="text-muted">· {daysSince(l.listedAt)} days</span>
              </DetailRow>
              <DetailRow label="Mandate">{l.exclusive ? 'Exclusive' : 'Open'}</DetailRow>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pricing vs market */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader
            title="Pricing vs market"
            subtitle={market ? `AED per sq ft against ${market.count} comparable ${l.purpose === 'sale' ? 'sale' : 'rental'} listings in ${community?.name}` : ' '}
            actions={
              market && market.reference ? (
                <Badge tone={Math.abs(diff) < 5 ? 'success' : diff > 0 ? 'warning' : 'info'}>
                  {diff > 0 ? '+' : ''}
                  {diff.toFixed(1)}% vs {l.purpose === 'sale' && market.siteSnapshot ? 'community avg' : 'comparables'}
                </Badge>
              ) : undefined
            }
          />
          <CardBody className="pt-2">
            {market && (
              <BarsChart
                horizontal
                height={190}
                x="name"
                series={[{ key: 'ppsf', label: 'AED / sqft' }]}
                format={(v) => `AED ${formatNumber(v)}`}
                data={[
                  { name: 'This listing', ppsf: market.own },
                  ...(market.siteSnapshot ? [{ name: 'Community avg', ppsf: market.reference }] : []),
                  ...(market.peers ? [{ name: 'Our comparables', ppsf: market.peers }] : []),
                  ...(market.sameType ? [{ name: `${l.propertyType}s`, ppsf: market.sameType }] : []),
                ]}
              />
            )}
            <p className="mt-3 text-[12.5px] text-muted">
              {Math.abs(diff) < 5 ? 'Priced in line with the market.' : diff > 0 ? 'Priced above the market — expect a longer time on market unless the unit has a premium view or upgrades.' : 'Priced below the market — should attract strong enquiry levels.'}
              {l.purpose === 'sale' && community?.yieldPct ? ` Typical gross yield in ${community.name}: ${community.yieldPct}%.` : ''}
            </p>
          </CardBody>
        </Card>

        {/* Portal performance */}
        <Card className="min-w-0">
          <CardHeader title="Portal performance" subtitle="Property Finder · Bayut · Dubizzle" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Fact label="Views" value={<span className="inline-flex items-center gap-1"><Eye className="size-4 text-muted" />{formatCompact(l.views)}</span>} />
              <Fact label="Enquiries" value={<span className="inline-flex items-center gap-1"><MessageSquare className="size-4 text-muted" />{l.enquiries}</span>} />
              <Fact label="Conversion" value={formatPercent(conversion, 1)} />
            </div>
            <ul className="space-y-3">
              {PORTALS.map(([name, share]) => (
                <li key={name}>
                  <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted tabular">
                      {formatCompact(Math.round(l.views * share))} views · {Math.round(l.enquiries * share)} enq.
                    </span>
                  </div>
                  <Progress value={share * 100} />
                </li>
              ))}
            </ul>
            <p className="border-t border-line pt-3 text-[12.5px] text-muted">
              {listingViewings.length} viewing{listingViewings.length === 1 ? '' : 's'} booked · {formatNumber(Math.round(l.views / Math.max(1, daysSince(l.listedAt))))} views / day
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader title="Owner" subtitle={owner ? CUSTOMER_TYPE[owner.type] : undefined} />
          <CardBody>
            {owner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={owner.name} hue={owner.avatarHue} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{owner.name}</p>
                    <p className="truncate text-[12.5px] text-muted">
                      {owner.code} · {owner.nationality} · {owner.city}
                    </p>
                  </div>
                </div>
                <ContactLines email={owner.email} phone={owner.phone} />
                {owner.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {owner.tags.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted">No owner linked</p>
            )}
          </CardBody>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Listing broker" subtitle={agent?.title} />
          <CardBody>
            {agent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={agent.name} hue={agent.avatarHue} photo={agent.photo} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{agent.name}</p>
                    <p className="truncate text-[12.5px] text-muted">BRN {agent.brn ?? '—'} · {agent.languages.join(', ')}</p>
                  </div>
                </div>
                <ContactLines email={agent.email} phone={agent.phone} />
              </div>
            ) : (
              <p className="text-muted">Unassigned</p>
            )}
          </CardBody>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Commission outlook" subtitle={l.purpose === 'sale' ? '2% of the sale price' : '5% of annual rent (min AED 5,000)'} />
          <CardBody className="space-y-1 divide-y divide-line">
            <DetailRow label="Expected GCI">{formatMoney(l.purpose === 'sale' ? Math.round(l.price * 0.02) : Math.max(5000, Math.round(l.price * 0.05)))}</DetailRow>
            <DetailRow label="Deals on this unit">{listingDeals.length}</DetailRow>
            <DetailRow label="Closed">{closedDeal ? `${closedDeal.code} · ${formatMoney(closedDeal.price)}` : '—'}</DetailRow>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 2xl:grid-cols-5">
        <div className="min-w-0 2xl:col-span-3">
          <DealsCard deals={listingDeals} title="Deals" subtitle="Offers and transactions on this unit" loading={!allDeals} hideProperty />
        </div>
        <ViewingsCard viewings={listingViewings} className="2xl:col-span-2" />
      </div>

      <ListingDrawer open={editing} onClose={() => setEditing(false)} listing={l} />
      <ConfirmDialog
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        title="Withdraw this listing?"
        message="It will be taken off the portals. You can relist it later."
        confirmLabel="Withdraw"
        onConfirm={() => {
          setStatus('withdrawn')
          setWithdrawing(false)
        }}
      />
      <p className="text-[12px] text-muted">
        <Link to="/services" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="size-3.5" /> All listings
        </Link>
      </p>
    </div>
  )
}

function ContactLines({ email, phone }: { email: string; phone: string }) {
  return (
    <div className="space-y-1.5 text-[13px]">
      <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-muted hover:text-fg">
        <Phone className="size-4" /> <span className="tabular">{phone}</span>
      </a>
      <a href={`mailto:${email}`} className="flex min-w-0 items-center gap-2 text-muted hover:text-fg">
        <Mail className="size-4 shrink-0" /> <span className="truncate">{email}</span>
      </a>
    </div>
  )
}
