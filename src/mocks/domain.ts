import { createResource } from '@/api/resource'
import { IMG } from '@/assets/images'
import { invoiceTotals } from '@/lib/calc'
import { code, createRng, dateFromNow, daysFromNow, today } from '@/lib/random'
import type { Deal, DealStage, DealType, Invoice, Lead, LeadSource, Listing, OffPlanProject, Payment, PropertyType, Viewing } from '@/types/domain'
import { BROKER_DEPARTMENTS, COMMUNITIES, communityBySlug, customers, developerCustomer, employees, SITE_AGENT_TO_EMPLOYEE } from './core'
import { PROJECT_DETAILS } from './site/projects'
import { PROPERTIES } from './site/properties'

/* Listings, off-plan projects, deals, leads, viewings, commission invoices and payments — generated
   together so the numbers agree (deal commission = invoice subtotal, payments = amounts collected,
   dashboard = finance). */

const DAY = 86_400_000
const isoDay = (iso: string) => iso.slice(0, 10)
const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY).toISOString()
const round = (n: number, step = 1000) => Math.round(n / step) * step

/** Photos per community (website photography), used for generated listings/projects. */
const COMMUNITY_PHOTOS: Record<string, string[]> = {}
for (const p of PROPERTIES) (COMMUNITY_PHOTOS[p.communitySlug] ??= []).push(...p.images)
for (const c of COMMUNITIES) (COMMUNITY_PHOTOS[c.slug] ??= []).push(c.image)
const GENERIC = [IMG.balcony, IMG.villa, IMG.marina, IMG.businessBay, IMG.dubaiHills, IMG.jvc].filter(Boolean) as string[]
const photosFor = (slug: string, n: number, seed: number) => {
  const pool = [...new Set([...(COMMUNITY_PHOTOS[slug] ?? []), ...GENERIC])]
  return Array.from({ length: n }, (_, i) => pool[(seed + i) % pool.length]!)
}

/* ------------------------------------------------------------------ */
/*  Off-plan projects                                                  */
/* ------------------------------------------------------------------ */
function makeProjects(): OffPlanProject[] {
  const r = createRng(91)
  const fromSite: OffPlanProject[] = PROJECT_DETAILS.map((p) => ({
    id: `prj-${p.slug}`,
    name: p.name,
    developerSlug: p.developerSlug,
    communitySlug: p.communitySlug,
    image: p.image,
    handover: p.handover,
    fromPrice: p.fromAed,
    plan: p.plan,
    status: 'selling',
    totalUnits: p.totalUnits,
    allocated: Math.round(p.totalUnits * 0.12),
    commissionRate: 5,
  }))
  const extra: [string, string, string, number, string, OffPlanProject['status']][] = [
    // name, developer, community, from price, plan, status
    ['Hillcrest Park Villas', 'emaar', 'dubai-hills', 6_200_000, '80/20', 'selling'],
    ['Marina Sky Residences', 'emaar', 'dubai-marina', 2_150_000, '70/30', 'launching'],
    ['Lagoon Breeze Townhouses', 'damac', 'damac-lagoons', 2_650_000, '75/25', 'selling'],
    ['Palm Crescent Collection', 'nakheel', 'palm-jumeirah', 14_500_000, '60/40', 'selling'],
    ['Creekside Gardens', 'emaar', 'creek-harbour', 1_850_000, '90/10', 'sold-out'],
    ['Circle One by Binghatti', 'binghatti', 'jvc', 780_000, '65/35', 'selling'],
    ['Bay Avenue Lofts', 'omniyat', 'business-bay', 3_400_000, '60/40', 'launching'],
    ['Sobha Hartland Vista', 'sobha', 'dubai-hills', 1_950_000, '60/40', 'selling'],
    ['Azizi Riviera Edge', 'azizi', 'downtown', 1_250_000, '50/50', 'completed'],
  ]
  const now = new Date()
  return [
    ...fromSite,
    ...extra.map(([name, developerSlug, communitySlug, fromPrice, plan, status], i) => {
      const total = r.int(120, 640)
      const q = r.int(1, 4)
      const y = now.getFullYear() + (status === 'completed' ? 0 : r.int(1, 3))
      return {
        id: `prj-${i + 1}`,
        name,
        developerSlug,
        communitySlug,
        image: photosFor(communitySlug, 1, i)[0]!,
        handover: status === 'completed' ? 'Ready' : `Q${q} ${y}`,
        fromPrice,
        plan,
        status,
        totalUnits: total,
        allocated: Math.round(total * r.float(0.06, 0.18)),
        commissionRate: r.pick([4, 5, 5, 6, 7]),
      }
    }),
  ]
}
export const offplanProjects = createResource<OffPlanProject>('re-offplan', makeProjects, { label: 'Project' })

/* ------------------------------------------------------------------ */
/*  Listings (website listings + generated stock)                      */
/* ------------------------------------------------------------------ */
const BUILDINGS: Record<string, string[]> = {
  'dubai-marina': ['Marina Gate 1', 'Cayan Tower', 'Princess Tower', 'Marina Promenade — Shemara', 'Silverene Tower'],
  downtown: ['Boulevard Point', 'Burj Vista 1', 'The Address Residences', 'Act One | Act Two', 'South Ridge 4'],
  'business-bay': ['Executive Towers', 'Paramount Midtown', 'Bay Square 7', 'Peninsula One', 'Merano Tower'],
  jvc: ['Bloom Towers', 'Belgravia Heights', 'Binghatti Gardens', 'Park Corner', 'Oxford 212'],
  'palm-jumeirah': ['Frond K Villas', 'Shoreline — Al Haseer', 'Oceana Pacific', 'Tiara Residences', 'Garden Homes Frond B'],
  'dubai-hills': ['Maple 2', 'Sidra 3', 'Park Heights 1', 'Golf Place', 'Collective 2.0'],
  'creek-harbour': ['Creek Rise Tower 2', 'Harbour Gate', 'Summer at Creek Beach', 'Address Harbour Point'],
  'damac-lagoons': ['Santorini Cluster', 'Costa Brava 2', 'Portofino', 'Malta Cluster', 'Nice Cluster'],
}
const TYPE_BY_COMMUNITY: Record<string, PropertyType[]> = {
  'palm-jumeirah': ['Villa', 'Apartment', 'Penthouse'],
  'dubai-hills': ['Villa', 'Townhouse', 'Apartment'],
  'damac-lagoons': ['Townhouse', 'Villa'],
  jvc: ['Apartment', 'Studio', 'Townhouse'],
  'business-bay': ['Apartment', 'Studio', 'Office', 'Penthouse'],
  downtown: ['Apartment', 'Penthouse', 'Studio'],
  'dubai-marina': ['Apartment', 'Penthouse', 'Studio'],
  'creek-harbour': ['Apartment', 'Studio'],
}

function makeListings(): Listing[] {
  const r = createRng(202)
  const custs = customers.collection.all()
  const owners = { sale: custs.filter((c) => c.type === 'seller' || c.type === 'investor'), rent: custs.filter((c) => c.type === 'landlord' || c.type === 'investor') }
  const staff = employees.collection.all()
  const brokersBy = (dep: 'sales' | 'leasing') => staff.filter((e) => e.departmentId === dep)
  const out: Listing[] = []

  // Website listings (sale/rent only — off-plan units live under projects)
  for (const p of PROPERTIES) {
    if (p.kind === 'offplan') continue
    const purpose = p.kind
    out.push({
      id: `lst-${p.id}`,
      ref: p.reference,
      purpose,
      status: 'active',
      title: p.title,
      propertyType: (['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio', 'Office'].includes(p.type) ? p.type : 'Apartment') as PropertyType,
      communitySlug: p.communitySlug,
      building: p.building,
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft,
      price: p.priceAed,
      ownerId: r.pick(owners[purpose]).id,
      agentId: SITE_AGENT_TO_EMPLOYEE[p.agentId] ?? 'emp-2',
      permit: p.permit,
      furnishing: p.furnishing,
      cheques: p.cheques ?? null,
      images: p.images,
      listedAt: daysFromNow(-r.int(2, 40)),
      views: r.int(400, 6000),
      enquiries: r.int(4, 60),
      exclusive: r.bool(0.5),
      siteId: p.id,
    })
  }

  // Generated stock
  for (let i = 0; i < 74; i++) {
    const c = r.pick(COMMUNITIES)
    const purpose: 'sale' | 'rent' = r.bool(0.55) ? 'sale' : 'rent'
    const type = r.pick(TYPE_BY_COMMUNITY[c.slug] ?? ['Apartment'])
    const beds = type === 'Studio' || type === 'Office' ? 0 : type === 'Villa' ? r.int(3, 6) : type === 'Townhouse' ? r.int(2, 4) : type === 'Penthouse' ? r.int(3, 5) : r.int(1, 3)
    const sqft = type === 'Studio' ? r.int(380, 520) : type === 'Office' ? r.int(600, 2400) : type === 'Villa' ? r.int(2800, 9000) : type === 'Penthouse' ? r.int(2600, 6500) : type === 'Townhouse' ? r.int(1700, 3200) : r.int(650, 1200) + beds * r.int(250, 450)
    const ppsf = (c.ppsf ?? 1500) * r.float(0.85, 1.2) * (type === 'Penthouse' ? 1.4 : 1)
    const salePrice = round(sqft * ppsf, 10_000)
    const yieldPct = (c.yieldPct ?? 6) * r.float(0.85, 1.1)
    const price = purpose === 'sale' ? salePrice : round((salePrice * yieldPct) / 100, 5_000)
    const ago = r.int(1, 150)
    const status = ago > 90 ? r.weighted([['sold', 0], ['withdrawn', 1], ['active', 2]] as const) : r.weighted([['active', 16], ['under-offer', 3], ['draft', 1]] as const)
    const buildings = BUILDINGS[c.slug] ?? ['Tower A']
    const building = r.pick(buildings)
    out.push({
      id: `lst-${i + 1}`,
      ref: `AA-${purpose === 'sale' ? 'S' : 'R'}-${2700 + i}`,
      purpose,
      status: purpose === 'rent' && status === 'sold' ? 'rented' : status,
      title: `${type === 'Studio' ? 'Studio' : type === 'Office' ? 'Fitted office' : `${beds}-bed ${type.toLowerCase()}`} in ${building}`,
      propertyType: type,
      communitySlug: c.slug,
      building,
      beds,
      baths: Math.max(1, beds + r.int(0, 1)),
      sqft,
      price,
      ownerId: r.pick(owners[purpose]).id,
      agentId: r.pick(brokersBy(purpose === 'sale' ? 'sales' : 'leasing')).id,
      permit: String(r.int(71200000000, 71299999999)),
      furnishing: r.weighted([['unfurnished', 5], ['furnished', 3], ['partly', 1]] as const),
      cheques: purpose === 'rent' ? r.pick([1, 2, 4, 4, 6]) : null,
      images: photosFor(c.slug, 4, i),
      listedAt: daysFromNow(-ago),
      views: r.int(150, 4500),
      enquiries: r.int(1, 45),
      exclusive: r.bool(0.35),
    })
  }
  return out.sort((a, b) => b.listedAt.localeCompare(a.listedAt))
}
export const listings = createResource<Listing>('re-listings-v2', makeListings, { label: 'Listing' })

/* ------------------------------------------------------------------ */
/*  Deals                                                               */
/* ------------------------------------------------------------------ */
const SOURCES: (readonly [LeadSource, number])[] = [
  ['property-finder', 26],
  ['bayut', 20],
  ['referral', 14],
  ['website', 10],
  ['dubizzle', 8],
  ['instagram', 8],
  ['google', 6],
  ['whatsapp', 5],
  ['walk-in', 3],
]
const SALE_STAGES: DealStage[] = ['offer', 'mou', 'noc', 'transfer']
const RENT_STAGES: DealStage[] = ['offer', 'contract', 'ejari']
const OFFPLAN_STAGES: DealStage[] = ['offer', 'mou']

function makeDeals(): Deal[] {
  const r = createRng(303)
  const custs = customers.collection.all()
  const buyers = custs.filter((c) => c.type === 'buyer' || c.type === 'investor')
  const tenants = custs.filter((c) => c.type === 'tenant')
  const staff = employees.collection.all().filter((e) => BROKER_DEPARTMENTS.includes(e.departmentId))
  const byDep = (d: string) => staff.filter((e) => e.departmentId === d)
  const lst = listings.collection.all()
  const projects = offplanProjects.collection.all().filter((p) => p.status !== 'completed')
  const now = today().getTime()
  const out: Deal[] = []
  const N = 420
  for (let i = 0; i < N; i++) {
    const ago = Math.floor(Math.pow(r.next(), 1.25) * 365)
    const createdAt = daysFromNow(-ago, r.int(9, 19), r.pick([0, 15, 30, 45]))
    const type: DealType = r.weighted([['sale', 40], ['rent', 36], ['offplan', 24]] as const)
    let listingId: string | null = null
    let projectId: string | null = null
    let communitySlug: string
    let price: number
    let counterpartyId: string
    let agentId: string
    let commissionRate: number
    if (type === 'offplan') {
      const p = r.pick(projects)
      projectId = p.id
      communitySlug = p.communitySlug
      price = round(p.fromPrice * r.float(1, 1.9), 5_000)
      counterpartyId = developerCustomer(p.developerSlug)?.id ?? custs[0]!.id
      agentId = r.pick(byDep('offplan').concat(byDep('sales'))).id
      commissionRate = p.commissionRate
    } else {
      const pool = lst.filter((l) => l.purpose === type)
      const l = r.pick(pool)
      listingId = l.id
      communitySlug = l.communitySlug
      price = round(l.price * r.float(0.93, 1), type === 'rent' ? 1_000 : 5_000)
      counterpartyId = l.ownerId
      agentId = r.bool(0.65) ? l.agentId : r.pick(byDep(type === 'sale' ? 'sales' : 'leasing')).id
      commissionRate = type === 'sale' ? 2 : 5
    }
    const commission = type === 'rent' ? Math.max(5_000, Math.round((price * commissionRate) / 100)) : Math.round((price * commissionRate) / 100)
    const cycle = type === 'sale' ? r.int(25, 70) : type === 'rent' ? r.int(4, 18) : r.int(10, 45)
    const closeT = new Date(createdAt).getTime() + cycle * DAY
    let stage: DealStage
    let closedAt: string | null = null
    if (r.bool(0.08)) stage = 'cancelled'
    else if (closeT <= now) {
      stage = 'closed'
      closedAt = new Date(closeT).toISOString()
    } else {
      const progress = (now - new Date(createdAt).getTime()) / (cycle * DAY)
      const stages = type === 'sale' ? SALE_STAGES : type === 'rent' ? RENT_STAGES : OFFPLAN_STAGES
      stage = stages[Math.min(stages.length - 1, Math.floor(progress * stages.length))]!
    }
    // Commission collection: closed deals mostly collected; developers pay later (after 20% instalment).
    let collected = 0
    if (stage === 'closed') {
      const closedAgo = (now - closeT) / DAY
      collected = type === 'offplan' ? (closedAgo > 35 ? commission : closedAgo > 10 && r.bool(0.4) ? Math.round(commission * 0.5) : 0) : closedAgo > 20 || r.bool(0.7) ? commission : 0
    } else if (stage === 'transfer' || stage === 'ejari') collected = r.bool(0.4) ? commission : 0
    const agent = staff.find((e) => e.id === agentId)
    out.push({
      id: `deal-${i + 1}`,
      code: '',
      type,
      stage,
      listingId,
      projectId,
      communitySlug,
      clientId: r.pick(type === 'rent' ? tenants : buyers).id,
      counterpartyId,
      agentId,
      price,
      commissionRate,
      commission,
      collected,
      agentSplit: agent?.commissionSplit ?? 50,
      source: r.weighted(SOURCES),
      createdAt,
      expectedCloseDate: isoDay(new Date(closeT).toISOString()),
      closedAt,
      notes: '',
    })
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((d, i, arr) => ({ ...d, code: code('DL', 3000 + arr.length - i) }))
}
export const deals = createResource<Deal>('re-deals', makeDeals, { label: 'Deal' })

/* ------------------------------------------------------------------ */
/*  Leads                                                               */
/* ------------------------------------------------------------------ */
function makeLeads(): Lead[] {
  const r = createRng(404)
  const staff = employees.collection.all().filter((e) => BROKER_DEPARTMENTS.includes(e.departmentId))
  const first = ['Mona', 'Waleed', 'Rania', 'Samir', 'Jana', 'Adel', 'Heba', 'Nabil', 'Farah', 'Sami', 'Olga', 'Majed', 'Ritu', 'Imran', 'Grace', 'Tom', 'Nour', 'Basel', 'Lamia', 'Fadi', 'Igor', 'Mei', 'Hans', 'Claire']
  const last = ['Al Hashimi', 'Khoury', 'Mahmoud', 'Siddiqui', 'Nair', 'Hughes', 'Zaki', 'Obeid', 'Shah', 'Al Marri', 'Ghanem', 'Saeed', 'Volkov', 'Chen', 'Weber', 'Dupont']
  const out: Lead[] = []
  for (let i = 0; i < 96; i++) {
    const name = `${r.pick(first)} ${r.pick(last)}`
    const ago = r.int(0, 80)
    const stage = ago > 45 ? r.weighted([['won', 4], ['lost', 3], ['negotiation', 1]] as const) : r.weighted([['new', 6], ['contacted', 5], ['qualified', 4], ['viewing', 4], ['negotiation', 2], ['won', 2], ['lost', 1]] as const)
    const interest = r.weighted([['buy', 34], ['rent', 30], ['offplan', 22], ['sell', 8], ['list-rental', 6]] as const)
    const c = r.pick(COMMUNITIES)
    const type = r.pick(TYPE_BY_COMMUNITY[c.slug] ?? ['Apartment'])
    const beds = type === 'Studio' || type === 'Office' ? 0 : type === 'Villa' ? r.int(3, 5) : r.int(1, 3)
    const isRent = interest === 'rent' || interest === 'list-rental'
    const budget = isRent ? round(r.int(55, 420) * 1000, 5_000) : round(r.float(0.9, 9) * 1_000_000, 50_000)
    const rate = isRent ? 5 : interest === 'offplan' ? 5 : 2
    out.push({
      id: `lead-${i + 1}`,
      code: code('LD', 800 + i + 1),
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@mail.com`,
      phone: `+971 5${r.int(0, 8)} ${r.int(100, 999)} ${r.int(1000, 9999)}`,
      source: r.weighted(SOURCES),
      stage,
      interest,
      communitySlug: c.slug,
      propertyType: type,
      beds,
      budget,
      value: Math.max(isRent ? 5000 : 0, Math.round((budget * rate) / 100)),
      ownerId: r.pick(staff.filter((e) => (isRent ? e.departmentId === 'leasing' : interest === 'offplan' ? e.departmentId === 'offplan' : e.departmentId === 'sales'))).id,
      priority: r.weighted([['low', 2], ['medium', 5], ['high', 3]] as const),
      createdAt: daysFromNow(-ago, r.int(8, 20)),
      lastActivityAt: daysFromNow(-Math.max(0, ago - r.int(0, ago)), r.int(8, 20)),
      notes: '',
      customerId: null,
      lostReason: stage === 'lost' ? r.pick(['Budget too low', 'Bought through another agency', 'Plans postponed', 'No response', 'Mortgage not approved']) : undefined,
    })
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export const leads = createResource<Lead>('re-leads', makeLeads, { label: 'Lead' })

/* ------------------------------------------------------------------ */
/*  Viewings                                                            */
/* ------------------------------------------------------------------ */
function makeViewings(): Viewing[] {
  const r = createRng(505)
  const lst = listings.collection.all().filter((l) => l.status === 'active' || l.status === 'under-offer')
  const projects = offplanProjects.collection.all()
  const lds = leads.collection.all().filter((l) => l.stage !== 'lost')
  const clients = customers.collection.all().filter((c) => c.type === 'buyer' || c.type === 'tenant' || c.type === 'investor')
  const out: Viewing[] = []
  for (let i = 0; i < 130; i++) {
    const day = r.int(-30, 14)
    const at = daysFromNow(day, r.int(10, 19), r.pick([0, 30]))
    const project = r.bool(0.18) ? r.pick(projects) : null
    const listing = project ? null : r.pick(lst)
    const lead = r.bool(0.6) ? r.pick(lds) : null
    const past = new Date(at).getTime() < Date.now()
    const status = past ? r.weighted([['completed', 8], ['no-show', 1], ['cancelled', 1]] as const) : r.weighted([['scheduled', 12], ['cancelled', 1]] as const)
    out.push({
      id: `vw-${i + 1}`,
      listingId: listing?.id ?? null,
      projectId: project?.id ?? null,
      leadId: lead?.id ?? null,
      clientId: lead ? null : r.pick(clients).id,
      agentId: listing?.agentId ?? lead?.ownerId ?? 'emp-4',
      at,
      status,
      feedback: status === 'completed' ? r.pick(['Loved the view, wants a second viewing', 'Too small for the family', 'Price is above budget', 'Interested — preparing an offer', 'Prefers a higher floor', 'Comparing with Dubai Hills options']) : '',
      interest: status === 'completed' ? r.int(1, 5) : null,
    })
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}
export const viewings = createResource<Viewing>('re-viewings', makeViewings, { label: 'Viewing' })

/* ------------------------------------------------------------------ */
/*  Commission invoices + payments (derived from deals)                */
/* ------------------------------------------------------------------ */
const TYPE_LABEL: Record<DealType, string> = { sale: 'Sale', rent: 'Lease', offplan: 'Off-plan sale' }

function makeFinance() {
  const r = createRng(606)
  const staff = employees.collection.all().filter((e) => e.departmentId === 'finance')
  const lst = listings.collection.all()
  const projects = offplanProjects.collection.all()
  const now = today().getTime()
  const invoices: Invoice[] = []
  const payments: Payment[] = []
  const chrono = [...deals.collection.all()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  let inv = 0
  let pay = 0
  for (const d of chrono) {
    // Invoice once the deal is committed (MOU/contract or later); cancelled deals that were invoiced become void.
    const invoiced = d.stage === 'closed' || d.stage === 'transfer' || d.stage === 'ejari' || d.stage === 'noc' || (d.stage === 'cancelled' && r.bool(0.3))
    if (!invoiced) continue
    inv += 1
    const unit = d.listingId ? lst.find((l) => l.id === d.listingId) : null
    const project = d.projectId ? projects.find((p) => p.id === d.projectId) : null
    const where = unit ? `${unit.title}, ${communityBySlug(unit.communitySlug)?.name}` : project ? `${project.name}` : communityBySlug(d.communitySlug)?.name
    const billTo = d.type === 'offplan' ? d.counterpartyId : d.clientId
    const issueBase = d.closedAt ?? addDays(d.createdAt, 14)
    const issueDate = isoDay(issueBase)
    const dueDate = isoDay(addDays(issueBase, d.type === 'offplan' ? 45 : 7))
    const draft: Invoice = {
      id: `inv-${inv}`,
      number: code('INV', 5200 + inv),
      customerId: billTo,
      dealId: d.id,
      issueDate,
      dueDate,
      items: [{ description: `${TYPE_LABEL[d.type]} commission — ${d.commissionRate}% of AED ${d.price.toLocaleString('en-US')} · ${where}`, qty: 1, unitPrice: d.commission }],
      taxRate: 5,
      paid: 0,
      status: 'sent',
      notes: '',
    }
    const { total } = invoiceTotals(draft)
    const paid = d.collected >= d.commission ? total : Math.round(d.collected * 1.05)
    draft.paid = paid
    const overdue = new Date(dueDate).getTime() < now
    draft.status = d.stage === 'cancelled' ? 'void' : paid >= total ? 'paid' : paid > 0 ? (overdue ? 'overdue' : 'partial') : overdue ? 'overdue' : r.bool(0.12) ? 'draft' : 'sent'
    invoices.push(draft)
    if (paid > 0 && draft.status !== 'void') {
      const parts = paid === total && d.type === 'offplan' && r.bool(0.5) ? [Math.round(paid / 2)] : []
      parts.push(paid - parts.reduce((a, x) => a + x, 0))
      let t = new Date(issueBase).getTime()
      for (const amount of parts) {
        t = Math.min(now, t + r.int(1, 20) * DAY)
        pay += 1
        payments.push({
          id: `pay-${pay}`,
          number: code('RCV', 7100 + pay),
          invoiceId: draft.id,
          dealId: d.id,
          customerId: billTo,
          amount,
          method: d.type === 'offplan' ? 'bank-transfer' : amount > 20000 ? r.weighted([['bank-transfer', 5], ['manager-cheque', 3], ['cheque', 2]] as const) : r.weighted([['bank-transfer', 4], ['cheque', 3], ['card', 2], ['cash', 1]] as const),
          date: dateFromNow(-Math.round((now - t) / DAY)),
          reference: `TX${r.int(100000, 999999)}`,
          receivedById: r.pick(staff).id,
        })
      }
    }
  }
  return { invoices: invoices.reverse(), payments: payments.reverse() }
}

let financeCache: ReturnType<typeof makeFinance> | null = null
const finance = () => (financeCache ??= makeFinance())

export const invoices = createResource<Invoice>('re-invoices', () => finance().invoices, { label: 'Invoice' })
export const payments = createResource<Payment>('re-payments', () => finance().payments, { label: 'Payment' })

export const listingById = (id: string | null | undefined) => (id ? listings.collection.byId(id) : undefined)
export const offplanById = (id: string | null | undefined) => (id ? offplanProjects.collection.byId(id) : undefined)
export const dealById = (id: string | null | undefined) => (id ? deals.collection.byId(id) : undefined)
export const leadById = (id: string | null | undefined) => (id ? leads.collection.byId(id) : undefined)

/** Agency's net share of a deal's commission after the broker split. */
export const agencyShare = (d: Pick<Deal, 'commission' | 'agentSplit'>) => Math.round(d.commission * (1 - d.agentSplit / 100))
/** Broker payout for a deal. */
export const brokerShare = (d: Pick<Deal, 'commission' | 'agentSplit'>) => d.commission - agencyShare(d)
