import { createFileRoute } from '@tanstack/react-router'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'

export const Route = createFileRoute('/projects/$projectId')({
  component: function ProjectRoute() {
    const { projectId } = Route.useParams()
    return <ProjectDetailPage key={projectId} projectId={projectId} />
  },
})
