import type { KanbanColumn } from '@/components/ui/Kanban'
import type { Status } from '@/types/core'
import type { ProjectStatus, TaskStatus } from '@/types/projects'

export const PROJECT_STATUS: Record<ProjectStatus, readonly [string, Status]> = {
  planning: ['Planning', 'info'],
  active: ['Active', 'brand'],
  'on-hold': ['On hold', 'warning'],
  completed: ['Completed', 'success'],
}

export const TASK_STATUS: Record<TaskStatus, readonly [string, Status]> = {
  todo: ['To do', 'neutral'],
  'in-progress': ['In progress', 'info'],
  review: ['In review', 'warning'],
  done: ['Done', 'success'],
}

export const TASK_COLUMNS: KanbanColumn<TaskStatus>[] = [
  { id: 'todo', title: 'To do', dot: 'bg-muted' },
  { id: 'in-progress', title: 'In progress', dot: 'bg-info' },
  { id: 'review', title: 'In review', dot: 'bg-warning' },
  { id: 'done', title: 'Done', dot: 'bg-success' },
]
