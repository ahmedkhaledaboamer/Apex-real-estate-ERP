import { createResource } from '@/api/resource'
import { daysFromNow } from '@/lib/random'
import type { Employee } from '@/types/core'
import type { AppSettings, ModuleKey, PermissionAction, Role } from '@/types/settings'
import { employees } from './core'

/* App settings stored as a single record ("app") in the `re-settings` collection. */

export const ROLES: Role[] = ['admin', 'sales-manager', 'broker', 'leasing', 'accountant', 'hr', 'marketing', 'viewer']
/** Matches the sidebar groups in `lib/navigation.ts`. */
export const MODULES: ModuleKey[] = ['dashboard', 'sales', 'marketing', 'services', 'projects', 'events', 'finance', 'hr', 'settings']
export const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export']

export const NOTIFICATION_EVENTS = [
  { id: 'lead-assigned', label: 'New lead assigned to me', group: 'Sales' },
  { id: 'viewing-reminder', label: 'Viewing starts in 1 hour', group: 'Sales' },
  { id: 'offer-received', label: 'Offer received on my listing', group: 'Sales' },
  { id: 'deal-stage', label: 'Deal moves to MOU / NOC / transfer', group: 'Sales' },
  { id: 'deal-closed', label: 'Deal closed', group: 'Sales' },
  { id: 'listing-permit', label: 'Trakheesi permit about to expire', group: 'Listings' },
  { id: 'portal-quota', label: 'Portal listing quota almost used', group: 'Listings' },
  { id: 'offplan-launch', label: 'New off-plan launch or price list', group: 'Listings' },
  { id: 'commission-received', label: 'Commission payment received', group: 'Finance' },
  { id: 'invoice-overdue', label: 'Commission invoice becomes overdue', group: 'Finance' },
  { id: 'cheque-due', label: 'Rent cheque due (managed units)', group: 'Property management' },
  { id: 'ejari-expiry', label: 'Tenancy / Ejari expiring in 90 days', group: 'Property management' },
  { id: 'task-assigned', label: 'Task assigned to me', group: 'Projects' },
  { id: 'task-due', label: 'Task due today', group: 'Projects' },
  { id: 'rera-expiry', label: 'RERA broker card expiring in 30 days', group: 'HR' },
  { id: 'leave-request', label: 'Leave request awaiting my approval', group: 'HR' },
  { id: 'payroll-ready', label: 'Payroll run ready for approval', group: 'HR' },
] as const

const ALL: PermissionAction[] = [...ACTIONS]
const VIEW: PermissionAction[] = ['view']
const RW: PermissionAction[] = ['view', 'create', 'edit']
const NONE: PermissionAction[] = []

function matrix(def: PermissionAction[], over: Partial<Record<ModuleKey, PermissionAction[]>>) {
  return Object.fromEntries(MODULES.map((m) => [m, [...(over[m] ?? def)]])) as Record<ModuleKey, PermissionAction[]>
}

export function defaultRole(e: Employee): Role {
  if (e.departmentId === 'management') return 'admin'
  if (e.id === 'emp-2' || e.id === 'emp-4') return 'sales-manager'
  if (e.departmentId === 'sales' || e.departmentId === 'offplan') return 'broker'
  if (e.departmentId === 'leasing' || e.departmentId === 'property-management') return 'leasing'
  if (e.departmentId === 'finance') return 'accountant'
  if (e.departmentId === 'hr') return 'hr'
  if (e.departmentId === 'marketing') return 'marketing'
  return 'viewer'
}

function makeSettings(): AppSettings[] {
  const emps = employees.collection.all()
  return [
    {
      id: 'app',
      company: {
        name: 'Apex Aora Real Estate LLC',
        tradeName: 'Apex Aora Real Estate',
        trn: '100458723600003',
        licenseNo: '1124587',
        reraOrn: '28451',
        address: 'Office 1904, Burj Gate Tower, Sheikh Zayed Road',
        city: 'Dubai',
        country: 'United Arab Emirates',
        phone: '+971 4 123 4567',
        email: 'hello@apexaora.ae',
        website: 'www.apexaora.ae',
        fiscalYearStart: 1,
        baseCurrency: 'AED',
      },
      userRoles: Object.fromEntries(emps.map((e) => [e.id, defaultRole(e)])),
      permissions: {
        admin: matrix(ALL, {}),
        'sales-manager': matrix(['view', 'create', 'edit', 'export'], { sales: ALL, services: ALL, settings: NONE, hr: VIEW, finance: VIEW }),
        broker: matrix(VIEW, { sales: RW, services: RW, projects: RW, events: RW, marketing: VIEW, finance: NONE, hr: NONE, settings: NONE }),
        leasing: matrix(VIEW, { sales: RW, services: RW, projects: RW, finance: VIEW, hr: NONE, settings: NONE }),
        accountant: matrix(VIEW, { finance: ALL, sales: ['view', 'export'], hr: VIEW, settings: NONE }),
        hr: matrix(VIEW, { hr: ALL, projects: RW, sales: NONE, finance: NONE, settings: NONE }),
        marketing: matrix(VIEW, { marketing: ALL, events: ALL, projects: RW, services: RW, finance: NONE, hr: NONE, settings: NONE }),
        viewer: matrix(VIEW, { finance: NONE, hr: NONE, settings: NONE }),
      },
      commission: { saleRate: 2, rentRate: 5, minRentCommission: 5000, offplanRate: 5, brokerSplit: 50, seniorSplit: 60, leadSplit: 70 },
      rates: { USD: 0.2723, EUR: 0.2585, GBP: 0.2156, SAR: 1.0211, INR: 23.05, RUB: 24.9, CNY: 1.968 },
      ratesUpdatedAt: daysFromNow(-1, 8, 30),
      vatEnabled: true,
      vatRate: 5,
      pricesIncludeVat: false,
      notifications: Object.fromEntries(NOTIFICATION_EVENTS.map((n, i) => [n.id, { inApp: true, email: i % 3 !== 2 }])),
      theme: 'system',
    },
  ]
}

export const settings = createResource<AppSettings>('re-settings', makeSettings, { label: 'Settings' })

/** Synchronous read of the settings record (for non-React code). */
export const appSettings = () => settings.collection.all()[0]!
