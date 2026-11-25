import { createResource } from '@/api/resource'
import { code, createRng, daysFromNow, today } from '@/lib/random'
import type { AgencyEvent, Attendee, ChecklistItem, EventType } from '@/types/events'
import { BROKER_DEPARTMENTS, communityBySlug, employees } from './core'
import { leads, listings, offplanProjects } from './domain'

/* Events demo data: ~22 open houses, launches, expos, investor roadshows, seminars and internal
   sessions from two months ago to three months ahead. */

const DAY = 86_400_000

const FIRST = ['Omar', 'Sara', 'Layla', 'Yousef', 'Noor', 'Khaled', 'Mariam', 'Aisha', 'Rami', 'Hana', 'Tariq', 'Dina', 'Reem', 'Salma', 'James', 'Emma', 'Ravi', 'Priya', 'Lucas', 'Sofia', 'Daniel', 'Chloe', 'Arjun', 'Nadia', 'Zain', 'Lina', 'Huda', 'Grace', 'Oliver', 'Charlotte', 'Rohan', 'Ananya', 'Faisal', 'Abdullah', 'Elena', 'Dmitri', 'Wei', 'Mei']
const LAST = ['Haddad', 'Mansour', 'Khalil', 'Saleh', 'Nasser', 'Farouk', 'Aziz', 'Hamdan', 'Rahman', 'Qureshi', 'Fernandes', 'Walker', 'Patel', 'Sharma', 'Rossi', 'Martin', 'Al Amiri', 'El Sayed', 'Darwish', 'Yassin', 'Thompson', 'Hughes', 'Mehta', 'Kapoor', 'Al Otaibi', 'Al Qahtani', 'Ivanova', 'Chen']

export const EVENT_CHECKLISTS: Record<EventType, string[]> = {
  'open-house': ['Owner consent & keys collected', 'Trakheesi permit valid for the ad', 'Portal & social posts live', 'Unit staged and cleaned', 'QR sign-in sheet ready', 'Price sheet & floor plan printed'],
  'project-launch': ['Price list & floor plans received from developer', 'EOI / reservation forms ready', 'Developer sales team confirmed', 'Venue & catering booked', 'Investor & VIP invitations sent', 'Broker briefing on payment plan'],
  expo: ['Stand space confirmed', 'Stand design approved', 'Developer co-branding signed', 'Brochures printed', 'Lead-capture iPads set up', 'Broker rota published'],
  roadshow: ['Ballroom venue booked', 'Local partner agency confirmed', 'Local media ads live', 'Team logistics confirmed', 'Presentations localised', 'Price sheets in local currency printed'],
  'investor-seminar': ['Speakers confirmed (mortgage advisor, lawyer)', 'Market data deck updated', 'Registration page live', 'Room & AV booked', 'Follow-up email drafted'],
  internal: ['Agenda shared', 'Room booked', 'Catering ordered', 'Slides collected'],
}

type Seed = {
  title: string
  type: EventType
  location: string
  city: string
  offset: number
  days: number
  capacity: number
  project?: string
  /** pick an active listing in this community for open houses */
  listingIn?: string
  community?: string
  description: string
}

const SEEDS: Seed[] = [
  { title: 'Open house — Marina Gate 1', type: 'open-house', location: 'Marina Gate 1, Dubai Marina', city: 'Dubai', offset: -54, days: 0, capacity: 30, listingIn: 'dubai-marina', description: 'Weekend open house for a high-floor marina-view apartment with the listing broker on site.' },
  { title: 'Hillcrest Park Villas — VIP launch', type: 'project-launch', location: 'Dubai Hills Golf Club', city: 'Dubai', offset: -47, days: 0, capacity: 120, project: 'Hillcrest Park Villas', description: 'Invitation-only launch evening with the Emaar sales team, EOI collection on the night and an 80/20 payment plan.' },
  { title: 'London investor roadshow', type: 'roadshow', location: 'The Dorchester, Park Lane', city: 'London', offset: -40, days: 2, capacity: 160, project: 'Palm Crescent Collection', description: 'Two-day roadshow for UK investors: Palm Jumeirah and Downtown inventory, rental yields and the buying process from abroad.' },
  { title: 'Q4 sales kick-off', type: 'internal', location: 'Apex Aora HQ, Burj Gate Tower', city: 'Dubai', offset: -33, days: 0, capacity: 40, description: 'Quarterly kick-off: targets, new exclusives, off-plan allocations and commission incentives.' },
  { title: 'Open house — Sidra 3 villa', type: 'open-house', location: 'Sidra 3, Dubai Hills Estate', city: 'Dubai', offset: -26, days: 0, capacity: 25, listingIn: 'dubai-hills', description: 'Family-villa open house with mortgage pre-approval desk.' },
  { title: 'Riyadh investor roadshow', type: 'roadshow', location: 'Four Seasons, Kingdom Centre', city: 'Riyadh', offset: -19, days: 2, capacity: 140, project: 'Lagoon Breeze Townhouses', description: 'Saudi investor roadshow focused on DAMAC Lagoons townhouses and branded residences.' },
  { title: 'Off-plan investing seminar', type: 'investor-seminar', location: 'Apex Aora HQ, Burj Gate Tower', city: 'Dubai', offset: -12, days: 0, capacity: 60, description: 'Payment plans, escrow protection, DLD fees and long-term residency for property investors — with a mortgage advisor and a property lawyer.' },
  { title: 'RERA CPD training — Form F & escrow', type: 'internal', location: 'Apex Aora HQ, Training room', city: 'Dubai', offset: -6, days: 0, capacity: 30, description: 'Mandatory CPD session for brokers: Form F (MOU), escrow accounts and the new advertising rules.' },
  { title: 'Cityscape Global', type: 'expo', location: 'Dubai Exhibition Centre, Expo City', city: 'Dubai', offset: -1, days: 3, capacity: 260, project: 'Marina Sky Residences', description: 'Apex Aora stand at Cityscape Global with Emaar, Sobha and DAMAC co-branding and live off-plan launches.' },
  { title: 'Open house — Bloom Towers, JVC', type: 'open-house', location: 'Bloom Towers, JVC', city: 'Dubai', offset: 3, days: 0, capacity: 30, listingIn: 'jvc', description: 'Rental open house for ready-to-move 1 & 2 bedroom apartments.' },
  { title: 'Marina Sky Residences — launch evening', type: 'project-launch', location: 'Dubai Marina Yacht Club', city: 'Dubai', offset: 6, days: 0, capacity: 150, project: 'Marina Sky Residences', description: 'Launch evening for the Emaar Marina Sky allocation: 70/30 plan, priority unit selection for EOI holders.' },
  { title: 'Weekly sales meeting', type: 'internal', location: 'Apex Aora HQ, Burj Gate Tower', city: 'Dubai', offset: 0, days: 0, capacity: 35, description: 'Pipeline review, stuck deals and viewings for the week.' },
  { title: 'Mumbai investor roadshow', type: 'roadshow', location: 'The Taj Mahal Palace, Colaba', city: 'Mumbai', offset: 12, days: 2, capacity: 180, project: 'Circle One by Binghatti', description: 'Indian investor roadshow: JVC and Business Bay entry-level off-plan with flexible payment plans.' },
  { title: 'Open house — Palm Jumeirah Frond villa', type: 'open-house', location: 'Frond K, Palm Jumeirah', city: 'Dubai', offset: 9, days: 0, capacity: 15, listingIn: 'palm-jumeirah', description: 'Private viewing day for a beachfront signature villa — by appointment.' },
  { title: 'Dubai Hills market outlook breakfast', type: 'investor-seminar', location: 'Address Dubai Hills', city: 'Dubai', offset: 16, days: 0, capacity: 50, community: 'dubai-hills', description: 'Prices, rents and new supply in Dubai Hills for owners and investors.' },
  { title: 'Bay Avenue Lofts — broker preview', type: 'project-launch', location: 'Omniyat sales gallery, Business Bay', city: 'Dubai', offset: 21, days: 0, capacity: 60, project: 'Bay Avenue Lofts', description: 'Developer preview for our brokers and top investors before public launch.' },
  { title: 'International Property Show', type: 'expo', location: 'Dubai World Trade Centre', city: 'Dubai', offset: 33, days: 3, capacity: 200, community: 'creek-harbour', description: 'Stand at IPS focused on ready and off-plan homes in Creek Harbour and Downtown.' },
  { title: 'Open house — Creek Harbour waterfront', type: 'open-house', location: 'Creek Rise Tower 2, Dubai Creek Harbour', city: 'Dubai', offset: 27, days: 0, capacity: 25, listingIn: 'creek-harbour', description: 'Open house for a Creek-view apartment with Burj Khalifa views.' },
  { title: 'Moscow investor roadshow', type: 'roadshow', location: 'Ritz-Carlton Moscow', city: 'Moscow', offset: 48, days: 2, capacity: 120, project: 'Palm Crescent Collection', description: 'Prime and waterfront inventory for CIS investors — cancelled pending partner confirmation.' },
  { title: 'Annual awards & sales kick-off 2027', type: 'internal', location: 'Atlantis The Palm', city: 'Dubai', offset: 40, days: 0, capacity: 60, description: 'Year-end awards for top brokers and the 2027 sales kick-off.' },
  { title: 'Sobha Hartland Vista launch', type: 'project-launch', location: 'Sobha Hartland sales centre', city: 'Dubai', offset: 62, days: 0, capacity: 100, project: 'Sobha Hartland Vista', description: 'Public launch with Sobha — new phase, 60/40 plan.' },
  { title: 'First-time buyer seminar', type: 'investor-seminar', location: 'Apex Aora HQ, Burj Gate Tower', city: 'Dubai', offset: 76, days: 0, capacity: 45, community: 'jvc', description: 'Mortgages, deposits and DLD fees explained for first-time buyers in Dubai.' },
]

function makeEvents(): AgencyEvent[] {
  const r = createRng(1420)
  const staff = employees.collection.all().filter((e) => e.status !== 'terminated')
  const brokers = staff.filter((e) => BROKER_DEPARTMENTS.includes(e.departmentId))
  const marketing = staff.filter((e) => e.departmentId === 'marketing' || e.departmentId === 'offplan')
  const ops = offplanProjects.collection.all()
  const lst = listings.collection.all().filter((l) => l.status === 'active' || l.status === 'under-offer')
  const lds = leads.collection.all()
  const now = today().getTime()

  return SEEDS.map((s, i) => {
    const t = s.type
    const hour = t === 'internal' ? r.pick([9, 10]) : t === 'open-house' ? r.pick([11, 14]) : t === 'investor-seminar' ? r.pick([8, 18]) : t === 'project-launch' ? 19 : 10
    const start = daysFromNow(s.offset, hour, r.pick([0, 30]))
    const end = s.days === 0 ? daysFromNow(s.offset, hour + (t === 'open-house' ? 4 : t === 'internal' ? 2 : 3), 0) : daysFromNow(s.offset + s.days - 1, 19, 0)
    const startT = new Date(start).getTime()
    const endT = new Date(end).getTime()
    const status: AgencyEvent['status'] = s.title.startsWith('Moscow') ? 'cancelled' : endT < now ? 'completed' : startT <= now ? 'in-progress' : s.offset < 30 ? 'confirmed' : r.weighted([['planning', 3], ['confirmed', 1]] as const)

    const project = s.project ? ops.find((p) => p.name === s.project) : undefined
    const pool = lst.filter((l) => l.communitySlug === s.listingIn && l.purpose === (s.listingIn === 'jvc' ? 'rent' : 'sale'))
    const listing = s.listingIn ? r.pick(pool.length ? pool : lst.filter((l) => l.communitySlug === s.listingIn).concat(lst).slice(0, 20)) : undefined
    const title = listing ? `Open house — ${listing.title}` : s.title
    const location = listing ? `${listing.building}, ${communityBySlug(listing.communitySlug)?.name ?? ''}` : s.location
    const communitySlug = s.community ?? project?.communitySlug ?? listing?.communitySlug ?? null

    // Registrants: prospects (some already CRM leads) — or colleagues for internal sessions.
    const fill = status === 'completed' || status === 'in-progress' ? r.float(0.78, 1) : status === 'confirmed' ? r.float(0.45, 0.85) : status === 'cancelled' ? r.float(0.2, 0.4) : r.float(0.1, 0.35)
    const count = Math.max(3, Math.round(s.capacity * fill))
    const used = new Set<string>()
    const attendees: Attendee[] = Array.from({ length: count }, (_, j) => {
      const id = `reg-${i + 1}-${j + 1}`
      if (t === 'internal') {
        const e = staff[j % staff.length]!
        return { id, name: e.name, email: e.email, phone: e.phone, status: endT < now ? (r.bool(0.92) ? 'attended' : 'no-show') : 'registered', leadId: null }
      }
      const lead = r.bool(0.3) ? r.pick(lds) : null
      let name = lead?.name ?? ''
      if (!name || used.has(name)) {
        do name = `${r.pick(FIRST)} ${r.pick(LAST)}`
        while (used.has(name))
      }
      used.add(name)
      const st: Attendee['status'] = status === 'completed' || (status === 'in-progress' && j % 3 !== 0) ? (r.bool(t === 'open-house' ? 0.7 : 0.78) ? 'attended' : 'no-show') : 'registered'
      const cc = s.city === 'London' ? '+44 7' : s.city === 'Riyadh' ? '+966 5' : s.city === 'Mumbai' ? '+91 9' : s.city === 'Moscow' ? '+7 9' : '+971 5'
      return {
        id,
        name,
        email: lead?.email ?? `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@mail.com`,
        phone: lead?.phone ?? `${cc}${r.int(0, 9)} ${r.int(100, 999)} ${r.int(1000, 9999)}`,
        status: st,
        leadId: lead?.id ?? null,
      }
    })

    const attended = attendees.filter((a) => a.status === 'attended').length
    const isInternal = t === 'internal'
    const leadsGenerated = isInternal || status === 'cancelled' ? 0 : status === 'completed' || status === 'in-progress' ? Math.round(attended * r.float(t === 'expo' ? 0.7 : 0.35, t === 'expo' ? 0.95 : 0.6)) : 0
    const dealsAttributed = status === 'completed' && !isInternal ? Math.min(t === 'open-house' ? 1 : 4, Math.max(t === 'open-house' ? 0 : 1, Math.round(leadsGenerated * r.float(0.02, t === 'project-launch' ? 0.07 : 0.05)))) : 0
    const avgGci = project ? (project.fromPrice * r.float(1.1, 1.5) * project.commissionRate) / 100 : listing ? (listing.purpose === 'rent' ? Math.max(5000, listing.price * 0.05) : listing.price * 0.02) : r.amount(35000, 90000, 1000)
    const attributedGci = Math.round((dealsAttributed * avgGci) / 500) * 500

    const perHead = t === 'roadshow' ? r.amount(900, 1500, 50) : t === 'expo' ? r.amount(1100, 1800, 50) : t === 'project-launch' ? r.amount(350, 650, 50) : t === 'investor-seminar' ? r.amount(120, 260, 10) : t === 'open-house' ? r.amount(60, 140, 10) : r.amount(80, 180, 10)
    const budget = Math.round((s.capacity * perHead) / 500) * 500
    const progress = status === 'completed' ? 1 : status === 'in-progress' ? r.float(0.8, 0.95) : status === 'confirmed' ? r.float(0.3, 0.65) : status === 'cancelled' ? r.float(0.08, 0.2) : r.float(0, 0.2)
    const actualCost = Math.round((budget * progress * r.float(0.86, 1.1)) / 100) * 100

    const items = EVENT_CHECKLISTS[t]
    const doneRatio = status === 'completed' ? 1 : status === 'in-progress' ? 0.9 : status === 'confirmed' ? r.float(0.4, 0.75) : status === 'cancelled' ? 0.2 : r.float(0, 0.3)
    const checklist: ChecklistItem[] = items.map((label, j) => ({ id: `chk-${i + 1}-${j + 1}`, label, done: j < Math.round(items.length * doneRatio) }))

    const owner = t === 'open-house' ? (listing ? listing.agentId : r.pick(brokers).id) : t === 'internal' ? r.pick(['emp-1', 'emp-2', 'emp-8']) : t === 'project-launch' || t === 'roadshow' ? r.pick(['emp-4', ...marketing.map((e) => e.id)]) : r.pick(marketing.length ? marketing : brokers).id
    return {
      id: `evt-${i + 1}`,
      code: code('EVT', 300 + i + 1),
      title,
      type: t,
      start,
      end,
      location,
      city: s.city,
      projectId: project?.id ?? null,
      listingId: listing?.id ?? null,
      communitySlug,
      capacity: s.capacity,
      attendees,
      budget,
      actualCost,
      leadsGenerated,
      dealsAttributed,
      attributedGci,
      status,
      ownerId: owner,
      checklist,
      description: s.description,
    }
  })
}

export const events = createResource<AgencyEvent>('re-events', makeEvents, { label: 'Event' })

export const eventById = (id: string | null | undefined) => (id ? events.collection.byId(id) : undefined)

/** The next `n` events that haven't ended yet (excluding cancelled), soonest first. Sync — for the dashboard. */
export function upcomingEvents(n = 5): AgencyEvent[] {
  const now = Date.now()
  return events.collection
    .all()
    .filter((e) => e.status !== 'cancelled' && new Date(e.end).getTime() >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, n)
}

/** Whole days an event spans (at least 1). */
export function eventDays(e: Pick<AgencyEvent, 'start' | 'end'>) {
  return Math.max(1, Math.round((new Date(e.end).setHours(0, 0, 0, 0) - new Date(e.start).setHours(0, 0, 0, 0)) / DAY) + 1)
}
