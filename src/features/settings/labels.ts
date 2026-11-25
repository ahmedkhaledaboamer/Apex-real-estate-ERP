import type { Status } from '@/types/core'
import type { CurrencyCode, ModuleKey, PermissionAction, Role } from '@/types/settings'

export const ROLE: Record<Role, readonly [string, Status]> = {
  admin: ['Admin', 'brand'],
  'sales-manager': ['Sales Manager', 'info'],
  broker: ['Broker', 'success'],
  leasing: ['Leasing', 'info'],
  accountant: ['Accountant', 'warning'],
  hr: ['HR', 'danger'],
  marketing: ['Marketing', 'brand'],
  viewer: ['Viewer', 'neutral'],
}
export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: 'Full access to every module, including settings and data reset.',
  'sales-manager': 'Runs the sales, off-plan and listings teams: full Sales & Services, read-only Finance and HR.',
  broker: 'Own leads, deals, viewings and listings; events and tasks; no Finance or HR.',
  leasing: 'Rentals, tenancies and property management; read-only Finance.',
  accountant: 'Commission invoices, payments, expenses, broker payouts and reports.',
  hr: 'Employees, RERA cards, attendance, leave and payroll.',
  marketing: 'Campaigns, portals, listing content and events.',
  viewer: 'Read-only access to operational modules.',
}
export const MODULE_LABEL: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  marketing: 'Marketing',
  services: 'Services',
  projects: 'Projects & Tasks',
  events: 'Events',
  finance: 'Accounts & Finance',
  hr: 'HR',
  settings: 'Settings',
}
export const ACTION_LABEL: Record<PermissionAction, string> = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', export: 'Export' }

export const CURRENCY: Record<CurrencyCode, { name: string; symbol: string }> = {
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  SAR: { name: 'Saudi Riyal', symbol: 'SR' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
  RUB: { name: 'Russian Ruble', symbol: '₽' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
