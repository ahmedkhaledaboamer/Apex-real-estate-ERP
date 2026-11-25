import type { Deal, OffPlanProject } from '@/types/domain'

/** Agency performance on an off-plan project: units sold = off-plan deals not cancelled. */
export function projectStats(p: Pick<OffPlanProject, 'id' | 'allocated'>, deals: Deal[]) {
  const mine = deals.filter((d) => d.type === 'offplan' && d.projectId === p.id)
  const live = mine.filter((d) => d.stage !== 'cancelled')
  const closed = mine.filter((d) => d.stage === 'closed')
  const gci = closed.reduce((a, d) => a + d.commission, 0)
  const pipeline = live.filter((d) => d.stage !== 'closed').reduce((a, d) => a + d.commission, 0)
  const sold = live.length
  return { deals: mine, sold, closed: closed.length, gci, pipeline, collected: closed.reduce((a, d) => a + d.collected, 0), pct: p.allocated ? Math.min(100, (sold / p.allocated) * 100) : 0, volume: live.reduce((a, d) => a + d.price, 0) }
}
