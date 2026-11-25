import type { Status } from '@/types/core'
import type { CampaignChannel, CampaignStatus, Portal } from '@/types/marketing'

export const CAMPAIGN_CHANNEL: Record<CampaignChannel, { label: string; color: string; tone: Status }> = {
  meta: { label: 'Meta', color: '#275ba8', tone: 'info' },
  google: { label: 'Google Ads', color: '#1f9d64', tone: 'success' },
  tiktok: { label: 'TikTok', color: '#563d96', tone: 'brand' },
  email: { label: 'Email', color: '#d9891a', tone: 'warning' },
  whatsapp: { label: 'WhatsApp', color: '#3cb4e8', tone: 'info' },
  'portal-featured': { label: 'Portal featured', color: '#843f96', tone: 'brand' },
  print: { label: 'Print', color: '#6b6178', tone: 'neutral' },
  influencer: { label: 'Influencer', color: '#d64545', tone: 'danger' },
}
export const CHANNEL_OPTIONS = Object.entries(CAMPAIGN_CHANNEL).map(([value, v]) => ({ value, label: v.label }))

export const CAMPAIGN_STATUS: Record<CampaignStatus, readonly [string, Status]> = {
  draft: ['Draft', 'neutral'],
  scheduled: ['Scheduled', 'info'],
  active: ['Active', 'success'],
  paused: ['Paused', 'warning'],
  completed: ['Completed', 'brand'],
}

export const PORTAL_LABEL: Record<Portal, { label: string; color: string; short: string }> = {
  'property-finder': { label: 'Property Finder', color: '#d64545', short: 'PF' },
  bayut: { label: 'Bayut', color: '#1f9d64', short: 'BY' },
  dubizzle: { label: 'Dubizzle', color: '#275ba8', short: 'DZ' },
}
