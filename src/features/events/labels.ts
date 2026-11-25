import { EVENT_CHECKLISTS } from '@/mocks/events'
import type { Status } from '@/types/core'
import type { AttendeeStatus, EventStatus, EventType } from '@/types/events'

export const EVENT_STATUS: Record<EventStatus, readonly [string, Status]> = {
  planning: ['Planning', 'neutral'],
  confirmed: ['Confirmed', 'info'],
  'in-progress': ['Live now', 'brand'],
  completed: ['Completed', 'success'],
  cancelled: ['Cancelled', 'danger'],
}

export const EVENT_TYPE: Record<EventType, string> = {
  'open-house': 'Open house',
  'project-launch': 'Project launch',
  expo: 'Expo',
  roadshow: 'Roadshow',
  'investor-seminar': 'Investor seminar',
  internal: 'Internal',
}

/** Colour per event type (calendar chips, legend). Brand palette. */
export const EVENT_TYPE_COLOR: Record<EventType, string> = {
  'open-house': '#1f9d64',
  'project-launch': '#843f96',
  expo: '#3cb4e8',
  roadshow: '#275ba8',
  'investor-seminar': '#d9891a',
  internal: '#6b6178',
}

export const ATTENDEE_STATUS: Record<AttendeeStatus, readonly [string, Status]> = {
  registered: ['Registered', 'info'],
  attended: ['Attended', 'success'],
  'no-show': ['No-show', 'danger'],
}

/** Starter checklist for a new event of each type. */
export const CHECKLIST_TEMPLATE: Record<EventType, string[]> = EVENT_CHECKLISTS
