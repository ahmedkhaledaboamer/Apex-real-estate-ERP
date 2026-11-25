import { Kanban } from '@/components/ui/Kanban'
import { isTaskOverdue } from '@/mocks/projects'
import type { Task } from '@/types/projects'
import { TASK_COLUMNS } from './labels'
import { TaskCard, useTaskMutations } from './taskParts'

/** Drag-and-drop task board (status columns) shared by the Tasks page and project pages. */
export function TaskBoard({ items, onOpen, showProject = true }: { items: Task[]; onOpen: (t: Task) => void; showProject?: boolean }) {
  const { move, toggleDone } = useTaskMutations()
  const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return (
    <Kanban
      columns={TASK_COLUMNS}
      items={sorted}
      getColumn={(t) => t.status}
      onMove={move}
      onCardClick={onOpen}
      columnSummary={(list) => {
        const overdue = list.filter(isTaskOverdue).length
        return overdue ? <span className="font-semibold text-danger dark:text-[#f07f7f]">{overdue} overdue</span> : list.length ? 'On track' : 'Drop tasks here'
      }}
      renderCard={(t) => <TaskCard task={t} onToggle={() => toggleDone(t)} showProject={showProject} />}
    />
  )
}
