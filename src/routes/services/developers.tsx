import { createFileRoute } from '@tanstack/react-router'
import { DevelopersPage } from '@/features/services/DevelopersPage'

export const Route = createFileRoute('/services/developers')({
  component: DevelopersPage,
})
