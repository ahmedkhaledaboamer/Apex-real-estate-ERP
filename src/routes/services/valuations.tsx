import { createFileRoute } from '@tanstack/react-router'
import { ValuationsPage } from '@/features/services/ValuationsPage'

export const Route = createFileRoute('/services/valuations')({
  component: ValuationsPage,
})
