import { createFileRoute } from '@tanstack/react-router'
import { PaymentsPage } from '@/features/finance/PaymentsPage'

export const Route = createFileRoute('/finance/payments')({
  component: PaymentsPage,
})
