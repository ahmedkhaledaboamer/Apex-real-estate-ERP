import { createFileRoute } from '@tanstack/react-router'
import { PayrollPage } from '@/features/hr/PayrollPage'

export const Route = createFileRoute('/hr/payroll')({
  component: PayrollPage,
})
