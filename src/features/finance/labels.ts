import { appSettings } from '@/mocks/settings'
import type { Status } from '@/types/core'
import type { AccountKind, ExpenseCategory, ExpenseStatus, PayoutStatus } from '@/types/finance'

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  salaries: 'Salaries & allowances',
  rent: 'Office rent',
  portals: 'Listing portals',
  advertising: 'Advertising',
  media: 'Photography & media',
  licensing: 'RERA & DLD fees',
  software: 'Software & CRM',
  utilities: 'Utilities & telecom',
  office: 'Office & pantry',
  legal: 'Legal & professional',
  conveyancing: 'Conveyancing',
}
/** Stable colour per category (charts, dots). */
export const EXPENSE_COLOR: Record<ExpenseCategory, string> = {
  salaries: '#843f96',
  rent: '#275ba8',
  portals: '#3cb4e8',
  advertising: '#d9891a',
  media: '#563d96',
  licensing: '#1f9d64',
  software: '#a97cc4',
  utilities: '#6b8fc9',
  office: '#b98a5e',
  legal: '#d64545',
  conveyancing: '#5fb3a1',
}
export const EXPENSE_STATUS: Record<ExpenseStatus, readonly [string, Status]> = {
  pending: ['Pending approval', 'warning'],
  approved: ['Approved', 'info'],
  paid: ['Paid', 'success'],
  rejected: ['Rejected', 'danger'],
}
export const PAYOUT_STATUS: Record<PayoutStatus, readonly [string, Status]> = {
  pending: ['Pending', 'neutral'],
  approved: ['Approved', 'info'],
  paid: ['Paid', 'success'],
}
export const ACCOUNT_KIND: Record<AccountKind, string> = {
  current: 'Operating account',
  escrow: 'Client money · escrow',
  'petty-cash': 'Petty cash',
  'card-clearing': 'Card settlements',
}
export const BILL_TO: Record<'developer' | 'client', readonly [string, Status]> = {
  developer: ['Developer', 'brand'],
  client: ['Client', 'info'],
}

/** Letterhead details printed on tax invoices — read live from Settings → Company profile. */
const co = () => appSettings().company
export const COMPANY = {
  get name() {
    return co().tradeName
  },
  get legalName() {
    return co().name
  },
  get address() {
    return co().address
  },
  get city() {
    return `${co().city}, ${co().country}`
  },
  get phone() {
    return co().phone
  },
  get email() {
    return co().email
  },
  get website() {
    return co().website.replace(/^www\./, '')
  },
  get trn() {
    return co().trn.replace(/^(\d{3})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4')
  },
  get orn() {
    return `ORN ${co().reraOrn}`
  },
  get licence() {
    return `DED Licence ${co().licenseNo}`
  },
}
export const BANK = {
  bank: 'Emirates NBD',
  accountName: 'Apex Aora Real Estate LLC',
  iban: 'AE07 0260 0010 1534 7894 471',
  swift: 'EBILAEAD',
  branch: 'Business Bay Branch, Dubai',
}
