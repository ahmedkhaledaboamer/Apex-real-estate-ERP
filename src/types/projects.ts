import type { Priority } from './domain'

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed'

export interface Project {
  id: string
  code: string
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  ownerId: string
  memberIds: string[]
  /** yyyy-mm-dd */
  startDate: string
  /** yyyy-mm-dd */
  dueDate: string
  /** AED */
  budget: number
  /** AED */
  spent: number
  /** Hex colour used for the card accent and task tags */
  color: string
  /** Optional link to an off-plan project (`offplanProjects`) */
  offplanId: string | null
  /** Optional community slug */
  communitySlug: string | null
  createdAt: string
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  code: string
  title: string
  description: string
  projectId: string | null
  assigneeId: string
  status: TaskStatus
  priority: Priority
  /** yyyy-mm-dd */
  dueDate: string
  tags: string[]
  checklist: ChecklistItem[]
  comments: number
  createdAt: string
  completedAt: string | null
}
