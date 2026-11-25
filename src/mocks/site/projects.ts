import { IMG } from '@/assets/images'
import type { OffPlanProject, OffPlanProjectDetail } from './types'

export const OFFPLAN_PROJECTS: OffPlanProject[] = [
  { id: 'p1', name: 'Aurelia Residences', developer: 'Emaar', community: 'Dubai Creek Harbour', image: IMG.offplanWaterfront, handover: 'Q1 2029', fromAed: 1_780_000, plan: '60/40', status: 'Launching' },
  { id: 'p2', name: 'The Curve Tower', developer: 'Omniyat', community: 'Business Bay', image: IMG.offplanTower, handover: 'Q2 2029', fromAed: 2_450_000, plan: '50/50', status: 'Selling' },
  { id: 'p3', name: 'Lagoon Grove', developer: 'DAMAC', community: 'DAMAC Lagoons', image: IMG.offplanVillas, handover: 'Q4 2028', fromAed: 2_890_000, plan: '70/30', status: 'Last units' },
]

/* PLACEHOLDER DATA — project names, DLD numbers and unit mixes are fictional. */
const EXTRA: Record<string, Omit<OffPlanProjectDetail, keyof OffPlanProject>> = {
  p1: {
    slug: 'aurelia-residences',
    developerSlug: 'emaar',
    communitySlug: 'creek-harbour',
    location: { lat: 25.2071, lng: 55.3462 },
    gallery: [IMG.offplanWaterfront, IMG.creekHarbour, IMG.living, IMG.bedroom, IMG.pool],
    summary: 'Waterfront apartments on Creek Beach with skyline and sanctuary views.',
    description: [
      'Aurelia Residences is a pair of 38-storey towers on the Creek Beach waterfront, with one- to three-bedroom apartments and duplex penthouses.',
      'Every home has floor-to-ceiling glazing and a balcony, and residents share a podium-level pool, gym, kids’ club and direct beach access.',
    ],
    amenities: ['Beach access', 'Infinity pool', 'Gym', 'Kids’ club', 'BBQ terrace', 'Retail podium', 'Covered parking', 'Concierge'],
    paymentPlan: [
      { label: 'Booking', percent: 10, due: 'On reservation' },
      { label: 'Within 3 months', percent: 10, due: 'Feb 2027' },
      { label: 'Construction 30%', percent: 20, due: 'Q4 2027' },
      { label: 'Construction 60%', percent: 20, due: 'Q2 2028' },
      { label: 'On handover', percent: 40, due: 'Q1 2029' },
    ],
    unitTypes: [
      { type: '1 bedroom', beds: 1, sizeFrom: 720, sizeTo: 810, fromAed: 1_780_000, available: 24 },
      { type: '2 bedroom', beds: 2, sizeFrom: 1_120, sizeTo: 1_260, fromAed: 2_650_000, available: 18 },
      { type: '3 bedroom', beds: 3, sizeFrom: 1_640, sizeTo: 1_820, fromAed: 3_900_000, available: 9 },
      { type: 'Duplex penthouse', beds: 4, sizeFrom: 3_400, sizeTo: 3_900, fromAed: 9_800_000, available: 2 },
    ],
    launchDate: 'Nov 2026',
    dldProjectNumber: '3341',
    escrowBank: 'Emirates NBD',
    floors: 38,
    totalUnits: 612,
  },
  p2: {
    slug: 'the-curve-tower',
    developerSlug: 'omniyat',
    communitySlug: 'business-bay',
    location: { lat: 25.1879, lng: 55.2689 },
    gallery: [IMG.offplanTower, IMG.businessBay, IMG.kitchen, IMG.balcony, IMG.living],
    summary: 'A sculpted canal-front tower with hotel-style services in Business Bay.',
    description: [
      'The Curve Tower rises 52 storeys above the Dubai Water Canal with a flowing facade that gives every apartment a wraparound terrace.',
      'Residents get hotel-style services, a sky lounge, a 40 m lap pool and a private cinema, minutes from Downtown and DIFC.',
    ],
    amenities: ['Sky lounge', 'Lap pool', 'Private cinema', 'Spa', 'Valet parking', 'Concierge', 'Co-working lounge', 'Gym'],
    paymentPlan: [
      { label: 'Booking', percent: 20, due: 'On reservation' },
      { label: 'Construction 25%', percent: 10, due: 'Q3 2027' },
      { label: 'Construction 50%', percent: 10, due: 'Q1 2028' },
      { label: 'Construction 75%', percent: 10, due: 'Q3 2028' },
      { label: 'On handover', percent: 50, due: 'Q2 2029' },
    ],
    unitTypes: [
      { type: '1 bedroom', beds: 1, sizeFrom: 820, sizeTo: 900, fromAed: 2_450_000, available: 15 },
      { type: '2 bedroom', beds: 2, sizeFrom: 1_180, sizeTo: 1_350, fromAed: 3_600_000, available: 12 },
      { type: '3 bedroom', beds: 3, sizeFrom: 1_900, sizeTo: 2_150, fromAed: 5_900_000, available: 6 },
    ],
    launchDate: 'Sep 2026',
    dldProjectNumber: '3287',
    escrowBank: 'Mashreq',
    floors: 52,
    totalUnits: 340,
  },
  p3: {
    slug: 'lagoon-grove',
    developerSlug: 'damac',
    communitySlug: 'damac-lagoons',
    location: { lat: 25.0141, lng: 55.2502 },
    gallery: [IMG.offplanVillas, IMG.damacLagoons, IMG.pool, IMG.living, IMG.bedroom],
    summary: 'Three- to five-bedroom townhouses and villas on a swimmable lagoon.',
    description: [
      'Lagoon Grove is the final cluster at DAMAC Lagoons: townhouses and villas set around a crystal lagoon with sandy beaches and a wave pool.',
      'Homes have private gardens, maid’s rooms and roof terraces, and the community clubhouse is a short walk away.',
    ],
    amenities: ['Crystal lagoon', 'Wave pool', 'Private gardens', 'Clubhouse', 'Kids’ play areas', 'Jogging track', 'Floating cinema', 'Covered parking'],
    paymentPlan: [
      { label: 'Booking', percent: 20, due: 'On reservation' },
      { label: 'Construction 20%', percent: 10, due: 'Q2 2027' },
      { label: 'Construction 40%', percent: 10, due: 'Q4 2027' },
      { label: 'Construction 60%', percent: 10, due: 'Q2 2028' },
      { label: 'Construction 80%', percent: 20, due: 'Q3 2028' },
      { label: 'On handover', percent: 30, due: 'Q4 2028' },
    ],
    unitTypes: [
      { type: '3 bedroom townhouse', beds: 3, sizeFrom: 2_100, sizeTo: 2_300, fromAed: 2_890_000, available: 8 },
      { type: '4 bedroom townhouse', beds: 4, sizeFrom: 2_600, sizeTo: 2_850, fromAed: 3_450_000, available: 5 },
      { type: '5 bedroom villa', beds: 5, sizeFrom: 4_100, sizeTo: 4_600, fromAed: 6_200_000, available: 3 },
    ],
    launchDate: 'Mar 2026',
    dldProjectNumber: '3105',
    escrowBank: 'Abu Dhabi Commercial Bank',
    floors: 3,
    totalUnits: 420,
  },
}

export const PROJECT_DETAILS: OffPlanProjectDetail[] = OFFPLAN_PROJECTS.map((p) => ({ ...p, ...EXTRA[p.id] }))

export const projectBySlug = (slug: string) => PROJECT_DETAILS.find((p) => p.slug === slug)
