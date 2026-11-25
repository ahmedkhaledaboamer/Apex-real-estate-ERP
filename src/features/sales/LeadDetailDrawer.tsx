import { Link } from '@tanstack/react-router'
import { CalendarPlus, Mail, Pencil, Phone, ThumbsDown, UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { DetailRow } from '@/components/ui/misc'
import { Drawer } from '@/components/ui/Overlay'
import { formatDate, formatMoney, formatMoneyCompact, formatRelative } from '@/lib/format'
import { LEAD_INTEREST, LEAD_STAGE, optionsOf, PRIORITY, VIEWING_STATUS } from '@/lib/labels'
import { communityBySlug, customerById, employeeById } from '@/mocks/core'
import { leads, listings, offplanProjects, viewings } from '@/mocks/domain'
import type { Lead, LeadStage } from '@/types/domain'
import { ConvertModal, LostModal } from './LeadModals'
import { fmtDay, fmtTime, matchingListings, matchingProjects, PropertyThumb, SourceChip } from './shared'
import { ViewingDrawer, type ViewingInitial } from './ViewingDrawer'

export function LeadDetailDrawer({ lead, onClose, onEdit }: { lead: Lead | null; onClose: () => void; onEdit: (l: Lead) => void }) {
  const { data: lst = [] } = listings.useList()
  const { data: projects = [] } = offplanProjects.useList()
  const { data: vws = [] } = viewings.useList()
  const update = leads.useUpdate()
  const [booking, setBooking] = useState<ViewingInitial | null>(null)
  const [converting, setConverting] = useState(false)
  const [losing, setLosing] = useState(false)

  const matches = useMemo(() => (lead ? matchingListings(lead, lst).slice(0, 6) : []), [lead, lst])
  const projMatches = useMemo(() => (lead ? matchingProjects(lead, projects).slice(0, 4) : []), [lead, projects])
  const leadViewings = useMemo(() => (lead ? vws.filter((v) => v.leadId === lead.id).sort((a, b) => b.at.localeCompare(a.at)) : []), [lead, vws])

  if (!lead) return null
  const owner = employeeById(lead.ownerId)
  const customer = customerById(lead.customerId)
  const closed = lead.stage === 'won' || lead.stage === 'lost'
  const rent = lead.interest === 'rent' || lead.interest === 'list-rental'

  const changeStage = (stage: LeadStage) => {
    if (stage === 'lost') return setLosing(true)
    if (stage === 'won' && !lead.customerId) return setConverting(true)
    update.mutate({ id: lead.id, patch: { stage, lastActivityAt: new Date().toISOString() } })
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="lg"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {lead.name} <StatusBadge value={lead.stage} map={LEAD_STAGE} />
          </span>
        }
        subtitle={`${lead.code} · created ${formatRelative(lead.createdAt)}`}
        footer={
          <>
            <Button variant="outline" icon={<Pencil />} onClick={() => onEdit(lead)}>
              Edit
            </Button>
            {!closed && (
              <Button variant="outline" icon={<ThumbsDown />} onClick={() => setLosing(true)} className="text-danger">
                Lost
              </Button>
            )}
            {!lead.customerId && (
              <Button icon={<UserCheck />} onClick={() => setConverting(true)}>
                Convert
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="soft" icon={<CalendarPlus />} onClick={() => setBooking({ leadId: lead.id, agentId: lead.ownerId })}>
              Book viewing
            </Button>
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-semibold hover:bg-surface-2">
                <Phone className="size-4" /> Call
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-semibold hover:bg-surface-2">
                <Mail className="size-4" /> Email
              </a>
            )}
            <div className="ms-auto w-full sm:w-[170px]">
              <Select value={lead.stage} onChange={(e) => changeStage(e.target.value as LeadStage)} options={optionsOf(LEAD_STAGE)} aria-label="Stage" />
            </div>
          </div>

          {customer && (
            <Link to="/sales/clients/$clientId" params={{ clientId: customer.id }} className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 p-3 hover:bg-success/10">
              <PersonCell name={customer.name} hue={customer.avatarHue} sub={`Converted · client ${customer.code}`} size={36} />
              <span className="text-[12.5px] font-semibold text-success">Open client →</span>
            </Link>
          )}
          {lead.stage === 'lost' && lead.lostReason && (
            <p className="rounded-xl border border-danger/25 bg-danger/5 p-3 text-[13px]">
              <span className="font-semibold text-danger">Lost:</span> {lead.lostReason}
            </p>
          )}

          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y divide-line">
              <DetailRow label="Interest">{LEAD_INTEREST[lead.interest]}</DetailRow>
              <DetailRow label="Looking for">
                {lead.beds ? `${lead.beds} BR ` : ''}
                {lead.propertyType}
              </DetailRow>
              <DetailRow label="Community">{communityBySlug(lead.communitySlug)?.name}</DetailRow>
              <DetailRow label={rent ? 'Rent budget' : 'Budget'}>{formatMoney(lead.budget)}</DetailRow>
              <DetailRow label="Potential commission">
                <span className="text-success">{formatMoney(lead.value)}</span>
              </DetailRow>
            </div>
            <div className="divide-y divide-line">
              <DetailRow label="Source">
                <SourceChip source={lead.source} />
              </DetailRow>
              <DetailRow label="Priority">
                <StatusBadge value={lead.priority} map={PRIORITY} />
              </DetailRow>
              <DetailRow label="Phone">{lead.phone || '—'}</DetailRow>
              <DetailRow label="Email">
                <span className="break-all">{lead.email || '—'}</span>
              </DetailRow>
              <DetailRow label="Last activity">{formatRelative(lead.lastActivityAt)}</DetailRow>
            </div>
          </div>

          {owner && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 p-3">
              <PersonCell name={owner.name} hue={owner.avatarHue} photo={owner.photo} sub={`Owner · ${owner.title}`} size={36} />
              {owner.phone && <span className="hidden text-[12.5px] text-muted sm:block">{owner.phone}</span>}
            </div>
          )}

          {lead.notes && (
            <div>
              <h4 className="mb-1.5 text-[13px] font-semibold">Notes</h4>
              <p className="text-[13.5px] whitespace-pre-line text-muted">{lead.notes}</p>
            </div>
          )}

          {/* Matching */}
          {(lead.interest === 'buy' || lead.interest === 'rent') && (
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h4 className="text-[13px] font-semibold">Matching listings</h4>
                <span className="text-[12px] text-muted">
                  {communityBySlug(lead.communitySlug)?.name} · {lead.beds ? `${Math.max(0, lead.beds - 1)}–${lead.beds + 1} BR` : 'any size'} · up to {formatMoneyCompact(lead.budget * 1.1)}
                </span>
              </div>
              {matches.length === 0 ? (
                <p className="rounded-xl bg-surface-2/70 p-4 text-center text-[13px] text-muted">No active listings match yet — widen the community or budget.</p>
              ) : (
                <ul className="space-y-2">
                  {matches.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                      <PropertyThumb image={l.images[0]} size={52} rounded="rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold">{l.title}</p>
                        <p className="truncate text-[12px] text-muted">
                          {l.ref} · {l.beds ? `${l.beds} BR` : l.propertyType} · {l.sqft.toLocaleString('en-US')} sq ft
                        </p>
                        <p className="text-[13px] font-semibold tabular">
                          {formatMoney(l.price)}
                          {l.purpose === 'rent' && <span className="font-normal text-muted"> /yr</span>}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setBooking({ leadId: lead.id, listingId: l.id, agentId: lead.ownerId })}>
                        Book
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {lead.interest === 'offplan' && (
            <section>
              <h4 className="mb-2 text-[13px] font-semibold">Matching off-plan projects</h4>
              {projMatches.length === 0 ? (
                <p className="rounded-xl bg-surface-2/70 p-4 text-center text-[13px] text-muted">No launches within budget right now.</p>
              ) : (
                <ul className="space-y-2">
                  {projMatches.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                      <PropertyThumb image={p.image} size={52} rounded="rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold">{p.name}</p>
                        <p className="truncate text-[12px] text-muted">
                          {communityBySlug(p.communitySlug)?.name} · {p.plan} · handover {p.handover}
                        </p>
                        <p className="text-[13px] font-semibold tabular">from {formatMoney(p.fromPrice)}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setBooking({ leadId: lead.id, projectId: p.id, agentId: lead.ownerId })}>
                        Book
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <h4 className="mb-2 text-[13px] font-semibold">Viewings ({leadViewings.length})</h4>
            {leadViewings.length === 0 ? (
              <p className="text-[13px] text-muted">No viewings booked yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {leadViewings.map((v) => {
                  const l = lst.find((x) => x.id === v.listingId)
                  const p = projects.find((x) => x.id === v.projectId)
                  return (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{l?.title ?? p?.name ?? '—'}</p>
                        <p className="text-[12px] text-muted tabular">
                          {fmtDay(v.at)} · {fmtTime(v.at)}
                          {v.feedback && ` · “${v.feedback}”`}
                        </p>
                      </div>
                      <StatusBadge value={v.status} map={VIEWING_STATUS} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          <p className="text-[12px] text-muted">
            Created {formatDate(lead.createdAt)} · <Badge>{lead.code}</Badge>
          </p>
        </div>
      </Drawer>

      <ViewingDrawer open={!!booking} onClose={() => setBooking(null)} initial={booking ?? undefined} />
      <ConvertModal lead={converting ? lead : null} onClose={() => setConverting(false)} />
      <LostModal lead={losing ? lead : null} onClose={() => setLosing(false)} />
    </>
  )
}
