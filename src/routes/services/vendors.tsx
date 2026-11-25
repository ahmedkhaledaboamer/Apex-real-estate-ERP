import { createFileRoute } from '@tanstack/react-router'
import { VendorsPage } from '@/features/services/VendorsPage'

export const Route = createFileRoute('/services/vendors')({
  component: VendorsPage,
})
