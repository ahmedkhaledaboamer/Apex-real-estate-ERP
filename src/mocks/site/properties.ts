import { IMG } from '@/assets/images'
import type { Furnishing, LatLng, Listing, Property } from './types'

/* PLACEHOLDER DATA — listings and permits are fictional. Replace with the API later. */

const interiors = [IMG.living, IMG.kitchen, IMG.bedroom, IMG.pool, IMG.balcony]
const gallery = (cover: string, shift = 0) => [
  cover,
  ...interiors.slice(shift).concat(interiors.slice(0, shift)).slice(0, 4),
]

export const LISTINGS: Listing[] = [
  // For sale
  { id: 's1', kind: 'sale', title: 'Marina-view apartment', community: 'Dubai Marina', type: 'Apartment', beds: 2, baths: 2, sqft: 1150, priceAed: 2_300_000, images: gallery(IMG.marina, 0), agentId: 'layla', permit: '71204583921' },
  { id: 's2', kind: 'sale', title: 'Burj Khalifa view residence', community: 'Downtown Dubai', type: 'Apartment', beds: 3, baths: 4, sqft: 2000, priceAed: 5_000_000, images: gallery(IMG.balcony, 1), agentId: 'sofia', permit: '71209934410' },
  { id: 's3', kind: 'sale', title: 'Canal-view high-floor unit', community: 'Business Bay', type: 'Apartment', beds: 2, baths: 3, sqft: 1250, priceAed: 2_700_000, images: gallery(IMG.businessBay, 2), agentId: 'daniel', permit: '71203318764' },
  { id: 's4', kind: 'sale', title: 'Signature beachfront villa', community: 'Palm Jumeirah', type: 'Villa', beds: 6, baths: 7, sqft: 9500, priceAed: 42_000_000, images: gallery(IMG.villa, 3), agentId: 'sofia', permit: '71208801257' },
  { id: 's5', kind: 'sale', title: 'Bright 1-bed near Circle Mall', community: 'JVC', type: 'Apartment', beds: 1, baths: 2, sqft: 780, priceAed: 1_100_000, images: gallery(IMG.jvc, 4), agentId: 'omar', permit: '71201156093' },
  { id: 's6', kind: 'sale', title: 'Golf-course family villa', community: 'Dubai Hills Estate', type: 'Villa', beds: 4, baths: 5, sqft: 3400, priceAed: 8_900_000, images: gallery(IMG.dubaiHills, 0), agentId: 'sofia', permit: '71207742218' },

  // For rent (price = per year)
  { id: 'r1', kind: 'rent', title: 'Marina family apartment', community: 'Dubai Marina', type: 'Apartment', beds: 2, baths: 3, sqft: 1300, priceAed: 125_000, images: gallery(IMG.living, 1), agentId: 'layla', permit: '71302248815' },
  { id: 'r2', kind: 'rent', title: 'Executive 2-bed', community: 'Business Bay', type: 'Apartment', beds: 2, baths: 2, sqft: 1100, priceAed: 105_000, images: gallery(IMG.businessBay, 3), agentId: 'daniel', permit: '71304419027' },
  { id: 'r3', kind: 'rent', title: 'Furnished studio', community: 'JVC', type: 'Studio', beds: 0, baths: 1, sqft: 420, priceAed: 58_000, images: gallery(IMG.jvc, 2), agentId: 'omar', permit: '71305583140' },
  { id: 'r4', kind: 'rent', title: 'Fountain-view 1-bed', community: 'Downtown Dubai', type: 'Apartment', beds: 1, baths: 2, sqft: 890, priceAed: 140_000, images: gallery(IMG.downtown, 4), agentId: 'sofia', permit: '71306637712' },
  { id: 'r5', kind: 'rent', title: 'Waterfront 3-bed', community: 'Dubai Creek Harbour', type: 'Apartment', beds: 3, baths: 4, sqft: 1820, priceAed: 210_000, images: gallery(IMG.creekHarbour, 0), agentId: 'daniel', permit: '71301194286' },
  { id: 'r6', kind: 'rent', title: 'Lagoon-side townhouse', community: 'DAMAC Lagoons', type: 'Townhouse', beds: 4, baths: 5, sqft: 2600, priceAed: 185_000, images: gallery(IMG.damacLagoons, 1), agentId: 'omar', permit: '71307720593' },

  // Off-plan
  { id: 'o1', kind: 'offplan', title: 'Lagoon townhouse', community: 'DAMAC Lagoons', type: 'Townhouse', beds: 3, baths: 4, sqft: 2100, priceAed: 3_150_000, images: gallery(IMG.offplanVillas, 2), agentId: 'daniel', permit: '71402219054', handover: 'Q4 2028', paymentPlan: '70/30' },
  { id: 'o2', kind: 'offplan', title: 'Sculpted-tower 2-bed', community: 'Business Bay', type: 'Apartment', beds: 2, baths: 2, sqft: 1180, priceAed: 2_450_000, images: gallery(IMG.offplanTower, 0), agentId: 'daniel', permit: '71404478301', handover: 'Q2 2029', paymentPlan: '60/40' },
  { id: 'o3', kind: 'offplan', title: 'Beachfront 1-bed', community: 'Dubai Creek Harbour', type: 'Apartment', beds: 1, baths: 2, sqft: 760, priceAed: 1_780_000, images: gallery(IMG.offplanWaterfront, 3), agentId: 'layla', permit: '71405561128', handover: 'Q1 2029', paymentPlan: '50/50' },
  { id: 'o4', kind: 'offplan', title: 'Garden studio', community: 'JVC', type: 'Studio', beds: 0, baths: 1, sqft: 410, priceAed: 690_000, images: gallery(IMG.jvc, 1), agentId: 'omar', permit: '71406602244', handover: 'Q3 2027', paymentPlan: '1% monthly' },
  { id: 'o5', kind: 'offplan', title: 'Hills-view 3-bed', community: 'Dubai Hills Estate', type: 'Apartment', beds: 3, baths: 3, sqft: 1650, priceAed: 4_200_000, images: gallery(IMG.dubaiHills, 4), agentId: 'sofia', permit: '71407713390', handover: 'Q4 2028', paymentPlan: '80/20' },
  { id: 'o6', kind: 'offplan', title: 'Sky villa penthouse', community: 'Dubai Marina', type: 'Penthouse', beds: 4, baths: 5, sqft: 4300, priceAed: 14_500_000, images: gallery(IMG.marina, 2), agentId: 'layla', permit: '71408854471', handover: 'Q2 2029', paymentPlan: '60/40' },
]

/* ------------------------------------------------------------------ */
/*  Detail fields for every listing (placeholder copy + coordinates).  */
/* ------------------------------------------------------------------ */

const COMMUNITY_INFO: Record<string, { slug: string; center: LatLng; building: string[]; view: string }> = {
  'Dubai Marina': { slug: 'dubai-marina', center: { lat: 25.0805, lng: 55.1403 }, building: ['Marina Gate 2', 'Cayan Tower', 'Marina Promenade'], view: 'Marina view' },
  'Downtown Dubai': { slug: 'downtown', center: { lat: 25.1972, lng: 55.2744 }, building: ['Burj Vista 1', 'Boulevard Point', 'The Address Residences'], view: 'Burj Khalifa view' },
  'Business Bay': { slug: 'business-bay', center: { lat: 25.1857, lng: 55.2655 }, building: ['Peninsula One', 'Executive Towers', 'Canal Heights'], view: 'Canal view' },
  'Palm Jumeirah': { slug: 'palm-jumeirah', center: { lat: 25.1124, lng: 55.139 }, building: ['Frond G', 'Frond K'], view: 'Sea view' },
  JVC: { slug: 'jvc', center: { lat: 25.0596, lng: 55.2097 }, building: ['Bloom Towers', 'Binghatti Gate', 'Belgravia 3'], view: 'Community view' },
  'Dubai Hills Estate': { slug: 'dubai-hills', center: { lat: 25.1103, lng: 55.2457 }, building: ['Sidra 2', 'Park Heights', 'Golfville'], view: 'Golf course view' },
  'Dubai Creek Harbour': { slug: 'creek-harbour', center: { lat: 25.2052, lng: 55.3445 }, building: ['Creek Rise', 'Harbour Gate'], view: 'Creek view' },
  'DAMAC Lagoons': { slug: 'damac-lagoons', center: { lat: 25.0127, lng: 55.2481 }, building: ['Santorini', 'Costa Brava'], view: 'Lagoon view' },
}

const PROJECT_BY_LISTING: Record<string, string> = { o1: 'lagoon-grove', o2: 'the-curve-tower', o3: 'aurelia-residences' }

const AMENITIES: Record<string, string[]> = {
  Apartment: ['Swimming pool', 'Gym', '24/7 security', 'Covered parking', 'Concierge', 'Built-in wardrobes', 'Central A/C', 'Balcony'],
  Studio: ['Swimming pool', 'Gym', '24/7 security', 'Covered parking', 'Central A/C', 'Kitchen appliances'],
  Penthouse: ['Private terrace', 'Private pool', 'Concierge', 'Valet parking', 'Smart home', 'Maid’s room', 'Gym', 'Spa'],
  Villa: ['Private pool', 'Private garden', 'Maid’s room', 'Driver’s room', 'Covered parking', 'Smart home', 'Community park', 'Kids’ play area'],
  Townhouse: ['Private garden', 'Community pool', 'Covered parking', 'Maid’s room', 'Kids’ play area', 'Jogging track', 'BBQ area'],
}

function describe(l: Listing, view: string): string[] {
  const size = l.beds === 0 ? 'studio' : `${l.beds}-bedroom ${l.type.toLowerCase()}`
  const intro =
    l.kind === 'rent'
      ? `A well-kept ${size} available for annual lease in ${l.community}, with ${view.toLowerCase()} and quick access to the community’s shops, cafés and transport.`
      : l.kind === 'offplan'
        ? `An off-plan ${size} in ${l.community}, offered on a ${l.paymentPlan} payment plan with handover expected ${l.handover}. Payments go into a DLD-registered escrow account.`
        : `A ${size} for sale in ${l.community}, offering ${view.toLowerCase()}, generous natural light and a practical layout across ${l.sqft.toLocaleString('en-US')} sq ft.`
  return [
    intro,
    'The layout separates living and sleeping areas, with a fitted kitchen, built-in storage and bathrooms finished in natural stone. Floor-to-ceiling glazing opens onto the outdoor space.',
    'Residents have use of the building and community facilities listed below. Viewings are available seven days a week, including evenings, and can be arranged by phone or WhatsApp.',
  ]
}

function jitter(center: LatLng, i: number): LatLng {
  return { lat: center.lat + ((i * 37) % 11 - 5) * 0.0011, lng: center.lng + ((i * 53) % 13 - 6) * 0.0011 }
}

export const PROPERTIES: Property[] = LISTINGS.map((l, i) => {
  const info = COMMUNITY_INFO[l.community]
  const furnishing: Furnishing = l.kind === 'rent' ? (i % 2 ? 'furnished' : 'unfurnished') : i % 3 === 0 ? 'partly' : 'unfurnished'
  return {
    ...l,
    communitySlug: info.slug,
    projectSlug: PROJECT_BY_LISTING[l.id],
    building: info.building[i % info.building.length],
    location: jitter(info.center, i + 1),
    description: describe(l, info.view),
    amenities: AMENITIES[l.type] ?? AMENITIES.Apartment,
    completion: l.kind === 'offplan' ? 'offplan' : 'ready',
    furnishing,
    parking: l.type === 'Villa' ? 3 : l.beds >= 3 ? 2 : 1,
    view: info.view,
    serviceChargePerSqft: l.type === 'Villa' || l.type === 'Townhouse' ? 5.5 : l.community === 'Downtown Dubai' ? 22 : 16,
    listedOn: `2026-11-${String(20 - (i % 18)).padStart(2, '0')}`,
    reference: `AA-${l.id.toUpperCase()}-${2600 + i}`,
    cheques: l.kind === 'rent' ? (i % 2 ? 4 : 2) : undefined,
  }
})

export const propertyById = (id: string) => PROPERTIES.find((p) => p.id === id)
