import { CalendarClock, CheckSquare, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/format'
import { PRIORITY } from '@/lib/labels'
import { dateFromNow } from '@/lib/random'
import { employeeById } from '@/mocks/core'
import { addDays, parseDay } from '@/mocks/hr'
import { isTaskDueToday, isTaskOverdue, projectById, tasks } from '@/mocks/projects'
import type { Task, TaskStatus } from '@/types/projects'

/** Status changes from the board / checkboxes: optimistic and silent. */
export function useTaskMutations() {
  const update = tasks.useUpdate({ silent: true })
  const move = (id: string, status: TaskStatus) => update.mutate({ id, patch: { status, completedAt: status === 'done' ? new Date().toISOString() : null } })
  const toggleDone = (t: Task) => move(t.id, t.status === 'done' ? 'todo' : 'done')
  return { move, toggleDone }
}

/** "Overdue · 3d" / "Today" / "Tomorrow" / "12 Dec" */
export function DueLabel({ task, className }: { task: Task; className?: string }) {
  const overdue = isTaskOverdue(task)
  const today = isTaskDueToday(task)
  const tomorrow = task.status !== 'done' && task.dueDate === addDays(dateFromNow(0), 1)
  const daysLate = overdue ? Math.round((parseDay(dateFromNow(0)).getTime() - parseDay(task.dueDate).getTime()) / 86_400_000) : 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[12px] font-medium whitespace-nowrap tabular',
        overdue ? 'text-danger dark:text-[#f07f7f]' : today ? 'text-[#b06d0f] dark:text-[#f0b25a]' : 'text-muted',
        className,
      )}
    >
      <CalendarClock className="size-3.5" />
      {overdue ? `Overdue · ${daysLate}d` : today ? 'Due today' : tomorrow ? 'Tomorrow' : formatShortDate(task.dueDate)}
    </span>
  )
}

export function DoneCheckbox({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = task.status === 'done'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onMouseDown={(e) => e.stopPropagation()}
      draggable={false}
      className={cn(
        'grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150',
        done ? 'border-success bg-success text-white' : 'border-line bg-surface hover:border-success hover:bg-success/10',
      )}
    >
      <svg viewBox="0 0 12 12" className={cn('size-2.5', !done && 'opacity-0')} aria-hidden="true">
        <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export function ProjectTag({ projectId }: { projectId: string | null }) {
  const p = projectById(projectId)
  if (!p) return <span className="text-[11.5px] font-medium text-muted">General</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: p.color }}>
      <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
      <span className="truncate">{p.name}</span>
    </span>
  )
}

/** Card body used on the Kanban board. */
export function TaskCard({ task, onToggle, showProject = true }: { task: Task; onToggle: () => void; showProject?: boolean }) {
  const a = employeeById(task.assigneeId)
  const doneItems = task.checklist.filter((c) => c.done).length
  const overdue = isTaskOverdue(task)
  return (
    <div className={cn('space-y-2.5', overdue && '-m-3.5 rounded-xl border-s-[3px] border-danger p-3.5 ps-3')}>
      {(showProject || task.priority === 'high') && (
        <div className="flex items-center justify-between gap-2">
          {showProject ? <ProjectTag projectId={task.projectId} /> : <span />}
          {task.priority === 'high' && <Badge tone={PRIORITY.high[1]}>High</Badge>}
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5">
          <DoneCheckbox task={task} onToggle={onToggle} />
        </span>
        <p className={cn('text-[13.5px] leading-snug font-semibold', task.status === 'done' && 'text-muted line-through decoration-muted/50')}>{task.title}</p>
      </div>
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <DueLabel task={task} />
          {task.checklist.length > 0 && (
            <span className={cn('inline-flex items-center gap-1 text-[12px] tabular', doneItems === task.checklist.length ? 'text-success' : 'text-muted')}>
              <CheckSquare className="size-3.5" />
              {doneItems}/{task.checklist.length}
            </span>
          )}
          {task.comments > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] text-muted tabular">
              <MessageSquare className="size-3.5" />
              {task.comments}
            </span>
          )}
        </div>
        {a && <Avatar name={a.name} hue={a.avatarHue} photo={a.photo} size={24} />}
      </div>
    </div>
  )
}
