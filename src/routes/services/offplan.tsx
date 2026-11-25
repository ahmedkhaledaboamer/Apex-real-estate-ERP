import { createFileRoute } from '@tanstack/react-router'
import { OffplanPage } from '@/features/services/OffplanPage'

export const Route = createFileRoute('/services/offplan')({
  component: OffplanPage,
})
