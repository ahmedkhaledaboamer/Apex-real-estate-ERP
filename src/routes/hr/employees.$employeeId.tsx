import { createFileRoute } from '@tanstack/react-router'
import { EmployeeProfilePage } from '@/features/hr/EmployeeProfilePage'

export const Route = createFileRoute('/hr/employees/$employeeId')({
  component: function EmployeeRoute() {
    const { employeeId } = Route.useParams()
    return <EmployeeProfilePage key={employeeId} employeeId={employeeId} />
  },
})
