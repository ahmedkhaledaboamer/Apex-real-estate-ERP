export type Role = 'admin' | 'sales-manager' | 'broker' | 'leasing' | 'accountant' | 'hr' | 'marketing' | 'viewer'
export type ModuleKey = 'dashboard' | 'sales' | 'marketing' | 'services' | 'projects' | 'events' | 'finance' | 'hr' | 'settings'
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export'
/** Currencies of the agency's main investor markets (prices are always quoted in AED). */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'SAR' | 'INR' | 'RUB' | 'CNY'
export type ThemePreference = 'light' | 'dark' | 'system'

export interface CompanyProfile {
  name: string
  tradeName: string
  /** FTA VAT registration number (15 digits) */
  trn: string
  /** DED (Dubai Economy & Tourism) trade licence number */
  licenseNo: string
  /** RERA Office Registration Number */
  reraOrn: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  /** 1–12 */
  fiscalYearStart: number
  baseCurrency: 'AED'
  /** Uploaded logo (data URL); the built-in mark is used when empty */
  logoDataUrl?: string
}

/** Default commission rules used when creating deals and payouts. */
export interface CommissionSettings {
  /** Secondary sale commission, % of price */
  saleRate: number
  /** Rental commission, % of annual rent */
  rentRate: number
  /** Minimum rental commission, AED */
  minRentCommission: number
  /** Default developer commission on off-plan sales, % */
  offplanRate: number
  /** Default broker share of the agency commission, % */
  brokerSplit: number
  /** Senior / luxury consultant split, % */
  seniorSplit: number
  /** Team-lead split, % */
  leadSplit: number
}

export interface NotificationPref {
  inApp: boolean
  email: boolean
}

/** Single-record settings document (id "app"). */
export interface AppSettings {
  id: string
  company: CompanyProfile
  /** employeeId → role */
  userRoles: Record<string, Role>
  permissions: Record<Role, Record<ModuleKey, PermissionAction[]>>
  /** 1 AED = rate × currency */
  rates: Record<CurrencyCode, number>
  ratesUpdatedAt: string
  commission: CommissionSettings
  vatEnabled: boolean
  vatRate: number
  pricesIncludeVat: boolean
  notifications: Record<string, NotificationPref>
  theme: ThemePreference
}
