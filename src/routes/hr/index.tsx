import { createFileRoute } from '@tanstack/react-router'
import { EmployeesPage } from '@/features/hr/EmployeesPage'

export const Route = createFileRoute('/hr/')({
  component: EmployeesPage,
})
