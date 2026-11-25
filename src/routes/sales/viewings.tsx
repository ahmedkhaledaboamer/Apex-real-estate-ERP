import { createFileRoute } from '@tanstack/react-router'
import { ViewingsPage } from '@/features/sales/ViewingsPage'

export const Route = createFileRoute('/sales/viewings')({
  component: ViewingsPage,
})
