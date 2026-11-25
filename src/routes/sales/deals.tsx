import { createFileRoute } from '@tanstack/react-router'
import { DealsPage } from '@/features/sales/DealsPage'

export const Route = createFileRoute('/sales/deals')({
  component: DealsPage,
})
