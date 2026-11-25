import { communityBySlug } from '@/mocks/core'
import { listingById, offplanById } from '@/mocks/domain'
import type { AgencyEvent } from '@/types/events'

/** What the event promotes (off-plan project, listing or community) with a photo for cards. */
export function eventSubject(e: Pick<AgencyEvent, 'projectId' | 'listingId' | 'communitySlug'>) {
  const op = offplanById(e.projectId)
  const l = listingById(e.listingId)
  const c = communityBySlug(e.communitySlug ?? op?.communitySlug ?? l?.communitySlug)
  if (op) return { kind: 'Off-plan project' as const, label: op.name, sub: c?.name, image: op.image }
  if (l) return { kind: 'Listing' as const, label: l.title, sub: `${l.ref} · ${c?.name ?? ''}`, image: l.images[0] ?? c?.image }
  if (c) return { kind: 'Community' as const, label: c.name, sub: c.zone, image: c.image }
  return null
}

export const goingCount = (e: Pick<AgencyEvent, 'attendees'>) => e.attendees.length
export const attendedCount = (e: Pick<AgencyEvent, 'attendees'>) => e.attendees.filter((a) => a.status === 'attended').length
