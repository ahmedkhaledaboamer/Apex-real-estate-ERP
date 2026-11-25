import { createFileRoute } from '@tanstack/react-router'
import { ListingDetailPage } from '@/features/services/ListingDetailPage'

export const Route = createFileRoute('/services/listings/$listingId')({
  component: function ListingRoute() {
    const { listingId } = Route.useParams()
    return <ListingDetailPage key={listingId} listingId={listingId} />
  },
})
