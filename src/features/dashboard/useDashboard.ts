import { useMemo } from 'react'
import { change, invoiceTotals, sum } from '@/lib/calc'
import { DEAL_TYPE } from '@/lib/labels'
import { today } from '@/lib/random'
import { communityBySlug, employees } from '@/mocks/core'
import { agencyShare, deals, invoices, leads, listings, viewings } from '@/mocks/domain'
import type { LeadStage } from '@/types/domain'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthKey = (iso: string) => iso.slice(0, 7)
const OPEN_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'viewing', 'negotiation']
const DAY = 86_400_000

/**
 * Everything the dashboard shows, derived from the shared collections.
 * Revenue = gross commission income (GCI) of deals closed in the period (by `closedAt`).
 */
export function useDashboard() {
  const d = deals.useList()
  const l = leads.useList()
  const i = invoices.useList()
  const e = employees.useList()
  const v = viewings.useList()
  const s = listings.useList()
  const loading = d.isLoading || l.isLoading || i.isLoading || e.isLoading || v.isLoading || s.isLoading

  const data = useMemo(() => {
    if (!d.data || !l.data || !i.data || !e.data || !v.data || !s.data) return null
    const now = today()
    const closed = d.data.filter((x) => x.stage === 'closed' && x.closedAt)

    const months: { key: string; label: string }[] = []
    for (let k = 11; k >= 0; k--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - k, 1)
      months.push({ key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[dt.getMonth()]! })
    }
    const monthly = months.map((m) => {
      const rows = closed.filter((x) => monthKey(x.closedAt!) === m.key)
      const gci = sum(rows, (x) => x.commission)
      const net = sum(rows, (x) => agencyShare(x))
      return { month: m.label, key: m.key, gci, net, deals: rows.length, volume: sum(rows, (x) => x.price) }
    })
    const cur = monthly[11]!
    const prev = monthly[10]!

    const openLeads = l.data.filter((x) => OPEN_STAGES.includes(x.stage))
    const age = (iso: string) => now.getTime() - new Date(iso).getTime()
    const newLeads30 = l.data.filter((x) => age(x.createdAt) < 30 * DAY).length
    const newLeadsPrev30 = l.data.filter((x) => age(x.createdAt) >= 30 * DAY && age(x.createdAt) < 60 * DAY).length

    const openInvoices = i.data.filter((x) => x.status !== 'void' && x.status !== 'paid' && x.status !== 'draft')
    const receivable = sum(openInvoices, (x) => invoiceTotals(x).balance)
    const overdue = openInvoices.filter((x) => x.status === 'overdue')

    const funnel = (['new', 'contacted', 'qualified', 'viewing', 'negotiation', 'won'] as LeadStage[]).map((st) => {
      const rows = l.data.filter((x) => x.stage === st)
      return { stage: st, count: rows.length, value: sum(rows, (x) => x.value) }
    })
    const won = l.data.filter((x) => x.stage === 'won').length
    const lost = l.data.filter((x) => x.stage === 'lost').length

    // GCI by deal type (12 months)
    const byType = (['sale', 'rent', 'offplan'] as const).map((t) => ({ name: DEAL_TYPE[t], value: sum(closed.filter((x) => x.type === t), (x) => x.commission) }))

    // GCI by community (12 months)
    const commTotals = new Map<string, number>()
    for (const x of closed) commTotals.set(x.communitySlug, (commTotals.get(x.communitySlug) ?? 0) + x.commission)
    const topCommunities = [...commTotals.entries()]
      .map(([slug, gci]) => ({ name: communityBySlug(slug)?.name ?? slug, gci }))
      .sort((a, z) => z.gci - a.gci)
      .slice(0, 6)

    // Active deal pipeline (not closed / cancelled)
    const live = d.data.filter((x) => x.stage !== 'closed' && x.stage !== 'cancelled')

    // Viewings in the next 7 days
    const horizon = now.getTime() + 7 * DAY
    const upcomingViewings = v.data
      .filter((x) => x.status === 'scheduled' && new Date(x.at).getTime() >= Date.now() && new Date(x.at).getTime() <= horizon)
      .sort((a, z) => a.at.localeCompare(z.at))

    // Top brokers by GCI (last 90 days)
    const since = now.getTime() - 90 * DAY
    const byBroker = new Map<string, { gci: number; count: number }>()
    for (const x of closed) {
      if (new Date(x.closedAt!).getTime() < since) continue
      const c = byBroker.get(x.agentId) ?? { gci: 0, count: 0 }
      c.gci += x.commission
      c.count += 1
      byBroker.set(x.agentId, c)
    }
    const brokers = [...byBroker.entries()]
      .map(([id, val]) => ({ employee: e.data.find((p) => p.id === id)!, ...val }))
      .filter((x) => x.employee)
      .sort((a, z) => z.gci - a.gci)
      .slice(0, 5)

    const activeListings = s.data.filter((x) => x.status === 'active')

    return {
      monthly,
      kpi: {
        gci: cur.gci,
        gciChange: change(cur.gci, prev.gci),
        gciSpark: monthly.slice(-8).map((m) => m.gci),
        deals: cur.deals,
        dealsChange: change(cur.deals, prev.deals),
        dealsSpark: monthly.slice(-8).map((m) => m.deals),
        volume: cur.volume,
        net: cur.net,
        openLeads: openLeads.length,
        pipelineValue: sum(openLeads, (x) => x.value),
        newLeads30,
        newLeadsChange: change(newLeads30, newLeadsPrev30),
        receivable,
        overdueCount: overdue.length,
        overdueAmount: sum(overdue, (x) => invoiceTotals(x).balance),
        liveDeals: live.length,
        liveCommission: sum(live, (x) => x.commission),
        activeSale: activeListings.filter((x) => x.purpose === 'sale').length,
        activeRent: activeListings.filter((x) => x.purpose === 'rent').length,
      },
      funnel,
      winRate: won + lost ? (won / (won + lost)) * 100 : 0,
      byType,
      topCommunities,
      upcomingViewings,
      brokers,
      recent: [...d.data].sort((a, z) => z.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    }
  }, [d.data, l.data, i.data, e.data, v.data, s.data])

  return { loading, data }
}
