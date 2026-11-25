import { createResource } from '@/api/resource'
import { code, createRng, dateFromNow, daysFromNow } from '@/lib/random'
import type { Community, Customer, Department, DepartmentId, Employee, Supplier } from '@/types/core'
import { AGENT_PROFILES } from './site/agents'
import { COMMUNITY_DETAILS } from './site/communities'
import { DEVELOPER_PROFILES } from './site/developers'

/* Fictional demo data for Apex Aora Real Estate (Dubai). Communities, developers and the four
   website brokers come from the website copy in `mocks/site/`. */

const FIRST = ['Omar', 'Sara', 'Ahmed', 'Layla', 'Yousef', 'Noor', 'Khaled', 'Mariam', 'Hassan', 'Aisha', 'Rami', 'Hana', 'Tariq', 'Dina', 'Faisal', 'Reem', 'Ali', 'Salma', 'Kareem', 'Yara', 'James', 'Emma', 'Ravi', 'Priya', 'Lucas', 'Sofia', 'Daniel', 'Chloe', 'Arjun', 'Fatima', 'Ibrahim', 'Nadia', 'Zain', 'Lina', 'Mohammed', 'Huda', 'Elena', 'Dmitri', 'Anna', 'Viktor']
const LAST = ['Haddad', 'Mansour', 'Khalil', 'Saleh', 'Nasser', 'Farouk', 'Aziz', 'Hamdan', 'Rahman', 'Qureshi', 'Fernandes', 'Walker', 'Patel', 'Sharma', 'Rossi', 'Martin', 'Al Amiri', 'Al Suwaidi', 'El Sayed', 'Ibrahim', 'Bakr', 'Darwish', 'Yassin', 'Karim', 'Ivanova', 'Schmidt', 'Novak']
const NATIONALITIES = ['UAE', 'Egypt', 'Jordan', 'India', 'Pakistan', 'Lebanon', 'UK', 'Russia', 'Saudi Arabia', 'Germany', 'France', 'China']

/* ------------------------------------------------------------------ */
/*  Communities (website) + zones                                      */
/* ------------------------------------------------------------------ */
const ZONE: Record<string, Community['zone']> = {
  'dubai-marina': 'Coastal',
  'palm-jumeirah': 'Coastal',
  downtown: 'Central',
  'business-bay': 'Central',
  jvc: 'Suburban',
  'dubai-hills': 'Suburban',
  'damac-lagoons': 'Suburban',
  'creek-harbour': 'Waterfront',
}
export const COMMUNITIES: Community[] = COMMUNITY_DETAILS.map((c) => ({
  slug: c.slug,
  name: c.name,
  zone: ZONE[c.slug] ?? 'Suburban',
  image: c.image,
  ppsf: c.ppsf,
  yieldPct: c.yieldPct,
}))
export const communityBySlug = (slug: string | null | undefined) => COMMUNITIES.find((c) => c.slug === slug)
/** Website listings use community names ("Dubai Marina"); map them to slugs. */
export const communitySlugByName = (name: string) => COMMUNITIES.find((c) => c.name === name || name.startsWith(c.name) || c.name.startsWith(name))?.slug ?? COMMUNITIES[0]!.slug

export const DEVELOPERS = DEVELOPER_PROFILES
export const developerBySlug = (slug: string | null | undefined) => DEVELOPER_PROFILES.find((d) => d.slug === slug)

/* ------------------------------------------------------------------ */
/*  Departments + employees                                            */
/* ------------------------------------------------------------------ */
export const DEPARTMENTS: Department[] = [
  { id: 'management', name: 'Management', headId: 'emp-1', color: '#843f96' },
  { id: 'sales', name: 'Secondary Sales', headId: 'emp-2', color: '#275ba8' },
  { id: 'leasing', name: 'Leasing', headId: 'emp-3', color: '#3cb4e8' },
  { id: 'offplan', name: 'Off-Plan', headId: 'emp-4', color: '#563d96' },
  { id: 'marketing', name: 'Marketing', headId: 'emp-5', color: '#d64545' },
  { id: 'property-management', name: 'Property Management', headId: 'emp-6', color: '#1f9d64' },
  { id: 'finance', name: 'Finance', headId: 'emp-7', color: '#d9891a' },
  { id: 'hr', name: 'Human Resources', headId: 'emp-8', color: '#a97cc4' },
  { id: 'admin', name: 'Admin & Conveyancing', headId: 'emp-9', color: '#6b6178' },
]
export const departmentById = (id: string) => DEPARTMENTS.find((d) => d.id === id)
export const BROKER_DEPARTMENTS: DepartmentId[] = ['sales', 'leasing', 'offplan']

const TITLES: Record<DepartmentId, string[]> = {
  management: ['Managing Director'],
  sales: ['Sales Director', 'Senior Sales Consultant', 'Property Consultant', 'Property Consultant', 'Luxury Property Consultant'],
  leasing: ['Leasing Manager', 'Senior Leasing Consultant', 'Leasing Consultant'],
  offplan: ['Head of Off-Plan', 'Off-Plan Advisor', 'Investment Consultant'],
  marketing: ['Marketing Manager', 'Listings Coordinator', 'Performance Marketer', 'Content & Social Media Specialist'],
  'property-management': ['Property Management Lead', 'Property Manager', 'Tenant Relations Officer'],
  finance: ['Finance Manager', 'Accountant', 'Commission Accountant'],
  hr: ['HR Manager', 'HR & Admin Officer'],
  admin: ['Office Manager', 'Conveyancing Coordinator', 'Receptionist', 'IT Support'],
}

const SITE = Object.fromEntries(AGENT_PROFILES.map((a) => [a.id, a]))
/** Website agent id → employee id (listings on the website reference agents by these ids). */
export const SITE_AGENT_TO_EMPLOYEE: Record<string, string> = { sofia: 'emp-2', omar: 'emp-3', daniel: 'emp-4', layla: 'emp-10' }

function makeEmployees(): Employee[] {
  const r = createRng(11)
  // Fixed people first: department heads (emp-1..emp-9), then Layla (website), then generated staff.
  const fixed: { dep: DepartmentId; site?: string; name?: string; title?: string }[] = [
    { dep: 'management', name: 'Rashid Al Amiri', title: 'Managing Director' },
    { dep: 'sales', site: 'sofia', title: 'Sales Director' },
    { dep: 'leasing', site: 'omar', title: 'Leasing Manager' },
    { dep: 'offplan', site: 'daniel', title: 'Head of Off-Plan' },
    { dep: 'marketing' },
    { dep: 'property-management' },
    { dep: 'finance' },
    { dep: 'hr' },
    { dep: 'admin' },
    { dep: 'sales', site: 'layla', title: 'Senior Sales Consultant' },
  ]
  const extra: [DepartmentId, number][] = [['sales', 6], ['leasing', 4], ['offplan', 3], ['marketing', 3], ['property-management', 2], ['finance', 2], ['hr', 1], ['admin', 3]]
  const plan = [...fixed]
  for (const [dep, n] of extra) for (let i = 0; i < n; i++) plan.push({ dep })

  const used = new Set<string>(AGENT_PROFILES.map((a) => a.name).concat('Rashid Al Amiri'))
  const communities = COMMUNITIES.map((c) => c.slug)
  return plan.map((p, i) => {
    const site = p.site ? SITE[p.site] : undefined
    let name = p.name ?? site?.name ?? ''
    if (!name) {
      do name = `${r.pick(FIRST)} ${r.pick(LAST)}`
      while (used.has(name))
      used.add(name)
    }
    const isHead = i < 9
    const broker = BROKER_DEPARTMENTS.includes(p.dep)
    const titles = TITLES[p.dep]
    const title = p.title ?? (isHead ? titles[0]! : r.pick(titles.length > 1 ? titles.slice(1) : titles))
    // Brokers: modest basic + commission; heads and back office: higher fixed pay.
    const salary = i === 0 ? 45000 : isHead ? r.amount(22000, 32000, 500) : broker ? r.amount(4000, 8000, 250) : r.amount(6500, 14000, 250)
    const commissionSplit = broker ? (isHead ? 70 : title.startsWith('Senior') || title.startsWith('Luxury') ? 60 : 50) : null
    return {
      id: `emp-${i + 1}`,
      code: code('EMP', i + 1, 3),
      name,
      email: site?.email ?? `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@apexaora.ae`,
      phone: site?.phone ?? `+971 5${r.int(0, 8)} ${r.int(100, 999)} ${r.int(1000, 9999)}`,
      avatarHue: r.int(0, 359),
      photo: site?.photo,
      title,
      departmentId: p.dep,
      managerId: i === 0 ? null : isHead ? 'emp-1' : `emp-${DEPARTMENTS.findIndex((d) => d.id === p.dep) + 1}`,
      status: i < 10 ? 'active' : r.weighted([['active', 18], ['on-leave', 2], ['probation', 2]] as const),
      joinDate: dateFromNow(-r.int(i % 9 === 4 ? 10 : 90, i % 9 === 4 ? 80 : 2400)),
      nationality: r.pick(NATIONALITIES),
      salary,
      allowances: Math.round((salary * r.float(0.15, 0.3)) / 100) * 100,
      leaveBalance: r.int(2, 30),
      brn: broker ? (site?.brn ?? String(r.int(40000, 59999))) : null,
      reraExpiry: broker ? dateFromNow(i % 7 === 3 ? r.int(-10, 25) : r.int(40, 700)) : null,
      commissionSplit,
      languages: site?.languages ?? r.sample(['English', 'Arabic', 'Hindi', 'Urdu', 'Russian', 'French', 'Mandarin', 'German'], r.int(1, 3)),
      communities: site ? [...new Set(site.communities.map((n) => communitySlugByName(n)))] : broker ? r.sample(communities, 2) : [],
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Clients (incl. developers) + vendors                               */
/* ------------------------------------------------------------------ */
function makeCustomers(staff: Employee[]): Customer[] {
  const r = createRng(23)
  const brokers = staff.filter((e) => BROKER_DEPARTMENTS.includes(e.departmentId))
  const out: Customer[] = []
  const add = (c: Omit<Customer, 'id' | 'code' | 'avatarHue'>) => {
    const n = out.length + 1
    out.push({ ...c, id: `cus-${n}`, code: code('CL', n), avatarHue: r.int(0, 359) })
  }
  // Developers (pay commission on off-plan sales)
  for (const d of DEVELOPER_PROFILES)
    add({
      name: d.name === 'Emaar' || d.name === 'Nakheel' || d.name === 'Meraas' ? `${d.name} Properties` : d.name === 'DAMAC' ? 'DAMAC Properties' : `${d.name} Developments`,
      type: 'developer',
      developerSlug: d.slug,
      email: `brokers@${d.slug}.ae`,
      phone: `+971 4 ${r.int(300, 899)} ${r.int(1000, 9999)}`,
      nationality: 'UAE',
      city: 'Dubai',
      ownerId: staff.find((e) => e.departmentId === 'offplan')!.id,
      createdAt: daysFromNow(-r.int(400, 1500)),
      tags: ['Developer', ...(r.bool(0.4) ? ['Top partner'] : [])],
    })
  const mix: [Customer['type'], number][] = [['landlord', 24], ['seller', 16], ['buyer', 30], ['tenant', 22], ['investor', 8]]
  const tagsPool: Record<Customer['type'], string[]> = {
    landlord: ['Portfolio owner', 'Overseas', 'Managed', 'Repeat'],
    seller: ['Motivated', 'Overseas', 'Upgrading', 'Mortgage'],
    buyer: ['Cash buyer', 'Mortgage', 'First-time buyer', 'Golden Visa', 'End user'],
    tenant: ['Family', 'Corporate lease', 'Pets', 'Renewal'],
    investor: ['Golden Visa', 'Off-plan', 'Portfolio', 'VIP'],
    developer: [],
  }
  const cities = ['Dubai', 'Dubai', 'Dubai', 'Abu Dhabi', 'Sharjah', 'London', 'Moscow', 'Mumbai', 'Riyadh', 'Cairo', 'Berlin']
  for (const [type, n] of mix)
    for (let i = 0; i < n; i++) {
      const name = `${r.pick(FIRST)} ${r.pick(LAST)}`
      add({
        name,
        type,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@mail.com`,
        phone: `+971 5${r.int(0, 8)} ${r.int(100, 999)} ${r.int(1000, 9999)}`,
        nationality: r.pick(NATIONALITIES),
        city: r.pick(cities),
        ownerId: r.pick(brokers).id,
        createdAt: daysFromNow(-r.int(5, 900)),
        tags: r.sample(tagsPool[type], r.int(0, 2)),
      })
    }
  return out
}

function makeSuppliers(): Supplier[] {
  const r = createRng(37)
  const list: [string, Supplier['category'], string][] = [
    ['Property Finder', 'portal', 'Dubai'],
    ['Bayut', 'portal', 'Dubai'],
    ['Dubizzle', 'portal', 'Dubai'],
    ['Meta Ads', 'marketing', 'Dubai'],
    ['Google Ads', 'marketing', 'Dubai'],
    ['Skyline Media Production', 'photography', 'Dubai'],
    ['Studio 360 Virtual Tours', 'photography', 'Dubai'],
    ['FixIt Technical Services', 'maintenance', 'Dubai'],
    ['Cool Breeze AC Maintenance', 'maintenance', 'Dubai'],
    ['Al Rawdah Cleaning', 'maintenance', 'Dubai'],
    ['TransferPro Conveyancing', 'conveyancing', 'Dubai'],
    ['Gulf Legal Advocates', 'legal', 'Dubai'],
    ['Mortgage Finder', 'mortgage', 'Dubai'],
    ['Bay Square Properties (office lease)', 'office', 'Dubai'],
    ['du Business', 'it', 'Dubai'],
    ['PropSpace CRM', 'it', 'Dubai'],
  ]
  return list.map(([name, category, city], i) => ({
    id: `sup-${i + 1}`,
    code: code('VEN', i + 1, 3),
    name,
    category,
    country: 'UAE',
    city,
    contactName: `${r.pick(FIRST)} ${r.pick(LAST)}`,
    email: `accounts@${name.toLowerCase().replace(/\(.*\)/, '').replace(/[^a-z]+/g, '')}.ae`,
    phone: `+971 4 ${r.int(300, 899)} ${r.int(1000, 9999)}`,
    paymentTerms: r.pick([0, 15, 30, 30, 45]),
    rating: Math.round(r.float(3.6, 5) * 10) / 10,
    balance: r.bool(0.6) ? r.amount(2000, 60000, 250) : 0,
    active: r.bool(0.94),
  }))
}

export const employees = createResource<Employee>('re-employees', makeEmployees, { label: 'Employee' })
export const customers = createResource<Customer>('re-customers', () => makeCustomers(employees.collection.all()), { label: 'Client' })
export const suppliers = createResource<Supplier>('re-suppliers', makeSuppliers, { label: 'Vendor' })

/** Synchronous lookups for rendering names inside tables (mock-only convenience). */
export const employeeById = (id: string | null | undefined) => (id ? employees.collection.byId(id) : undefined)
export const customerById = (id: string | null | undefined) => (id ? customers.collection.byId(id) : undefined)
export const supplierById = (id: string | null | undefined) => (id ? suppliers.collection.byId(id) : undefined)
export const brokers = () => employees.collection.all().filter((e) => BROKER_DEPARTMENTS.includes(e.departmentId) && e.status !== 'terminated')
export const developerCustomer = (slug: string) => customers.collection.all().find((c) => c.type === 'developer' && c.developerSlug === slug)

/** The signed-in demo user. */
export const CURRENT_USER_ID = 'emp-1'
