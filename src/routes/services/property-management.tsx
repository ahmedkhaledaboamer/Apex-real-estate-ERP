import { createFileRoute } from '@tanstack/react-router'
import { PropertyManagementPage } from '@/features/services/PropertyManagementPage'

export const Route = createFileRoute('/services/property-management')({
  component: PropertyManagementPage,
})
