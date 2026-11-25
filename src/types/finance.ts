/** Accounts & Finance: operating expenses, bank/cash accounts and broker commission payouts. All amounts AED. */
import type { PaymentMethod } from './domain'

export type ExpenseCategory = 'rent' | 'salaries' | 'portals' | 'advertising' | 'media' | 'licensing' | 'software' | 'utilities' | 'office' | 'legal' | 'conveyancing'
export type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected'

export interface Expense {
  id: string
  number: string
  /** Expense / bill date (yyyy-mm-dd) — drives the P&L period */
  date: string
  category: ExpenseCategory
  /** Vendor (supplier id) when the payee is a registered vendor */
  supplierId: string | null
  /** Payee shown on the record (vendor name, DLD, DEWA, WPS payroll…) */
  payee: string
  description: string
  /** Net amount excl. VAT */
  amount: number
  /** VAT % (5, or 0 for salaries and government fees) */
  vatRate: number
  status: ExpenseStatus
  /** Account it is (or will be) paid from */
  accountId: string
  method: PaymentMethod
  /** Supplier invoice / bill reference */
  reference: string
  submittedById: string
  approvedById: string | null
  /** yyyy-mm-dd */
  paidAt: string | null
  recurring: boolean
  notes: string
}

export type AccountKind = 'current' | 'escrow' | 'petty-cash' | 'card-clearing'

export interface Account {
  id: string
  name: string
  bank: string
  kind: AccountKind
  /** Masked IBAN / identifier */
  iban: string
  /** Balance at `openingDate` (yyyy-mm-dd) */
  openingBalance: number
  openingDate: string
  /** Held on behalf of clients (escrow) — not agency funds */
  clientMoney: boolean
}

export type PayoutStatus = 'pending' | 'approved' | 'paid'

/** Broker commission payout for a closed deal (= deal commission × broker split). */
export interface CommissionPayout {
  id: string
  dealId: string
  brokerId: string
  amount: number
  status: PayoutStatus
  approvedAt: string | null
  /** yyyy-mm-dd */
  paidAt: string | null
  reference: string
}
