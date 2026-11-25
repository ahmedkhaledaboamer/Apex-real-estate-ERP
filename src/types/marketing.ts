/** Marketing module: paid campaigns and listing-portal performance. All amounts AED. */

export type CampaignChannel = 'meta' | 'google' | 'tiktok' | 'email' | 'whatsapp' | 'portal-featured' | 'print' | 'influencer'
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'

export interface Campaign {
  id: string
  code: string
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  /** yyyy-mm-dd */
  startDate: string
  /** yyyy-mm-dd */
  endDate: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  leads: number
  viewings: number
  deals: number
  /** Commission (GCI) attributed to the campaign's closed deals */
  gciAttributed: number
  ownerId: string
  /** Off-plan project the campaign promotes */
  offplanProjectId?: string | null
  /** Community the campaign targets */
  communitySlug?: string | null
  /** Audience / targeting notes */
  audience: string
  notes: string
}

export type Portal = 'property-finder' | 'bayut' | 'dubizzle'

/** One portal × one month. */
export interface PortalStat {
  id: string
  portal: Portal
  /** yyyy-mm */
  month: string
  /** Listings live at month end */
  listingsLive: number
  /** Listing quota of the package */
  quota: number
  /** Credits (featured / premium boosts) used and included in the package */
  creditsUsed: number
  creditsTotal: number
  featured: number
  premium: number
  views: number
  leads: number
  /** Package + credits cost for the month (excl. VAT) */
  cost: number
}
