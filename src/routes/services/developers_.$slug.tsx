import { createFileRoute } from '@tanstack/react-router'
import { DeveloperDetailPage } from '@/features/services/DeveloperDetailPage'

export const Route = createFileRoute('/services/developers_/$slug')({
  component: function DeveloperRoute() {
    const { slug } = Route.useParams()
    return <DeveloperDetailPage key={slug} slug={slug} />
  },
})
