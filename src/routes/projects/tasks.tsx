import { createFileRoute } from '@tanstack/react-router'
import { TasksPage } from '@/features/projects/TasksPage'

export const Route = createFileRoute('/projects/tasks')({
  component: TasksPage,
})
