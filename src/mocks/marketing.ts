import { createResource } from '@/api/resource'
import { code, createRng, dateFromNow, today } from '@/lib/random'
import type { Campaign, CampaignChannel, CampaignStatus, Portal, PortalStat } from '@/types/marketing'
import { listings, offplanProjects } from './domain'

/* Marketing demo data: ~20 paid campaigns over the last year and 12 months of listing-portal stats.
   Campaign spend and portal costs also feed the Finance expense ledger (mocks/finance.ts). */

const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')
const dayIndex = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - today().getTime()) / DAY)

/** Typical unit economics per channel: CPM (AED per 1,000 impressions), CTR %, cost per lead. */
const ECON: Record<CampaignChannel, { cpm: [number, number]; ctr: [number, number]; cpl: [number, number] }> = {
  meta: { cpm: [18, 30], ctr: [0.9, 1.6], cpl: [85, 170] },
  google: { cpm: [60, 120], ctr: [3, 6], cpl: [180, 340] },
  tiktok: { cpm: [10, 18], ctr: [0.6, 1.1], cpl: [120, 220] },
  email: { cpm: [150, 260], ctr: [2, 4], cpl: [60, 120] },
  whatsapp: { cpm: [600, 900], ctr: [8, 14], cpl: [40, 90] },
  'portal-featured': { cpm: [25, 40], ctr: [1.5, 3], cpl: [120, 200] },
  print: { cpm: [380, 520], ctr: [0.15, 0.3], cpl: [450, 800] },
  influencer: { cpm: [12, 20], ctr: [0.8, 1.4], cpl: [150, 290] },
}

// name, channel, start (days from today), duration (days), budget, community, off-plan project id, paused?, audience
type Plan = [string, CampaignChannel, number, number, number, string | null, string | null, boolean, string]
const PLANS: Plan[] = [
  ['Dubai Hills villas — Meta lead ads', 'meta', -40, 60, 22_000, 'dubai-hills', null, false, 'Families 30–55, UAE residents, HHI top 10%'],
  ['Off-plan launch: Marina Sky', 'meta', -25, 45, 28_000, 'dubai-marina', 'prj-2', false, 'Investors UAE, KSA, UK — lookalike of past off-plan buyers'],
  ['London investor roadshow ads', 'google', -70, 35, 38_000, null, 'prj-4', false, 'UK HNW investors, London geo + roadshow RSVP retargeting'],
  ['Palm Jumeirah luxury — Google Search', 'google', -120, 150, 36_000, 'palm-jumeirah', null, false, 'High-intent search: “Palm Jumeirah villa for sale”'],
  ['JVC rentals — TikTok', 'tiktok', -50, 45, 18_000, 'jvc', null, false, 'Young professionals 22–35, Dubai'],
  ['Golden Visa investors — Google Search', 'google', -200, 90, 32_000, null, null, false, '“Golden Visa property Dubai” keywords, GCC + India'],
  ['Ramadan offers newsletter', 'email', -250, 30, 4_000, null, null, false, 'CRM database — buyers & investors (18k contacts)'],
  ['Lagoon Breeze townhouses — WhatsApp broadcast', 'whatsapp', -90, 30, 3_500, 'damac-lagoons', 'prj-3', false, 'Opted-in investor list'],
  ['Property Finder featured — Downtown', 'portal-featured', -60, 90, 15_000, 'downtown', null, false, 'Featured + premium boosts on Downtown stock'],
  ['Bayut premium boosts — Dubai Marina', 'portal-featured', -150, 60, 16_000, 'dubai-marina', null, false, 'TruCheck premium listings, Marina apartments'],
  ['Creek Harbour off-plan — influencer collab', 'influencer', -100, 21, 30_000, 'creek-harbour', 'prj-5', false, '2 Dubai lifestyle creators, 1.1M combined followers'],
  ['Business Bay offices — Google Search', 'google', -30, 60, 10_000, 'business-bay', null, false, 'SME founders, “office for sale Business Bay”'],
  ['Palm Crescent — Emirates Woman print', 'print', -160, 30, 28_000, 'palm-jumeirah', 'prj-4', false, 'Full-page + QR to landing page'],
  ['Sobha Hartland Vista launch — Meta', 'meta', -300, 45, 40_000, 'dubai-hills', 'prj-8', false, 'Investors + end users, UAE & India'],
  ['Landlord acquisition — Meta', 'meta', -260, 60, 22_000, null, null, false, 'Dubai property owners, list-with-us offer'],
  ['Year-end investor webinar — email', 'email', 6, 14, 3_000, null, null, false, 'Investors & past buyers'],
  ['Bay Avenue Lofts teaser — Meta', 'meta', 8, 30, 35_000, 'business-bay', 'prj-7', false, 'Pre-launch EOI, investors UAE/UK'],
  ['Dubai Marina rentals — Google Search', 'google', -330, 60, 15_000, 'dubai-marina', null, false, '“Apartment for rent Dubai Marina”'],
  ['Summer landlord retention — WhatsApp', 'whatsapp', -180, 30, 2_500, null, null, false, 'Managed landlords, renewal reminders'],
  ['Hillcrest Park villas — TikTok', 'tiktok', -20, 45, 15_000, 'dubai-hills', 'prj-1', true, 'Families 28–45, Dubai & Abu Dhabi'],
]
const OWNERS = ['emp-5', 'emp-5', 'emp-24', 'emp-25']

function makeCampaigns(): Campaign[] {
  const r = createRng(1310)
  const projects = offplanProjects.collection.all()
  return PLANS.map(([name, channel, start, duration, budget, communitySlug, projectId, paused, audience], i) => {
    const end = start + duration
    const e = ECON[channel]
    const elapsed = Math.max(0, Math.min(duration, -start))
    const status: CampaignStatus = start > 0 ? 'scheduled' : end < 0 ? 'completed' : paused ? 'paused' : 'active'
    const pace = status === 'completed' ? r.float(0.9, 1) : status === 'scheduled' ? 0 : (elapsed / duration) * r.float(0.85, 1.05) * (paused ? 0.8 : 1)
    const spent = Math.round(Math.min(budget, budget * pace) / 10) * 10
    const impressions = Math.round((spent / r.float(...e.cpm)) * 1000)
    const clicks = Math.round((impressions * r.float(...e.ctr)) / 100)
    const leads = Math.round(spent / r.float(...e.cpl))
    const viewings = Math.round(leads * r.float(0.16, 0.3))
    // Long-running/finished campaigns have converted some viewings into deals.
    const matured = status === 'completed' || elapsed > 30
    const deals = matured ? Math.max(spent > 10_000 ? 1 : 0, Math.round(viewings * r.float(0.06, 0.13))) : elapsed > 14 && r.bool(0.5) ? 1 : 0
    const project = projects.find((p) => p.id === projectId)
    const avgCommission = project ? Math.min(380_000, project.fromPrice * r.float(1.1, 1.5) * (project.commissionRate / 100)) : channel === 'whatsapp' || name.includes('rentals') || name.includes('Landlord') ? r.amount(9_000, 22_000, 500) : r.amount(45_000, 120_000, 500)
    return {
      id: `cmp-${i + 1}`,
      code: code('CMP', 140 + i + 1, 3),
      name,
      channel,
      status,
      startDate: dateFromNow(start),
      endDate: dateFromNow(end),
      budget,
      spent,
      impressions,
      clicks,
      leads,
      viewings,
      deals,
      gciAttributed: Math.round((deals * avgCommission) / 100) * 100,
      ownerId: OWNERS[i % OWNERS.length]!,
      offplanProjectId: projectId,
      communitySlug,
      audience,
      notes: '',
    }
  })
}
export const campaigns = createResource<Campaign>('re-campaigns', makeCampaigns, { label: 'Campaign' })

/** Share of a campaign's spend that falls in month `key` (yyyy-mm), spread evenly over the days run so far. */
export function campaignSpendInMonth(c: Pick<Campaign, 'startDate' | 'endDate' | 'spent'>, key: string) {
  const s = dayIndex(c.startDate)
  const e = Math.min(dayIndex(c.endDate), 0)
  if (e < s || c.spent <= 0) return 0
  const days = e - s + 1
  let inMonth = 0
  for (let d = s; d <= e; d++) {
    const dt = new Date(today().getTime() + d * DAY)
    if (`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}` === key) inMonth++
  }
  return Math.round((c.spent * inMonth) / days)
}

/* ------------------------------------------------------------------ */
/*  Portal stats (Property Finder, Bayut, Dubizzle) — 12 months         */
/* ------------------------------------------------------------------ */
export const PORTALS: Portal[] = ['property-finder', 'bayut', 'dubizzle']
const PORTAL_PLAN: Record<Portal, { quota: number; base: number; credits: number; creditPrice: number; share: number; views: [number, number]; leads: [number, number] }> = {
  'property-finder': { quota: 120, base: 14_500, credits: 600, creditPrice: 6, share: 1, views: [38_000, 52_000], leads: [175, 235] },
  bayut: { quota: 100, base: 11_200, credits: 450, creditPrice: 5.5, share: 0.88, views: [27_000, 39_000], leads: [118, 165] },
  dubizzle: { quota: 80, base: 4_200, credits: 300, creditPrice: 4.5, share: 0.7, views: [17_000, 28_000], leads: [78, 112] },
}
/** Seasonality: Dubai's summer (Jun–Aug) is quieter, Q4/Q1 busiest. Index = month (0–11). */
const SEASON = [1.08, 1.05, 1.04, 1, 0.97, 0.9, 0.82, 0.84, 0.96, 1.06, 1.1, 1.02]

function makePortalStats(): PortalStat[] {
  const r = createRng(1320)
  const now = today()
  const live = listings.collection.all().filter((l) => l.status === 'active' || l.status === 'under-offer').length
  const out: PortalStat[] = []
  for (let k = 11; k >= 0; k--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - k, 1)
    const month = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`
    const daysInMonth = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
    // Current month is month-to-date.
    const frac = k === 0 ? now.getDate() / daysInMonth : 1
    const season = SEASON[dt.getMonth()]!
    // Stock grew over the year (≈ 70% → 100% of today's live listings).
    const growth = 0.7 + 0.3 * ((11 - k) / 11)
    for (const portal of PORTALS) {
      const p = PORTAL_PLAN[portal]
      const listingsLive = Math.min(p.quota, Math.round(live * p.share * growth * r.float(0.95, 1.05)))
      const creditsUsed = Math.round(p.credits * r.float(0.62, 0.97) * (k === 0 ? frac : 1))
      out.push({
        id: `ps-${portal}-${month}`,
        portal,
        month,
        listingsLive,
        quota: p.quota,
        creditsUsed,
        creditsTotal: p.credits,
        featured: Math.round(listingsLive * r.float(0.1, 0.16)),
        premium: Math.round(listingsLive * r.float(0.04, 0.08)),
        views: Math.round(r.float(...p.views) * season * growth * frac),
        leads: Math.round(r.float(...p.leads) * season * (0.8 + 0.2 * growth) * frac),
        cost: Math.round(p.base + p.credits * p.creditPrice * r.float(0.85, 1)),
      })
    }
  }
  return out
}
export const portalStats = createResource<PortalStat>('re-portal-stats', makePortalStats, { label: 'Portal stats' })
