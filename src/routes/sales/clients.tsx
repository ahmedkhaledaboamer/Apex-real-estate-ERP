import { createFileRoute } from '@tanstack/react-router'
import { ClientsPage } from '@/features/sales/ClientsPage'

export const Route = createFileRoute('/sales/clients')({
  component: ClientsPage,
})
