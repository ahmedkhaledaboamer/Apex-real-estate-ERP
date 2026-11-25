/** Sales-module-only entities (documents checklist per deal, client notes). */
import type { DealStage } from './domain'

export interface DealDocItem {
  key: string
  label: string
  done: boolean
  doneAt: string | null
}

export interface DealLogEntry {
  at: string
  text: string
  byId: string
}

/** Documents checklist + activity log for a deal. `id` = the deal id (one record per deal, created on first change). */
export interface DealDocs {
  id: string
  items: DealDocItem[]
  log: DealLogEntry[]
}

/** Template entry: a document and the stage by which it is normally collected. */
export interface DealDocTemplate {
  key: string
  label: string
  stage: DealStage
}

export type ClientNoteKind = 'note' | 'call' | 'meeting' | 'whatsapp' | 'email'

export interface ClientNote {
  id: string
  customerId: string
  kind: ClientNoteKind
  text: string
  authorId: string
  at: string
}
