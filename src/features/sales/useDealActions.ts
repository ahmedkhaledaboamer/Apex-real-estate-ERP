import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from '@/components/ui/Toast'
import { DEAL_FLOW, DEAL_STAGE } from '@/lib/labels'
import { CURRENT_USER_ID } from '@/mocks/core'
import { deals, listingById, listings } from '@/mocks/domain'
import { DEAL_DOC_TEMPLATES, dealChecklist, dealDocs } from '@/mocks/sales'
import type { Deal, DealStage } from '@/types/domain'
import type { DealDocItem } from '@/types/sales'

/** Upserts the deal's checklist/log record without the generic CRUD toasts. */
export function useDealDocsWriter() {
  const qc = useQueryClient()
  const write = useCallback(
    async (deal: Deal, change: { items?: DealDocItem[]; log?: string }) => {
      const existing = dealDocs.collection.byId(deal.id)
      const items = change.items ?? dealChecklist(deal, existing)
      const log = [...(existing?.log ?? []), ...(change.log ? [{ at: new Date().toISOString(), text: change.log, byId: CURRENT_USER_ID }] : [])]
      if (existing) await dealDocs.collection.update(deal.id, { items, log })
      else await dealDocs.collection.create({ id: deal.id, items, log })
      await qc.invalidateQueries({ queryKey: dealDocs.keys.all })
    },
    [qc],
  )
  return write
}

/**
 * Moves a deal to a stage. Closing stamps `closedAt` and marks the listing sold/rented;
 * every move is written to the deal's activity log.
 */
export function useDealStage() {
  const update = deals.useUpdate({ silent: true })
  const updateListing = listings.useUpdate({ silent: true })
  const writeDocs = useDealDocsWriter()
  const move = useCallback(
    (deal: Deal, stage: DealStage) => {
      if (deal.stage === stage) return
      const patch: Partial<Deal> = { stage }
      if (stage === 'closed') patch.closedAt = new Date().toISOString()
      else if (deal.stage === 'closed') patch.closedAt = null
      update.mutate(
        { id: deal.id, patch },
        {
          onSuccess: () => {
            toast.success(stage === 'closed' ? `${deal.code} closed — ${deal.type === 'rent' ? 'unit rented' : 'congratulations!'}` : `${deal.code} moved to ${DEAL_STAGE[stage][0]}`)
            // Advancing ticks off documents that belong to the stages now behind the deal.
            const flow = DEAL_FLOW[deal.type]
            const reached = flow.indexOf(stage)
            const now = new Date().toISOString()
            const items = dealChecklist(deal, dealDocs.collection.byId(deal.id)).map((it) => {
              const t = DEAL_DOC_TEMPLATES[deal.type].find((x) => x.key === it.key)
              const due = stage === 'closed' || (t !== undefined && reached > flow.indexOf(t.stage))
              return due && !it.done ? { ...it, done: true, doneAt: now } : it
            })
            void writeDocs({ ...deal, ...patch }, { items: stage === 'cancelled' ? undefined : items, log: stage === 'cancelled' ? 'Deal cancelled' : `Stage changed: ${DEAL_STAGE[deal.stage][0]} → ${DEAL_STAGE[stage][0]}` })
          },
        },
      )
      const l = listingById(deal.listingId)
      if (l) {
        if (stage === 'closed') updateListing.mutate({ id: l.id, patch: { status: deal.type === 'rent' ? 'rented' : 'sold' } })
        else if (stage === 'cancelled' && (l.status === 'under-offer' || l.status === 'sold' || l.status === 'rented')) updateListing.mutate({ id: l.id, patch: { status: 'active' } })
        else if (deal.stage === 'closed' && (l.status === 'sold' || l.status === 'rented')) updateListing.mutate({ id: l.id, patch: { status: 'under-offer' } })
      }
    },
    [update, updateListing, writeDocs],
  )
  return { move, pending: update.isPending }
}
