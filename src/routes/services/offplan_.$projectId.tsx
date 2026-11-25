import { createFileRoute } from '@tanstack/react-router'
import { OffplanDetailPage } from '@/features/services/OffplanDetailPage'

export const Route = createFileRoute('/services/offplan_/$projectId')({
  component: function OffplanProjectRoute() {
    const { projectId } = Route.useParams()
    return <OffplanDetailPage key={projectId} projectId={projectId} />
  },
})
