import { createFileRoute } from '@tanstack/react-router'
import { ReportsPage } from '@/features/finance/ReportsPage'

export const Route = createFileRoute('/finance/reports')({
  component: ReportsPage,
})
