/** Events module: open houses, launches, expos, roadshows, seminars and internal sessions. All amounts AED. */

export type EventType = 'open-house' | 'project-launch' | 'expo' | 'roadshow' | 'investor-seminar' | 'internal'
export type EventStatus = 'planning' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
export type AttendeeStatus = 'registered' | 'attended' | 'no-show'

/** A prospect / registrant (or a colleague for internal sessions). */
export interface Attendee {
  id: string
  name: string
  email: string
  phone: string
  status: AttendeeStatus
  /** Linked CRM lead (`leads`), when the registrant is already in the pipeline */
  leadId: string | null
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface AgencyEvent {
  id: string
  code: string
  title: string
  type: EventType
  /** ISO date-time */
  start: string
  /** ISO date-time */
  end: string
  /** Venue / free-text location */
  location: string
  /** City (Dubai for local events, London/Riyadh/Mumbai… for roadshows) */
  city: string
  /** Optional off-plan project being promoted (`offplanProjects` id) */
  projectId: string | null
  /** Optional listing shown (open houses) */
  listingId: string | null
  /** Optional community focus */
  communitySlug: string | null
  capacity: number
  attendees: Attendee[]
  budget: number
  actualCost: number
  /** New leads captured at / from the event */
  leadsGenerated: number
  /** Deals attributed to the event */
  dealsAttributed: number
  /** Gross commission income of the attributed deals */
  attributedGci: number
  status: EventStatus
  ownerId: string
  checklist: ChecklistItem[]
  description: string
}
