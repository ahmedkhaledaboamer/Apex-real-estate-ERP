import { createFileRoute } from '@tanstack/react-router'
import { LeavePage } from '@/features/hr/LeavePage'

export const Route = createFileRoute('/hr/leave')({
  component: LeavePage,
})
