import { createFileRoute } from '@tanstack/react-router'
import { InvoicesPage } from '@/features/finance/InvoicesPage'

export const Route = createFileRoute('/finance/invoices')({
  component: InvoicesPage,
})
