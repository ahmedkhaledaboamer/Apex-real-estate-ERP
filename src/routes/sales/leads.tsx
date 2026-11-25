import { createFileRoute } from '@tanstack/react-router'
import { LeadsPage } from '@/features/sales/LeadsPage'

export const Route = createFileRoute('/sales/leads')({
  component: LeadsPage,
})
