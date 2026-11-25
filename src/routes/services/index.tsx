import { createFileRoute } from '@tanstack/react-router'
import { ListingsPage } from '@/features/services/ListingsPage'

export const Route = createFileRoute('/services/')({
  component: ListingsPage,
})
