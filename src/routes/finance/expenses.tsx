import { createFileRoute } from '@tanstack/react-router'
import { ExpensesPage } from '@/features/finance/ExpensesPage'

export const Route = createFileRoute('/finance/expenses')({
  component: ExpensesPage,
})
