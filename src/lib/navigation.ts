import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavLink {
  label: string
  to: string
  /** Extra words for the command palette search */
  keywords?: string
}
export interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  /** Group landing route (also used when the sidebar is collapsed) */
  to: string
  links?: NavLink[]
}

/** Single source of truth for the sidebar, command palette and breadcrumbs. */
export const NAV: NavGroup[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    id: 'sales',
    label: 'Sales',
    icon: BadgeDollarSign,
    to: '/sales/leads',
    links: [
      { label: 'Leads pipeline', to: '/sales/leads', keywords: 'crm enquiries buyers tenants kanban' },
      { label: 'Deals', to: '/sales/deals', keywords: 'transactions offers mou noc transfer ejari commission' },
      { label: 'Viewings', to: '/sales/viewings', keywords: 'appointments showings calendar' },
      { label: 'Clients', to: '/sales/clients', keywords: 'customers buyers sellers landlords tenants investors developers contacts' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    to: '/marketing',
    links: [
      { label: 'Campaigns', to: '/marketing', keywords: 'ads meta google roi' },
      { label: 'Portals', to: '/marketing/portals', keywords: 'property finder bayut dubizzle listings quota leads' },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: Building2,
    to: '/services',
    links: [
      { label: 'Listings', to: '/services', keywords: 'properties inventory sale rent units' },
      { label: 'Off-plan projects', to: '/services/offplan', keywords: 'launches new projects allocation' },
      { label: 'Developers', to: '/services/developers', keywords: 'emaar damac nakheel sobha partners' },
      { label: 'Communities', to: '/services/communities', keywords: 'areas neighbourhoods market prices' },
      { label: 'Property management', to: '/services/property-management', keywords: 'tenancies leases rent collection maintenance' },
      { label: 'Valuations & mortgages', to: '/services/valuations', keywords: 'valuation requests mortgage referrals' },
      { label: 'Vendors', to: '/services/vendors', keywords: 'suppliers contractors partners' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects & Tasks',
    icon: FolderKanban,
    to: '/projects',
    links: [
      { label: 'Projects', to: '/projects', keywords: 'initiatives launches' },
      { label: 'Tasks', to: '/projects/tasks', keywords: 'todo kanban assignments' },
    ],
  },
  { id: 'events', label: 'Events', icon: CalendarDays, to: '/events' },
  {
    id: 'finance',
    label: 'Accounts & Finance',
    icon: BarChart3,
    to: '/finance',
    links: [
      { label: 'Overview', to: '/finance', keywords: 'cash flow profit' },
      { label: 'Invoices', to: '/finance/invoices', keywords: 'commission billing receivables' },
      { label: 'Payments', to: '/finance/payments', keywords: 'receipts collections' },
      { label: 'Expenses', to: '/finance/expenses', keywords: 'costs bills payables' },
      { label: 'Agent commissions', to: '/finance/commissions', keywords: 'broker payouts splits' },
      { label: 'Reports', to: '/finance/reports', keywords: 'profit loss p&l statements' },
    ],
  },
  {
    id: 'hr',
    label: 'HR',
    icon: Users,
    to: '/hr',
    links: [
      { label: 'Employees', to: '/hr', keywords: 'staff team people brokers rera brn' },
      { label: 'Attendance', to: '/hr/attendance', keywords: 'check in time' },
      { label: 'Leave', to: '/hr/leave', keywords: 'vacation time off holidays' },
      { label: 'Payroll', to: '/hr/payroll', keywords: 'salaries wages' },
    ],
  },
  { id: 'settings', label: 'Settings', icon: Settings, to: '/settings' },
]

/** Which group a pathname belongs to. */
export function groupForPath(pathname: string) {
  return NAV.find((g) => g.to !== '/' && (pathname === g.to || pathname.startsWith(`/${g.id}`))) ?? (pathname === '/' ? NAV[0] : undefined)
}
