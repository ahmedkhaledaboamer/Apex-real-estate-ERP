import { createFileRoute } from '@tanstack/react-router'
import { DealDetailPage } from '@/features/sales/DealDetailPage'

export const Route = createFileRoute('/sales/deals_/$dealId')({
  component: function DealRoute() {
    const { dealId } = Route.useParams()
    return <DealDetailPage key={dealId} dealId={dealId} />
  },
})
