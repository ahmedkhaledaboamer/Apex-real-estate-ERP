import { createFileRoute } from '@tanstack/react-router'
import { FinanceOverviewPage } from '@/features/finance/FinanceOverviewPage'

export const Route = createFileRoute('/finance/')({
  component: FinanceOverviewPage,
})
