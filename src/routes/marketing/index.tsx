import { createFileRoute } from '@tanstack/react-router'
import { CampaignsPage } from '@/features/marketing/CampaignsPage'

export const Route = createFileRoute('/marketing/')({
  component: CampaignsPage,
})
