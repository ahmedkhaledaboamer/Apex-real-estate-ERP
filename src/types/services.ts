/**
 * Services module: property management (tenancies, rent cheques, maintenance) and
 * valuations / mortgage referrals. All amounts are AED.
 */
import type { PropertyType, Priority } from './domain'

export type ChequeStatus = 'pending' | 'cleared' | 'bounced'

export interface RentCheque {
  /** 1-based cheque number within the tenancy term */
  no: number
  /** yyyy-mm-dd */
  dueDate: string
  amount: number
  /** Post-dated cheque number */
  chequeNo: string
  bank: string
  status: ChequeStatus
}

export type TenancyStatus = 'active' | 'expiring' | 'renewal-pending' | 'ended'

/** A unit the agency manages for a landlord, with its current tenancy contract. */
export interface Tenancy {
  id: string
  code: string
  /** Rental listing the unit came from (null when entered as free text) */
  listingId: string | null
  /** Free-text unit, e.g. "Marina Gate 1, apt 2304" — used when listingId is null */
  unit: string
  communitySlug: string
  landlordId: string
  tenantId: string
  annualRent: number
  /** yyyy-mm-dd */
  startDate: string
  /** yyyy-mm-dd */
  endDate: string
  cheques: RentCheque[]
  ejariNo: string
  securityDeposit: number
  /** Management fee, % of annual rent */
  managementFeePct: number
  status: TenancyStatus
  /** Property manager (employee id) */
  managerId: string
  notes: string
}

export type MaintenanceCategory = 'ac' | 'plumbing' | 'electrical' | 'cleaning' | 'painting' | 'other'
export type MaintenanceStatus = 'open' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'

export interface MaintenanceRequest {
  id: string
  code: string
  tenancyId: string
  title: string
  description: string
  category: MaintenanceCategory
  priority: Priority
  /** Maintenance vendor (supplier id) */
  vendorId: string | null
  /** yyyy-mm-dd */
  reportedAt: string
  scheduledAt: string | null
  completedAt: string | null
  /** Job cost (AED, billed to the landlord) */
  cost: number
  status: MaintenanceStatus
}

export type ValuationPurpose = 'sale' | 'refinance' | 'insurance'
export type ValuationStatus = 'new' | 'scheduled' | 'completed'

export interface ValuationRequest {
  id: string
  code: string
  clientId: string
  communitySlug: string
  building: string
  propertyType: PropertyType
  beds: number
  sqft: number
  purpose: ValuationPurpose
  /** yyyy-mm-dd */
  requestedAt: string
  /** Inspection date (yyyy-mm-dd) */
  scheduledAt: string | null
  /** Valuer (broker employee id) */
  valuerId: string
  estimateLow: number | null
  estimateHigh: number | null
  status: ValuationStatus
  /** yyyy-mm-dd */
  reportDate: string | null
  notes: string
}

export type MortgageStatus = 'referred' | 'pre-approved' | 'approved' | 'disbursed' | 'declined'

export interface MortgageReferral {
  id: string
  code: string
  clientId: string
  bank: string
  propertyPrice: number
  /** Loan-to-value, % */
  ltvPct: number
  loanAmount: number
  status: MortgageStatus
  /** Referral fee paid to the agency on disbursement (AED) */
  referralFee: number
  /** Referring broker (employee id) */
  brokerId: string
  /** Mortgage partner (supplier id, category mortgage) */
  partnerId: string
  /** yyyy-mm-dd */
  referredAt: string
  notes: string
}
