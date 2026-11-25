/**
 * Core real-estate entities shared by several modules (Dashboard, Sales, Services, Finance, Marketing).
 * Module-only entities (tenancies, campaigns, tasks, events, payroll…) live in `src/types/<module>.ts`.
 * All amounts are AED.
 */

export type ListingPurpose = 'sale' | 'rent'
export type ListingStatus = 'draft' | 'active' | 'under-offer' | 'sold' | 'rented' | 'withdrawn'
export type PropertyType = 'Apartment' | 'Villa' | 'Townhouse' | 'Penthouse' | 'Studio' | 'Office'

/** A unit the agency markets (secondary market or rental). */
export interface Listing {
  id: string
  /** Agency reference, e.g. AA-S-2601 */
  ref: string
  purpose: ListingPurpose
  status: ListingStatus
  title: string
  propertyType: PropertyType
  communitySlug: string
  building: string
  beds: number
  baths: number
  sqft: number
  /** Asking price (sale) or annual rent (rent) */
  price: number
  /** Seller / landlord (customer id) */
  ownerId: string
  /** Listing broker (employee id) */
  agentId: string
  /** DLD Trakheesi permit number */
  permit: string
  furnishing: 'furnished' | 'unfurnished' | 'partly'
  /** Cheques accepted (rent) */
  cheques: number | null
  images: string[]
  listedAt: string
  /** Portal stats (Property Finder + Bayut + Dubizzle) */
  views: number
  enquiries: number
  /** Exclusive mandate with the owner */
  exclusive: boolean
  /** Id of the matching website listing, when it came from the website */
  siteId?: string
}

export type OffPlanStatus = 'launching' | 'selling' | 'sold-out' | 'completed'

/** Off-plan project the agency sells on behalf of a developer. */
export interface OffPlanProject {
  id: string
  name: string
  developerSlug: string
  communitySlug: string
  image: string
  handover: string
  /** Starting price */
  fromPrice: number
  /** Payment plan summary, e.g. "60/40" */
  plan: string
  status: OffPlanStatus
  totalUnits: number
  /** Units the agency has been allocated */
  allocated: number
  /** Developer commission paid to the agency, % of price */
  commissionRate: number
}

export type DealType = 'sale' | 'rent' | 'offplan'
/**
 * Deal stages. Sales/off-plan: offer → MOU (Form F) → NOC → transfer → closed.
 * Rentals: offer → contract → Ejari → closed (they skip NOC/transfer).
 */
export type DealStage = 'offer' | 'mou' | 'noc' | 'transfer' | 'contract' | 'ejari' | 'closed' | 'cancelled'
export type LeadSource = 'property-finder' | 'bayut' | 'dubizzle' | 'website' | 'instagram' | 'google' | 'whatsapp' | 'referral' | 'walk-in'

export interface Deal {
  id: string
  code: string
  type: DealType
  stage: DealStage
  /** Secondary/rental unit */
  listingId: string | null
  /** Off-plan project */
  projectId: string | null
  communitySlug: string
  /** Buyer / tenant */
  clientId: string
  /** Seller / landlord / developer (customer id) */
  counterpartyId: string
  /** Selling broker */
  agentId: string
  /** Sale price or annual rent */
  price: number
  /** Agency commission, % of price (2% sale, 5% rent, 3–7% off-plan) */
  commissionRate: number
  /** Gross commission income (AED) = price × rate */
  commission: number
  /** Commission collected so far */
  collected: number
  /** Broker's share of the commission, % */
  agentSplit: number
  source: LeadSource
  createdAt: string
  expectedCloseDate: string
  closedAt: string | null
  notes: string
}

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'viewing' | 'negotiation' | 'won' | 'lost'
export type LeadInterest = 'buy' | 'rent' | 'offplan' | 'sell' | 'list-rental'
export type Priority = 'low' | 'medium' | 'high'

export interface Lead {
  id: string
  code: string
  name: string
  email: string
  phone: string
  source: LeadSource
  stage: LeadStage
  interest: LeadInterest
  communitySlug: string
  propertyType: PropertyType
  beds: number
  /** Budget (sale price or annual rent) */
  budget: number
  /** Expected commission if won */
  value: number
  ownerId: string
  priority: Priority
  createdAt: string
  lastActivityAt: string
  notes: string
  /** Set when converted */
  customerId: string | null
  lostReason?: string
}

export type ViewingStatus = 'scheduled' | 'completed' | 'no-show' | 'cancelled'

export interface Viewing {
  id: string
  listingId: string | null
  projectId: string | null
  /** Lead or client being shown around */
  leadId: string | null
  clientId: string | null
  agentId: string
  /** ISO date-time */
  at: string
  status: ViewingStatus
  feedback: string
  /** 1–5 interest after the viewing */
  interest: number | null
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'

export interface InvoiceItem {
  description: string
  qty: number
  unitPrice: number
}

/** Commission invoice (to a buyer/seller/landlord/tenant or a developer). */
export interface Invoice {
  id: string
  number: string
  customerId: string
  dealId: string | null
  issueDate: string
  dueDate: string
  items: InvoiceItem[]
  /** VAT % (UAE standard 5) */
  taxRate: number
  paid: number
  status: InvoiceStatus
  notes: string
}

export type PaymentMethod = 'bank-transfer' | 'cheque' | 'card' | 'cash' | 'manager-cheque'

export interface Payment {
  id: string
  number: string
  invoiceId: string | null
  dealId: string | null
  customerId: string
  amount: number
  method: PaymentMethod
  date: string
  reference: string
  receivedById: string
}
