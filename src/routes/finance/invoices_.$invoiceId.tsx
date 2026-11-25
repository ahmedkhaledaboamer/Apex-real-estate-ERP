import { createFileRoute } from '@tanstack/react-router'
import { InvoiceDetailPage } from '@/features/finance/InvoiceDetailPage'

export const Route = createFileRoute('/finance/invoices_/$invoiceId')({
  component: function InvoiceRoute() {
    const { invoiceId } = Route.useParams()
    return <InvoiceDetailPage key={invoiceId} invoiceId={invoiceId} />
  },
})
