import { createFileRoute } from '@tanstack/react-router'
import { CommunityDetailPage } from '@/features/services/CommunityDetailPage'

export const Route = createFileRoute('/services/communities_/$slug')({
  component: function CommunityRoute() {
    const { slug } = Route.useParams()
    return <CommunityDetailPage key={slug} slug={slug} />
  },
})
