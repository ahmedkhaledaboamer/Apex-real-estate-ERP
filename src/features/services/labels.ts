import type { KanbanColumn } from '@/components/ui/Kanban'
import type { Status } from '@/types/core'
import type { ChequeStatus, MaintenanceCategory, MaintenanceStatus, MortgageStatus, TenancyStatus, ValuationPurpose, ValuationStatus } from '@/types/services'

export const TENANCY_STATUS: Record<TenancyStatus, readonly [string, Status]> = {
  active: ['Active', 'success'],
  expiring: ['Expiring', 'warning'],
  'renewal-pending': ['Renewal pending', 'danger'],
  ended: ['Ended', 'neutral'],
}

export const CHEQUE_STATUS: Record<ChequeStatus, readonly [string, Status]> = {
  pending: ['Pending', 'info'],
  cleared: ['Cleared', 'success'],
  bounced: ['Bounced', 'danger'],
}

export const MAINTENANCE_CATEGORY: Record<MaintenanceCategory, string> = {
  ac: 'AC',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  cleaning: 'Cleaning',
  painting: 'Painting',
  other: 'Other',
}

export const MAINTENANCE_STATUS: Record<MaintenanceStatus, readonly [string, Status]> = {
  open: ['Open', 'info'],
  scheduled: ['Scheduled', 'brand'],
  'in-progress': ['In progress', 'warning'],
  completed: ['Completed', 'success'],
  cancelled: ['Cancelled', 'neutral'],
}

export const MAINTENANCE_COLUMNS: KanbanColumn<MaintenanceStatus>[] = [
  { id: 'open', title: 'Open', dot: 'bg-info' },
  { id: 'scheduled', title: 'Scheduled', dot: 'bg-aura' },
  { id: 'in-progress', title: 'In progress', dot: 'bg-warning' },
  { id: 'completed', title: 'Completed', dot: 'bg-success' },
  { id: 'cancelled', title: 'Cancelled', dot: 'bg-muted' },
]

export const VALUATION_PURPOSE: Record<ValuationPurpose, string> = { sale: 'Sale', refinance: 'Refinance', insurance: 'Insurance' }

export const VALUATION_STATUS: Record<ValuationStatus, readonly [string, Status]> = {
  new: ['New', 'info'],
  scheduled: ['Inspection booked', 'warning'],
  completed: ['Report issued', 'success'],
}

export const MORTGAGE_STATUS: Record<MortgageStatus, readonly [string, Status]> = {
  referred: ['Referred', 'info'],
  'pre-approved': ['Pre-approved', 'brand'],
  approved: ['Approved', 'warning'],
  disbursed: ['Disbursed', 'success'],
  declined: ['Declined', 'danger'],
}

export const FURNISHING: Record<'furnished' | 'unfurnished' | 'partly', string> = { furnished: 'Furnished', unfurnished: 'Unfurnished', partly: 'Partly furnished' }
