import { createFileRoute } from '@tanstack/react-router'
import { CommissionsPage } from '@/features/finance/CommissionsPage'

export const Route = createFileRoute('/finance/commissions')({
  component: CommissionsPage,
})
