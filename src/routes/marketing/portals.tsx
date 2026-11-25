import { createFileRoute } from '@tanstack/react-router'
import { PortalsPage } from '@/features/marketing/PortalsPage'

export const Route = createFileRoute('/marketing/portals')({
  component: PortalsPage,
})
