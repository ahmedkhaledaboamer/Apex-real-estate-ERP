import { addDays, addMonths, format, parseISO } from 'date-fns'
import { createResource } from '@/api/resource'
import { code, createRng, dateFromNow, type Rng } from '@/lib/random'
import type { PropertyType } from '@/types/domain'
import type { ChequeStatus, MaintenanceRequest, MortgageReferral, RentCheque, Tenancy, TenancyStatus, ValuationRequest } from '@/types/services'
import { BROKER_DEPARTMENTS, COMMUNITIES, customers, employees, suppliers } from './core'
import { listings } from './domain'

/* Property management (tenancies, rent cheques, maintenance) and valuations / mortgage referrals.
   Seeds 1201–1204; every date is relative to today. */

export const UAE_BANKS = ['Emirates NBD', 'ADCB', 'FAB', 'Mashreq', 'Dubai Islamic Bank', 'RAKBANK', 'HSBC UAE', 'CBD', 'Emirates Islamic', 'ENBD Islamic'] as const

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const todayYmd = () => dateFromNow(0)

/** Post-dated cheque schedule for a tenancy term: rent split evenly, first cheque on the start date. */
export function chequeSchedule(startDate: string, annualRent: number, count: number, bank: string, seed = 1, pastStatus: (i: number) => ChequeStatus = () => 'cleared'): RentCheque[] {
  const n = Math.max(1, count)
  const each = Math.floor(annualRent / n)
  const step = 12 / n
  const now = todayYmd()
  return Array.from({ length: n }, (_, i) => {
    const due = ymd(addMonths(parseISO(startDate), Math.round(i * step)))
    return {
      no: i + 1,
      dueDate: due,
      amount: i === n - 1 ? annualRent - each * (n - 1) : each,
      chequeNo: String(100000 + ((seed * 7919 + i * 131) % 900000)),
      bank,
      status: due <= now ? pastStatus(i) : 'pending',
    }
  })
}

/** Status from the contract dates (renewal-pending once it has lapsed without a renewal). */
export function tenancyStatusFor(endDate: string, current?: TenancyStatus): TenancyStatus {
  if (current === 'ended') return 'ended'
  const now = todayYmd()
  if (endDate < now) return 'renewal-pending'
  if (endDate <= dateFromNow(60)) return 'expiring'
  return 'active'
}

function makeTenancies(): Tenancy[] {
  const r = createRng(1201)
  const custs = customers.collection.all()
  const landlords = custs.filter((c) => c.type === 'landlord' || c.type === 'investor')
  const tenants = custs.filter((c) => c.type === 'tenant')
  const rentals = listings.collection.all().filter((l) => l.purpose === 'rent')
  const pm = employees.collection.all().filter((e) => e.departmentId === 'property-management')
  const picked = r.sample(rentals, 26)
  const out: Tenancy[] = []
  const extraUnits: [string, string, number][] = [
    ['Marina Gate 1, apt 2304', 'dubai-marina', 165_000],
    ['Bloom Towers B, apt 1108', 'jvc', 72_000],
    ['Sidra 3, villa 41', 'dubai-hills', 340_000],
    ['Executive Towers K, apt 906', 'business-bay', 98_000],
  ]
  const units = [
    ...picked.map((l) => ({ listingId: l.id as string | null, unit: l.title.includes(' in ') ? l.title : `${l.title}, ${l.building}`, communitySlug: l.communitySlug, rent: l.price, landlordId: l.ownerId, cheques: l.cheques ?? 4, furnished: l.furnishing === 'furnished' })),
    ...extraUnits.map(([unit, communitySlug, rent]) => ({ listingId: null, unit, communitySlug, rent, landlordId: r.pick(landlords).id, cheques: r.pick([1, 2, 4]), furnished: r.bool(0.3) })),
  ]
  units.forEach((u, i) => {
    // Spread start dates so some contracts are expiring soon and a few have lapsed.
    const startAgo = i % 9 === 0 ? r.int(372, 400) : i % 5 === 0 ? r.int(300, 340) : r.int(15, 290)
    const start = dateFromNow(-startAgo)
    const end = ymd(addDays(addMonths(parseISO(start), 12), -1))
    const bank = r.pick(UAE_BANKS)
    const ended = i % 13 === 7
    const status = ended ? 'ended' : tenancyStatusFor(end)
    out.push({
      id: `ten-${i + 1}`,
      code: code('TN', 400 + i + 1),
      listingId: u.listingId,
      unit: u.unit,
      communitySlug: u.communitySlug,
      landlordId: u.landlordId,
      tenantId: r.pick(tenants).id,
      annualRent: u.rent,
      startDate: start,
      endDate: end,
      cheques: chequeSchedule(start, u.rent, u.cheques, bank, i + 3, () => (r.bool(0.06) ? 'bounced' : 'cleared')),
      ejariNo: String(r.int(1_000_000_000, 1_999_999_999)) + String(r.int(10000, 99999)),
      securityDeposit: Math.round((u.rent * (u.furnished ? 0.1 : 0.05)) / 100) * 100,
      managementFeePct: r.pick([5, 5, 6, 7, 8]),
      status,
      managerId: pm.length ? pm[i % pm.length]!.id : 'emp-6',
      notes: '',
    })
  })
  return out
}

const JOBS: Record<MaintenanceRequest['category'], string[]> = {
  ac: ['AC not cooling in master bedroom', 'AC unit leaking water', 'Annual AC duct cleaning', 'Thermostat not responding'],
  plumbing: ['Kitchen sink blocked', 'Water heater not working', 'Leak under bathroom vanity', 'Low water pressure in shower'],
  electrical: ['Living-room lights flickering', 'Socket sparking in kitchen', 'DB trips when oven is on', 'Replace balcony light fittings'],
  cleaning: ['Move-in deep cleaning', 'Sofa and carpet shampoo', 'Post-renovation cleaning', 'Window cleaning'],
  painting: ['Repaint after tenant move-out', 'Touch-up paint in hallway', 'Damp patch on bedroom ceiling'],
  other: ['Main door lock replacement', 'Kitchen cabinet hinge broken', 'Pest control treatment', 'Install curtain rails'],
}

function makeMaintenance(): MaintenanceRequest[] {
  const r = createRng(1202)
  const ten = tenancies.collection.all().filter((t) => t.status !== 'ended')
  const vendors = suppliers.collection.all().filter((s) => s.category === 'maintenance')
  const vendorFor = (cat: MaintenanceRequest['category']) => vendors.find((v) => (cat === 'ac' ? /AC|Cool/i.test(v.name) : cat === 'cleaning' ? /Clean/i.test(v.name) : /FixIt|Technical/i.test(v.name))) ?? vendors[0]
  const out: MaintenanceRequest[] = []
  for (let i = 0; i < 34; i++) {
    const category = r.weighted([['ac', 9], ['plumbing', 7], ['electrical', 5], ['cleaning', 4], ['painting', 3], ['other', 4]] as const)
    const ago = r.int(0, 75)
    const status = ago > 25 ? r.weighted([['completed', 10], ['cancelled', 1]] as const) : ago > 8 ? r.weighted([['completed', 4], ['in-progress', 3], ['scheduled', 2]] as const) : r.weighted([['open', 5], ['scheduled', 3], ['in-progress', 2]] as const)
    const reported = dateFromNow(-ago)
    const sched = status === 'open' ? null : dateFromNow(-ago + r.int(0, 4))
    const vendor = status === 'open' && r.bool(0.5) ? null : vendorFor(category)
    out.push({
      id: `mnt-${i + 1}`,
      code: code('MR', 900 + i + 1),
      tenancyId: r.pick(ten).id,
      title: r.pick(JOBS[category]),
      description: '',
      category,
      priority: category === 'ac' || category === 'electrical' ? r.weighted([['high', 4], ['medium', 3], ['low', 1]] as const) : r.weighted([['high', 1], ['medium', 4], ['low', 3]] as const),
      vendorId: vendor?.id ?? null,
      reportedAt: reported,
      scheduledAt: sched,
      completedAt: status === 'completed' ? dateFromNow(Math.min(0, -ago + r.int(1, 6))) : null,
      cost: status === 'cancelled' || status === 'open' ? 0 : r.amount(category === 'cleaning' ? 350 : 200, category === 'painting' ? 4500 : 2400, 50),
      status,
    })
  }
  return out.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
}

const PROP_TYPES: PropertyType[] = ['Apartment', 'Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio']

function sqftFor(r: Rng, t: PropertyType) {
  return t === 'Studio' ? r.int(380, 520) : t === 'Villa' ? r.int(2800, 7500) : t === 'Penthouse' ? r.int(2600, 5200) : t === 'Townhouse' ? r.int(1700, 3100) : r.int(700, 1900)
}

function makeValuations(): ValuationRequest[] {
  const r = createRng(1203)
  const custs = customers.collection.all().filter((c) => c.type === 'seller' || c.type === 'landlord' || c.type === 'investor')
  const valuers = employees.collection.all().filter((e) => e.departmentId === 'sales')
  const out: ValuationRequest[] = []
  for (let i = 0; i < 24; i++) {
    const c = r.pick(COMMUNITIES)
    const propertyType = r.pick(PROP_TYPES)
    const beds = propertyType === 'Studio' ? 0 : propertyType === 'Villa' ? r.int(3, 6) : propertyType === 'Penthouse' ? r.int(3, 5) : r.int(1, 3)
    const sqft = sqftFor(r, propertyType)
    const ago = r.int(0, 70)
    const status = ago > 14 ? 'completed' : ago > 4 ? r.weighted([['scheduled', 2], ['completed', 1]] as const) : r.weighted([['new', 3], ['scheduled', 1]] as const)
    const ppsf = (c.ppsf ?? 1800) * r.float(0.88, 1.15)
    const mid = Math.round((sqft * ppsf) / 10_000) * 10_000
    out.push({
      id: `val-${i + 1}`,
      code: code('VAL', 300 + i + 1),
      clientId: r.pick(custs).id,
      communitySlug: c.slug,
      building: '',
      propertyType,
      beds,
      sqft,
      purpose: r.weighted([['sale', 6], ['refinance', 3], ['insurance', 1]] as const),
      requestedAt: dateFromNow(-ago),
      scheduledAt: status === 'new' ? null : dateFromNow(-ago + r.int(1, 4)),
      valuerId: r.pick(valuers).id,
      estimateLow: status === 'completed' ? Math.round((mid * 0.95) / 10_000) * 10_000 : null,
      estimateHigh: status === 'completed' ? Math.round((mid * 1.05) / 10_000) * 10_000 : null,
      status,
      reportDate: status === 'completed' ? dateFromNow(Math.min(0, -ago + r.int(4, 9))) : null,
      notes: '',
    })
  }
  return out.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

function makeMortgages(): MortgageReferral[] {
  const r = createRng(1204)
  const custs = customers.collection.all().filter((c) => c.type === 'buyer' || c.type === 'investor')
  const staff = employees.collection.all().filter((e) => BROKER_DEPARTMENTS.includes(e.departmentId) && e.departmentId !== 'leasing')
  const partner = suppliers.collection.all().find((s) => s.category === 'mortgage')
  const out: MortgageReferral[] = []
  for (let i = 0; i < 28; i++) {
    const ago = r.int(0, 160)
    const status = ago > 60 ? r.weighted([['disbursed', 6], ['declined', 2], ['approved', 1]] as const) : ago > 20 ? r.weighted([['approved', 3], ['pre-approved', 3], ['declined', 1], ['disbursed', 1]] as const) : r.weighted([['referred', 4], ['pre-approved', 2]] as const)
    const propertyPrice = r.amount(900_000, 7_500_000, 50_000)
    const ltvPct = propertyPrice > 5_000_000 ? r.pick([60, 65, 70]) : r.pick([70, 75, 80, 80])
    const loanAmount = Math.round((propertyPrice * ltvPct) / 100 / 1000) * 1000
    out.push({
      id: `mtg-${i + 1}`,
      code: code('MTG', 500 + i + 1),
      clientId: r.pick(custs).id,
      bank: r.pick(UAE_BANKS),
      propertyPrice,
      ltvPct,
      loanAmount,
      status,
      // Partner pays ~0.3–0.5% of the loan once disbursed.
      referralFee: Math.round((loanAmount * r.pick([0.3, 0.4, 0.5])) / 100 / 50) * 50,
      brokerId: r.pick(staff).id,
      partnerId: partner?.id ?? 'sup-13',
      referredAt: dateFromNow(-ago),
      notes: '',
    })
  }
  return out.sort((a, b) => b.referredAt.localeCompare(a.referredAt))
}

export const tenancies = createResource<Tenancy>('re-tenancies-v2', makeTenancies, { label: 'Tenancy' })
export const maintenanceRequests = createResource<MaintenanceRequest>('re-maintenance', makeMaintenance, { label: 'Maintenance request' })
export const valuationRequests = createResource<ValuationRequest>('re-valuations', makeValuations, { label: 'Valuation request' })
export const mortgageReferrals = createResource<MortgageReferral>('re-mortgages', makeMortgages, { label: 'Mortgage referral' })

export const tenancyById = (id: string | null | undefined) => (id ? tenancies.collection.byId(id) : undefined)
