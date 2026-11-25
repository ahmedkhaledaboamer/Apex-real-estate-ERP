/* Domain types shared across the app. */

export type Currency = 'AED' | 'USD' | 'EUR' | 'GBP'
export type Lang = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

export type LatLng = { lat: number; lng: number }

export type ListingKind = 'sale' | 'rent' | 'offplan'
export type Completion = 'ready' | 'offplan'
export type Furnishing = 'furnished' | 'unfurnished' | 'partly'

export type Listing = {
  id: string
  kind: ListingKind
  title: string
  community: string
  type: string
  beds: number
  baths: number
  sqft: number
  priceAed: number
  images: string[]
  agentId: string
  permit: string
  handover?: string
  paymentPlan?: string
}

/** A listing with everything the detail page needs. */
export type Property = Listing & {
  communitySlug: string
  projectSlug?: string
  building: string
  location: LatLng
  description: string[]
  amenities: string[]
  completion: Completion
  furnishing: Furnishing
  parking: number
  view: string
  serviceChargePerSqft: number
  listedOn: string
  reference: string
  /** Rent only: number of cheques accepted. */
  cheques?: number
}

export type Agent = {
  id: string
  name: string
  role: string
  photo: string
  languages: string[]
  communities: string[]
  brn: string
}

export type AgentProfile = Agent & {
  slug: string
  bio: string
  phone: string
  whatsapp: string
  email: string
  yearsExperience: number
  dealsClosed: number
  specialities: string[]
}

export type Community = {
  slug: string
  name: string
  image: string
  ppsf: number | null
  approx: boolean
  yieldPct: number | null
  tag: string
}

export type CommunityDetail = Community & {
  location: LatLng
  summary: string
  description: string[]
  lifestyle: string[]
  avgRent1Bed: number | null
  avgRent2Bed: number | null
  propertyTypes: string[]
  schools: string[]
  commute: { to: string; minutes: number }[]
  freehold: boolean
}

export type Developer = {
  slug: string
  name: string
  founded: number
  hq: string
  summary: string
  description: string
  deliveredUnits: string
  signatureProjects: string[]
  /** Representative photo (one of their communities/projects) — placeholder until licensed imagery arrives. */
  image: string
}

export type OffPlanProject = {
  id: string
  name: string
  developer: string
  community: string
  image: string
  handover: string
  fromAed: number
  plan: string
  status: string
}

export type PaymentMilestone = { label: string; percent: number; due: string }
export type UnitType = { type: string; beds: number; sizeFrom: number; sizeTo: number; fromAed: number; available: number }

export type OffPlanProjectDetail = OffPlanProject & {
  slug: string
  developerSlug: string
  communitySlug: string
  location: LatLng
  gallery: string[]
  summary: string
  description: string[]
  amenities: string[]
  paymentPlan: PaymentMilestone[]
  unitTypes: UnitType[]
  launchDate: string
  dldProjectNumber: string
  escrowBank: string
  floors: number
  totalUnits: number
}

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string; cite?: string }

export type Article = {
  id: string
  category: string
  title: string
  date: string
  read: string
  image: string
}

export type ArticleDetail = Article & {
  slug: string
  excerpt: string
  author: string
  authorRole: string
  body: ArticleBlock[]
}

export type Testimonial = {
  name: string
  context: string
  quote: string
  avatar: string
  rating: number
}

export type LeadType = 'enquiry' | 'viewing' | 'valuation' | 'contact' | 'register-interest' | 'callback'

export type Lead = {
  type: LeadType
  name: string
  email?: string
  phone: string
  message?: string
  propertyId?: string
  projectSlug?: string
  agentId?: string
  preferredDate?: string
  extra?: Record<string, string>
}
