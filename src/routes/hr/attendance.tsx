import { createFileRoute } from '@tanstack/react-router'
import { AttendancePage } from '@/features/hr/AttendancePage'

export const Route = createFileRoute('/hr/attendance')({
  component: AttendancePage,
})
