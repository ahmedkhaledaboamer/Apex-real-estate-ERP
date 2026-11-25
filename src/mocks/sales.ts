import { createResource } from '@/api/resource'
import { createRng, daysFromNow } from '@/lib/random'
import { DEAL_FLOW } from '@/lib/labels'
import type { Deal, DealType } from '@/types/domain'
import type { ClientNote, DealDocItem, DealDocs, DealDocTemplate } from '@/types/sales'
import { brokers, customers } from './core'
import { deals, invoices, leads, listings, offplanProjects, payments, viewings } from './domain'

/* Sales module data: per-deal documents checklist (+ activity log) and client notes. */

/** Documents collected for each deal type, with the stage by which each is normally in hand. */
export const DEAL_DOC_TEMPLATES: Record<DealType, DealDocTemplate[]> = {
  sale: [
    { key: 'form-a', label: 'Form A — seller listing agreement', stage: 'offer' },
    { key: 'form-b', label: 'Form B — buyer agreement', stage: 'offer' },
    { key: 'ids', label: 'Passport / Emirates ID copies (both parties)', stage: 'offer' },
    { key: 'title-deed', label: 'Title deed copy', stage: 'offer' },
    { key: 'form-f', label: 'Form F (MOU) signed', stage: 'mou' },
    { key: 'deposit', label: '10% security deposit cheque', stage: 'mou' },
    { key: 'noc', label: 'Developer NOC issued', stage: 'noc' },
    { key: 'mortgage', label: 'Mortgage clearance / bank valuation', stage: 'noc' },
    { key: 'trustee', label: 'DLD trustee appointment booked', stage: 'transfer' },
    { key: 'new-deed', label: 'New title deed issued', stage: 'closed' },
  ],
  rent: [
    { key: 'form-a', label: 'Form A — landlord agreement', stage: 'offer' },
    { key: 'form-b', label: 'Form B — tenant agreement', stage: 'offer' },
    { key: 'ids', label: 'Tenant passport, visa & Emirates ID', stage: 'offer' },
    { key: 'title-deed', label: 'Title deed copy', stage: 'offer' },
    { key: 'contract', label: 'Tenancy contract signed', stage: 'contract' },
    { key: 'deposit', label: 'Security deposit cheque', stage: 'contract' },
    { key: 'cheques', label: 'Rent cheques collected', stage: 'contract' },
    { key: 'ejari', label: 'Ejari registered', stage: 'ejari' },
    { key: 'dewa', label: 'DEWA transfer', stage: 'ejari' },
    { key: 'keys', label: 'Keys handed over', stage: 'closed' },
  ],
  offplan: [
    { key: 'eoi', label: 'EOI / booking form', stage: 'offer' },
    { key: 'ids', label: 'Buyer passport & Emirates ID', stage: 'offer' },
    { key: 'booking', label: 'Booking deposit paid', stage: 'offer' },
    { key: 'spa', label: 'SPA / reservation agreement signed', stage: 'mou' },
    { key: 'oqood', label: 'Oqood registration', stage: 'closed' },
    { key: 'dev-invoice', label: 'Commission invoice to developer', stage: 'closed' },
  ],
}

/** Checklist for a deal: the stored record, or a default derived from how far the deal has progressed. */
export function dealChecklist(deal: Pick<Deal, 'type' | 'stage' | 'createdAt' | 'closedAt'>, stored?: DealDocs): DealDocItem[] {
  if (stored) return stored.items
  const flow = DEAL_FLOW[deal.type]
  const reached = deal.stage === 'cancelled' ? 0 : flow.indexOf(deal.stage)
  return DEAL_DOC_TEMPLATES[deal.type].map((t) => {
    const idx = flow.indexOf(t.stage)
    // Documents of earlier stages are in; current-stage documents are still being collected (closed = all in).
    const done = deal.stage === 'closed' || idx < reached
    return { key: t.key, label: t.label, done, doneAt: done ? (deal.closedAt ?? deal.createdAt) : null }
  })
}

export const dealDocs = createResource<DealDocs>('re-deal-docs', () => [], { label: 'Checklist' })

/* ------------------------------------------------------------------ */
/*  Client notes                                                        */
/* ------------------------------------------------------------------ */
const NOTE_TEXT: Record<string, string[]> = {
  buyer: ['Looking for a 2BR with a full marina view, budget flexible for the right unit', 'Mortgage pre-approval received from ENBD', 'Prefers ready units — no off-plan', 'Wants to move before the school year starts'],
  seller: ['Open to offers 5% below asking if cash', 'Tenant in place until March — vacant on transfer', 'Needs the NOC fee confirmed by the developer', 'Asked for a fresh valuation'],
  landlord: ['Accepts 2 cheques max', 'Prefers family tenants, no sharing', 'Asked about our property management package', 'Renewal due — wants a 5% increase within the RERA index'],
  tenant: ['Company lease, HR will sign', 'Needs a pet-friendly building', 'Moving from Abu Dhabi — wants viewings on weekends', 'Asked for 4 cheques'],
  investor: ['Interested in Golden Visa threshold (AED 2M)', 'Wants yield above 7% net', 'Follow up on the next Emaar launch', 'Holding portfolio of 4 units — may sell one'],
  developer: ['Commission statement sent for Q3', 'New launch allocation confirmed', 'Agency agreement renewed for 12 months'],
}

function makeNotes(): ClientNote[] {
  const r = createRng(1101)
  const team = brokers()
  const out: ClientNote[] = []
  let n = 0
  for (const c of customers.collection.all()) {
    if (!r.bool(0.55)) continue
    const count = r.int(1, 3)
    for (let i = 0; i < count; i++) {
      n += 1
      out.push({
        id: `cnote-${n}`,
        customerId: c.id,
        kind: r.weighted([['note', 3], ['call', 4], ['whatsapp', 3], ['meeting', 2], ['email', 1]] as const),
        text: r.pick(NOTE_TEXT[c.type] ?? NOTE_TEXT.buyer!),
        authorId: r.bool(0.7) ? c.ownerId : r.pick(team).id,
        at: daysFromNow(-r.int(0, 120), r.int(9, 19), r.pick([0, 15, 30, 45])),
      })
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

export const clientNotes = createResource<ClientNote>('re-client-notes', makeNotes, { label: 'Note' })

/**
 * Domain seeds (deals, invoices, viewings…) pick customers/leads by position from the live collections.
 * If a client or lead is created before those seeds have run, every pick shifts and the new record
 * inherits seeded history. Materialise all seeds first, before creating records they depend on.
 */
export function materializeSeeds() {
  for (const c of [listings, offplanProjects, deals, leads, viewings, invoices, payments, clientNotes]) c.collection.all()
}
