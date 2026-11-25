import { createFileRoute } from '@tanstack/react-router'
import { EventDetailPage } from '@/features/events/EventDetailPage'

export const Route = createFileRoute('/events/$eventId')({
  component: function EventRoute() {
    const { eventId } = Route.useParams()
    return <EventDetailPage eventId={eventId} />
  },
})
