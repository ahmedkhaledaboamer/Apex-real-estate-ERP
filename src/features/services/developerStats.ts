import { invoiceTotals } from '@/lib/calc'
import { developerCustomer } from '@/mocks/core'
import type { Deal, Invoice, OffPlanProject } from '@/types/domain'

/** Our business with a developer: projects, off-plan deals, GCI and outstanding commission invoices. */
export function developerStats(slug: string, projects: OffPlanProject[], deals: Deal[], invoices: Invoice[]) {
  const mine = projects.filter((p) => p.developerSlug === slug)
  const ids = new Set(mine.map((p) => p.id))
  const devDeals = deals.filter((d) => d.type === 'offplan' && d.projectId && ids.has(d.projectId))
  const customer = developerCustomer(slug)
  const devInvoices = customer ? invoices.filter((i) => i.customerId === customer.id) : []
  const outstanding = devInvoices.filter((i) => i.status !== 'void' && i.status !== 'draft').reduce((a, i) => a + invoiceTotals(i).balance, 0)
  const overdue = devInvoices.filter((i) => i.status === 'overdue').reduce((a, i) => a + invoiceTotals(i).balance, 0)
  return {
    projects: mine,
    deals: devDeals,
    live: devDeals.filter((d) => d.stage !== 'cancelled'),
    gci: devDeals.filter((d) => d.stage === 'closed').reduce((a, d) => a + d.commission, 0),
    customer,
    invoices: devInvoices,
    outstanding,
    overdue,
  }
}
