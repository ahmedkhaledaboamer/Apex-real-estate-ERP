import type { CustomerType, Status, SupplierCategory } from '@/types/core'
import type { DealStage, DealType, InvoiceStatus, LeadInterest, LeadSource, LeadStage, ListingPurpose, ListingStatus, OffPlanStatus, PaymentMethod, Priority, ViewingStatus } from '@/types/domain'

/** Status → [label, badge tone]. Use with <StatusBadge value={…} map={…} />. */
export const DEAL_STAGE: Record<DealStage, readonly [string, Status]> = {
  offer: ['Offer', 'info'],
  mou: ['MOU signed', 'brand'],
  noc: ['NOC', 'brand'],
  transfer: ['Transfer', 'warning'],
  contract: ['Tenancy contract', 'brand'],
  ejari: ['Ejari', 'warning'],
  closed: ['Closed', 'success'],
  cancelled: ['Cancelled', 'danger'],
}
/** Stage order per deal type (for pipelines and progress strips). */
export const DEAL_FLOW: Record<DealType, DealStage[]> = {
  sale: ['offer', 'mou', 'noc', 'transfer', 'closed'],
  rent: ['offer', 'contract', 'ejari', 'closed'],
  offplan: ['offer', 'mou', 'closed'],
}
export const DEAL_TYPE: Record<DealType, string> = { sale: 'Sale', rent: 'Rental', offplan: 'Off-plan' }

export const LISTING_STATUS: Record<ListingStatus, readonly [string, Status]> = {
  draft: ['Draft', 'neutral'],
  active: ['Active', 'success'],
  'under-offer': ['Under offer', 'warning'],
  sold: ['Sold', 'brand'],
  rented: ['Rented', 'brand'],
  withdrawn: ['Withdrawn', 'neutral'],
}
export const LISTING_PURPOSE: Record<ListingPurpose, string> = { sale: 'For sale', rent: 'For rent' }
export const OFFPLAN_STATUS: Record<OffPlanStatus, readonly [string, Status]> = {
  launching: ['Launching', 'info'],
  selling: ['Selling', 'success'],
  'sold-out': ['Sold out', 'neutral'],
  completed: ['Completed', 'brand'],
}

export const INVOICE_STATUS: Record<InvoiceStatus, readonly [string, Status]> = {
  draft: ['Draft', 'neutral'],
  sent: ['Sent', 'info'],
  partial: ['Partially paid', 'warning'],
  paid: ['Paid', 'success'],
  overdue: ['Overdue', 'danger'],
  void: ['Void', 'neutral'],
}
export const LEAD_STAGE: Record<LeadStage, readonly [string, Status]> = {
  new: ['New', 'info'],
  contacted: ['Contacted', 'brand'],
  qualified: ['Qualified', 'brand'],
  viewing: ['Viewing', 'warning'],
  negotiation: ['Negotiation', 'warning'],
  won: ['Won', 'success'],
  lost: ['Lost', 'danger'],
}
export const LEAD_INTEREST: Record<LeadInterest, string> = { buy: 'Buy', rent: 'Rent', offplan: 'Off-plan', sell: 'Sell', 'list-rental': 'List for rent' }
export const VIEWING_STATUS: Record<ViewingStatus, readonly [string, Status]> = {
  scheduled: ['Scheduled', 'info'],
  completed: ['Completed', 'success'],
  'no-show': ['No-show', 'danger'],
  cancelled: ['Cancelled', 'neutral'],
}
export const PRIORITY: Record<Priority, readonly [string, Status]> = {
  low: ['Low', 'neutral'],
  medium: ['Medium', 'warning'],
  high: ['High', 'danger'],
}

export const LEAD_SOURCE: Record<LeadSource, string> = {
  'property-finder': 'Property Finder',
  bayut: 'Bayut',
  dubizzle: 'Dubizzle',
  website: 'Website',
  instagram: 'Instagram',
  google: 'Google Ads',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  'walk-in': 'Walk-in',
}
export const CUSTOMER_TYPE: Record<CustomerType, string> = { buyer: 'Buyer', seller: 'Seller', landlord: 'Landlord', tenant: 'Tenant', investor: 'Investor', developer: 'Developer' }
export const SUPPLIER_CATEGORY: Record<SupplierCategory, string> = {
  portal: 'Listing portal',
  marketing: 'Advertising',
  photography: 'Photography & media',
  maintenance: 'Maintenance',
  conveyancing: 'Conveyancing',
  legal: 'Legal',
  mortgage: 'Mortgage broker',
  office: 'Office & facilities',
  it: 'IT & software',
}
export const PAYMENT_METHOD: Record<PaymentMethod, string> = { 'bank-transfer': 'Bank transfer', cheque: 'Cheque', 'manager-cheque': "Manager's cheque", card: 'Card', cash: 'Cash' }

/** Turn a label map into <Select> options. */
export function optionsOf(map: Record<string, string | readonly [string, Status]>) {
  return Object.entries(map).map(([value, v]) => ({ value, label: typeof v === 'string' ? v : v[0] }))
}
