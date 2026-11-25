import type { CollectionState } from '@/lib/calc'
import type { CustomerType, Status } from '@/types/core'
import type { DealStage, DealType, LeadInterest, LeadSource } from '@/types/domain'
import type { ClientNoteKind } from '@/types/sales'

/** Deal pipeline board columns (stages of the different deal types share a column). */
export type PipelineColumn = 'offer' | 'signed' | 'clearance' | 'transfer' | 'closed'
export const PIPELINE_COLUMNS: { id: PipelineColumn; title: string; dot: string }[] = [
  { id: 'offer', title: 'Offer', dot: 'bg-info' },
  { id: 'signed', title: 'MOU / Contract', dot: 'bg-aura' },
  { id: 'clearance', title: 'NOC / Ejari', dot: 'bg-indigo' },
  { id: 'transfer', title: 'Transfer', dot: 'bg-warning' },
  { id: 'closed', title: 'Closed', dot: 'bg-success' },
]
export const STAGE_COLUMN: Record<DealStage, PipelineColumn | null> = {
  offer: 'offer',
  mou: 'signed',
  contract: 'signed',
  noc: 'clearance',
  ejari: 'clearance',
  transfer: 'transfer',
  closed: 'closed',
  cancelled: null,
}
/** Which stage a deal of a given type takes when dropped on a column (null = not part of that type's flow). */
export const COLUMN_STAGE: Record<DealType, Record<PipelineColumn, DealStage | null>> = {
  sale: { offer: 'offer', signed: 'mou', clearance: 'noc', transfer: 'transfer', closed: 'closed' },
  rent: { offer: 'offer', signed: 'contract', clearance: 'ejari', transfer: null, closed: 'closed' },
  offplan: { offer: 'offer', signed: 'mou', clearance: null, transfer: null, closed: 'closed' },
}

export const COLLECTION_STATE: Record<CollectionState, readonly [string, Status]> = {
  uncollected: ['Uncollected', 'warning'],
  partial: ['Partially collected', 'info'],
  collected: ['Collected', 'success'],
}

export const CUSTOMER_TYPE_TONE: Record<CustomerType, readonly [string, Status]> = {
  buyer: ['Buyer', 'brand'],
  seller: ['Seller', 'warning'],
  landlord: ['Landlord', 'info'],
  tenant: ['Tenant', 'success'],
  investor: ['Investor', 'brand'],
  developer: ['Developer', 'neutral'],
}

/** Client type created when a lead with this interest is converted. */
export const INTEREST_TO_CUSTOMER: Record<LeadInterest, CustomerType> = {
  buy: 'buyer',
  offplan: 'buyer',
  rent: 'tenant',
  sell: 'seller',
  'list-rental': 'landlord',
}

/** Portal chips get their brand-ish colour; other sources stay neutral. */
export const SOURCE_TONE: Partial<Record<LeadSource, string>> = {
  'property-finder': 'bg-[#ef5e4e]/10 text-[#d1483a] ring-[#ef5e4e]/25 dark:text-[#f59084]',
  bayut: 'bg-[#28b16d]/10 text-[#1f9358] ring-[#28b16d]/25 dark:text-[#5fd39a]',
  dubizzle: 'bg-[#e0262b]/10 text-[#c41e23] ring-[#e0262b]/25 dark:text-[#f2787b]',
}

export const LOST_REASONS = ['Budget too low', 'Bought through another agency', 'Plans postponed', 'No response', 'Mortgage not approved', 'Chose a different community', 'Not a genuine enquiry']

export const NOTE_KIND: Record<ClientNoteKind, string> = { note: 'Note', call: 'Call', meeting: 'Meeting', whatsapp: 'WhatsApp', email: 'Email' }

/** Default commission rate by deal type (off-plan comes from the project). */
export const DEFAULT_RATE: Record<DealType, number> = { sale: 2, rent: 5, offplan: 5 }
