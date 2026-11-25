import { IMG } from '@/assets/images'
import type { CommunityDetail } from './types'

/** Price / sq ft and yields from the data pack §4. "approx" = earlier snapshot. */
export const COMMUNITIES = [
  { slug: 'dubai-marina', name: 'Dubai Marina', image: IMG.marina, ppsf: 1757, approx: true, yieldPct: 5.92, tag: 'Waterfront' },
  { slug: 'downtown', name: 'Downtown Dubai', image: IMG.downtown, ppsf: 2504, approx: true, yieldPct: 5.32, tag: 'Luxury' },
  { slug: 'business-bay', name: 'Business Bay', image: IMG.businessBay, ppsf: 2158, approx: false, yieldPct: 6.33, tag: 'Investor' },
  { slug: 'jvc', name: 'JVC', image: IMG.jvc, ppsf: 1419, approx: false, yieldPct: 7.1, tag: 'Family' },
  { slug: 'palm-jumeirah', name: 'Palm Jumeirah', image: IMG.palm, ppsf: null, approx: false, yieldPct: null, tag: 'Ultra-luxury' },
  { slug: 'dubai-hills', name: 'Dubai Hills Estate', image: IMG.dubaiHills, ppsf: null, approx: false, yieldPct: null, tag: 'Family' },
  { slug: 'creek-harbour', name: 'Dubai Creek Harbour', image: IMG.creekHarbour, ppsf: null, approx: false, yieldPct: 5.37, tag: 'Waterfront' },
  { slug: 'damac-lagoons', name: 'DAMAC Lagoons', image: IMG.damacLagoons, ppsf: 1499, approx: false, yieldPct: null, tag: 'Villas' },
] as const

type Extra = Omit<CommunityDetail, keyof (typeof COMMUNITIES)[number]>

/** Guide content per community (placeholder copy; rents are indicative annual AED). */
const EXTRA: Record<string, Extra> = {
  'dubai-marina': {
    location: { lat: 25.0805, lng: 55.1403 },
    summary: 'A waterfront high-rise district built around a 3 km canal, with the beach at JBR a short walk away.',
    description: [
      'Dubai Marina is one of the city’s most established addresses: more than 200 towers line a man-made canal, linked by a continuous promenade of cafés, restaurants and yacht berths.',
      'It suits professionals and couples who want a walkable, lively neighbourhood with the beach, tram and metro on the doorstep. Rental demand is consistently strong, which keeps vacancy low for investors.',
    ],
    lifestyle: ['Marina Walk promenade', 'JBR beach', 'Dubai Marina Mall', 'Yacht clubs', 'Metro and tram'],
    avgRent1Bed: 105_000,
    avgRent2Bed: 150_000,
    propertyTypes: ['Apartments', 'Penthouses'],
    schools: ['Dubai British School (JLT)', 'Emirates International School Meadows', 'Regent International School'],
    commute: [{ to: 'Dubai Internet City', minutes: 10 }, { to: 'Downtown Dubai', minutes: 25 }, { to: 'DXB Airport', minutes: 35 }],
    freehold: true,
  },
  downtown: {
    location: { lat: 25.1972, lng: 55.2744 },
    summary: 'The city’s showpiece centre around Burj Khalifa, The Dubai Mall and the Dubai Fountain.',
    description: [
      'Downtown Dubai is a master-planned district by Emaar, anchored by Burj Khalifa and The Dubai Mall. Boulevard-facing towers, Old Town low-rises and branded residences give a wide range of homes.',
      'Buyers pay a premium for the address and the views, and short-let demand from visitors is among the highest in the city.',
    ],
    lifestyle: ['The Dubai Mall', 'Dubai Opera', 'Burj Park', 'Mohammed Bin Rashid Boulevard', 'Metro'],
    avgRent1Bed: 130_000,
    avgRent2Bed: 200_000,
    propertyTypes: ['Apartments', 'Penthouses', 'Branded residences'],
    schools: ['GEMS Wellington Primary', 'Raffles International School', 'Jumeira Baccalaureate School'],
    commute: [{ to: 'DIFC', minutes: 5 }, { to: 'DXB Airport', minutes: 15 }, { to: 'Dubai Marina', minutes: 25 }],
    freehold: true,
  },
  'business-bay': {
    location: { lat: 25.1857, lng: 55.2655 },
    summary: 'A mixed-use business district along the Dubai Water Canal, next door to Downtown.',
    description: [
      'Business Bay combines offices, hotels and residential towers along the Dubai Water Canal. Its central location and newer stock make it a favourite with investors.',
      'Canal-side walkways and a growing number of restaurants have turned it into a place to live, not just work.',
    ],
    lifestyle: ['Dubai Water Canal', 'Bay Avenue', 'Marasi Drive', 'Close to Downtown', 'Metro'],
    avgRent1Bed: 95_000,
    avgRent2Bed: 140_000,
    propertyTypes: ['Apartments', 'Penthouses', 'Hotel apartments'],
    schools: ['GEMS Wellington Primary', 'Kings’ School Al Barsha', 'Raffles International School'],
    commute: [{ to: 'Downtown Dubai', minutes: 5 }, { to: 'DIFC', minutes: 10 }, { to: 'DXB Airport', minutes: 18 }],
    freehold: true,
  },
  jvc: {
    location: { lat: 25.0596, lng: 55.2097 },
    summary: 'A family-friendly, mid-market community with parks, schools and the city’s highest yields.',
    description: [
      'Jumeirah Village Circle is a large community of low- and mid-rise buildings, townhouses and villas arranged around landscaped parks.',
      'Entry prices are lower than the waterfront districts, and gross yields above 7% have made JVC one of the most active areas for investors.',
    ],
    lifestyle: ['Circle Mall', '30+ community parks', 'Nurseries and schools', 'Quick access to Al Khail Road'],
    avgRent1Bed: 65_000,
    avgRent2Bed: 95_000,
    propertyTypes: ['Apartments', 'Townhouses', 'Villas', 'Studios'],
    schools: ['JSS International School', 'Sunmarke School', 'Nord Anglia International School'],
    commute: [{ to: 'Dubai Marina', minutes: 15 }, { to: 'Downtown Dubai', minutes: 25 }, { to: 'Al Maktoum Airport', minutes: 30 }],
    freehold: true,
  },
  'palm-jumeirah': {
    location: { lat: 25.1124, lng: 55.139 },
    summary: 'The iconic palm-shaped island of beachfront villas, branded residences and resort hotels.',
    description: [
      'Palm Jumeirah is Dubai’s best-known address, with signature villas on the fronds, apartments on the trunk and resort-style living on the crescent.',
      'Supply is fixed and demand from international buyers is strong, which has made it one of the city’s most resilient ultra-prime markets.',
    ],
    lifestyle: ['Private beaches', 'Nakheel Mall', 'The View at The Palm', 'Beach clubs', 'Monorail'],
    avgRent1Bed: 160_000,
    avgRent2Bed: 240_000,
    propertyTypes: ['Villas', 'Apartments', 'Penthouses'],
    schools: ['Dubai College', 'Kings’ School Al Barsha', 'Dubai British School'],
    commute: [{ to: 'Dubai Marina', minutes: 10 }, { to: 'Downtown Dubai', minutes: 25 }, { to: 'DXB Airport', minutes: 35 }],
    freehold: true,
  },
  'dubai-hills': {
    location: { lat: 25.1103, lng: 55.2457 },
    summary: 'A green, master-planned community around an 18-hole championship golf course.',
    description: [
      'Dubai Hills Estate, by Emaar and Meraas, mixes villas, townhouses and apartments around a golf course and a 2.7 km central park.',
      'Top-rated schools, a large mall and hospital access make it one of the most sought-after family communities.',
    ],
    lifestyle: ['Dubai Hills Mall', 'Golf course', 'Central park', 'Cycling tracks', 'King’s College Hospital'],
    avgRent1Bed: 95_000,
    avgRent2Bed: 145_000,
    propertyTypes: ['Villas', 'Townhouses', 'Apartments'],
    schools: ['GEMS Wellington Academy Al Khail', 'Kings’ School Dubai Hills', 'Dubai Heights Academy'],
    commute: [{ to: 'Downtown Dubai', minutes: 15 }, { to: 'Dubai Marina', minutes: 20 }, { to: 'DXB Airport', minutes: 25 }],
    freehold: true,
  },
  'creek-harbour': {
    location: { lat: 25.2052, lng: 55.3445 },
    summary: 'A waterfront city-within-a-city on Dubai Creek, next to the Ras Al Khor wildlife sanctuary.',
    description: [
      'Dubai Creek Harbour is Emaar’s waterfront development on the historic creek, with towers overlooking the skyline and the flamingo sanctuary.',
      'Much of the community is still being delivered, so it is popular with off-plan buyers looking for long-term growth.',
    ],
    lifestyle: ['Creek Marina', 'Ras Al Khor sanctuary', 'Creek Beach', 'Waterfront promenade'],
    avgRent1Bed: 85_000,
    avgRent2Bed: 125_000,
    propertyTypes: ['Apartments', 'Penthouses'],
    schools: ['Jebel Ali School', 'GEMS Founders School', 'Dubai International Academy'],
    commute: [{ to: 'DXB Airport', minutes: 10 }, { to: 'Downtown Dubai', minutes: 15 }, { to: 'Dubai Marina', minutes: 35 }],
    freehold: true,
  },
  'damac-lagoons': {
    location: { lat: 25.0127, lng: 55.2481 },
    summary: 'Mediterranean-themed villas and townhouses set around crystal lagoons and sandy beaches.',
    description: [
      'DAMAC Lagoons is a villa and townhouse community with clusters named after Mediterranean destinations, each set around swimmable lagoons.',
      'Flexible payment plans and family-sized homes at accessible prices attract both end users and investors.',
    ],
    lifestyle: ['Crystal lagoons', 'Wave pool', 'Floating cinema', 'Community clubhouse', 'Kids’ play areas'],
    avgRent1Bed: null,
    avgRent2Bed: null,
    propertyTypes: ['Townhouses', 'Villas'],
    schools: ['Nord Anglia International School', 'Jebel Ali School', 'Kings’ School Al Barsha'],
    commute: [{ to: 'Dubai Marina', minutes: 25 }, { to: 'Downtown Dubai', minutes: 30 }, { to: 'Al Maktoum Airport', minutes: 25 }],
    freehold: true,
  },
}

export const COMMUNITY_DETAILS: CommunityDetail[] = COMMUNITIES.map((c) => ({ ...c, ...EXTRA[c.slug] }))

export const communityBySlug = (slug: string) => COMMUNITY_DETAILS.find((c) => c.slug === slug)
