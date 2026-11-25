import type { Community } from '@/types/core'
import type { Deal, Listing } from '@/types/domain'
import { closedWithin } from './shared'

const avgPpsf = (rows: Listing[]) => (rows.length ? rows.reduce((a, l) => a + l.price / Math.max(1, l.sqft), 0) / rows.length : 0)

/** Market + agency stats for a community. ppsf / yield fall back to our own listings when the data pack has none. */
export function communityStats(c: Community, listings: Listing[], deals: Deal[]) {
  const mine = listings.filter((l) => l.communitySlug === c.slug)
  const active = mine.filter((l) => l.status === 'active' || l.status === 'under-offer')
  const sales = mine.filter((l) => l.purpose === 'sale')
  const rents = mine.filter((l) => l.purpose === 'rent')
  const salePpsf = avgPpsf(sales)
  const rentPpsf = avgPpsf(rents)
  const ppsf = c.ppsf ?? (salePpsf ? Math.round(salePpsf) : null)
  const yieldPct = c.yieldPct ?? (salePpsf && rentPpsf ? Math.round((rentPpsf / salePpsf) * 1000) / 10 : null)
  const communityDeals = deals.filter((d) => d.communitySlug === c.slug)
  const closed12 = communityDeals.filter((d) => closedWithin(d, 365))
  return {
    listings: mine,
    active,
    ppsf,
    ppsfEstimated: c.ppsf == null && ppsf != null,
    yieldPct,
    yieldEstimated: c.yieldPct == null && yieldPct != null,
    deals: communityDeals,
    closed12,
    gci12: closed12.reduce((a, d) => a + d.commission, 0),
    volume12: closed12.reduce((a, d) => a + d.price, 0),
  }
}
