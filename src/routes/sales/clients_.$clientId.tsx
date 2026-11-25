import { createFileRoute } from '@tanstack/react-router'
import { ClientDetailPage } from '@/features/sales/ClientDetailPage'

export const Route = createFileRoute('/sales/clients_/$clientId')({
  component: function ClientRoute() {
    const { clientId } = Route.useParams()
    return <ClientDetailPage key={clientId} clientId={clientId} />
  },
})
