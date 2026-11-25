/** Shared entities used across modules. Module-specific types live in `src/types/<module>.ts`. */

export type DepartmentId = 'management' | 'sales' | 'leasing' | 'offplan' | 'marketing' | 'property-management' | 'finance' | 'hr' | 'admin'

export interface Department {
  id: DepartmentId
  name: string
  headId: string
  color: string
}

export type EmploymentStatus = 'active' | 'on-leave' | 'probation' | 'terminated'

export interface Employee {
  id: string
  code: string
  name: string
  email: string
  phone: string
  avatarHue: number
  /** Real photo (website agents) — falls back to initials */
  photo?: string
  title: string
  departmentId: DepartmentId
  managerId: string | null
  status: EmploymentStatus
  joinDate: string
  nationality: string
  /** Monthly basic salary, AED */
  salary: number
  /** Monthly allowances, AED */
  allowances: number
  leaveBalance: number
  /** Broker Registration Number (RERA) — brokers only */
  brn: string | null
  /** RERA broker card expiry (yyyy-mm-dd) — brokers only */
  reraExpiry: string | null
  /** Broker's share of the agency commission, % (e.g. 50) — brokers only */
  commissionSplit: number | null
  languages: string[]
  /** Community slugs the broker specialises in */
  communities: string[]
}

/** Clients: buyers, sellers, landlords, tenants, investors and developers (who pay off-plan commission). */
export type CustomerType = 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor' | 'developer'

export interface Customer {
  id: string
  code: string
  name: string
  type: CustomerType
  email: string
  phone: string
  nationality: string
  /** City of residence */
  city: string
  /** Assigned broker (employee id) */
  ownerId: string
  createdAt: string
  tags: string[]
  /** Developer slug when type = developer */
  developerSlug?: string
  avatarHue: number
}

/** Vendors and partners the agency pays (or works with). */
export type SupplierCategory = 'portal' | 'marketing' | 'photography' | 'maintenance' | 'conveyancing' | 'legal' | 'mortgage' | 'office' | 'it'

export interface Supplier {
  id: string
  code: string
  name: string
  category: SupplierCategory
  country: string
  city: string
  contactName: string
  email: string
  phone: string
  /** Credit terms, days */
  paymentTerms: number
  rating: number
  /** Outstanding payable, AED */
  balance: number
  active: boolean
}

/** A Dubai community/area (from the website data). */
export interface Community {
  slug: string
  name: string
  /** Area cluster used for grouping in reports */
  zone: 'Coastal' | 'Central' | 'Suburban' | 'Waterfront'
  image: string
  /** Average AED per sq ft */
  ppsf: number | null
  yieldPct: number | null
}

export type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand'
