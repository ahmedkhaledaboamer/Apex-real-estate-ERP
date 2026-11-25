import { createFileRoute } from '@tanstack/react-router'
import { CommunitiesPage } from '@/features/services/CommunitiesPage'

export const Route = createFileRoute('/services/communities')({
  component: CommunitiesPage,
})
