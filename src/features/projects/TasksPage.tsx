import { AlarmClock, CheckCircle2, Columns3, ListTodo, Plus, Rows3, UserRound, CircleAlert } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchInput, Segmented, Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { cn } from '@/lib/cn'
import { optionsOf, PRIORITY } from '@/lib/labels'
import { dateFromNow } from '@/lib/random'
import { CURRENT_USER_ID, employeeById, employees } from '@/mocks/core'
import { addDays, weekStart } from '@/mocks/hr'
import { isTaskDueToday, isTaskOverdue, projects, tasks } from '@/mocks/projects'
import type { Task } from '@/types/projects'
import { TASK_STATUS } from './labels'
import { TaskBoard } from './TaskBoard'
import { TaskDrawer } from './TaskDrawer'
import { DoneCheckbox, DueLabel, ProjectTag, useTaskMutations } from './taskParts'

type View = 'board' | 'list' | 'mine'

export function TasksPage() {
  const { data: list, isLoading } = tasks.useList()
  const { data: projs = [] } = projects.useList()
  const { data: emps = [] } = employees.useList()
  const [creating, setCreating] = useCreateParam()
  const [editing, setEditing] = useState<Task | null>(null)
  const [view, setView] = useState<View>('board')
  const [q, setQ] = useState('')
  const [project, setProject] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('')
  const { toggleDone } = useTaskMutations()

  const all = useMemo(() => list ?? [], [list])
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all.filter(
      (t) =>
        (!project || (project === 'none' ? !t.projectId : t.projectId === project)) &&
        (!assignee || t.assigneeId === assignee) &&
        (!priority || t.priority === priority) &&
        (!term || `${t.title} ${t.code} ${t.tags.join(' ')}`.toLowerCase().includes(term)),
    )
  }, [all, q, project, assignee, priority])

  const kpi = useMemo(() => {
    const mon = weekStart(dateFromNow(0))
    return {
      open: all.filter((t) => t.status !== 'done').length,
      today: all.filter(isTaskDueToday).length,
      overdue: all.filter(isTaskOverdue).length,
      doneWeek: all.filter((t) => t.status === 'done' && t.completedAt && t.completedAt.slice(0, 10) >= mon).length,
      mine: all.filter((t) => t.assigneeId === CURRENT_USER_ID && t.status !== 'done').length,
    }
  }, [all])

  const assigneeOptions = useMemo(() => {
    const ids = new Set(all.map((t) => t.assigneeId))
    return emps.filter((e) => ids.has(e.id)).sort((a, b) => a.name.localeCompare(b.name)).map((e) => ({ value: e.id, label: e.id === CURRENT_USER_ID ? `${e.name} (me)` : e.name }))
  }, [all, emps])

  const columns: Column<Task>[] = [
    { key: 'done', header: '', cell: (t) => <DoneCheckbox task={t} onToggle={() => toggleDone(t)} />, className: 'w-10 pe-0' },
    {
      key: 'title',
      header: 'Task',
      cell: (t) => (
        <div className={cn('min-w-[220px] max-w-[380px] border-s-[3px] ps-2.5', isTaskOverdue(t) ? 'border-danger' : 'border-transparent')}>
          <p className={cn('truncate font-semibold', t.status === 'done' && 'text-muted line-through')}>{t.title}</p>
          <ProjectTag projectId={t.projectId} />
        </div>
      ),
      sort: (t) => t.title,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      cell: (t) => {
        const e = employeeById(t.assigneeId)
        return e ? <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} size={26} /> : '—'
      },
      sort: (t) => employeeById(t.assigneeId)?.name ?? '',
      hideBelow: 'md',
    },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge value={t.status} map={TASK_STATUS} />, sort: (t) => t.status, hideBelow: 'sm' },
    { key: 'priority', header: 'Priority', cell: (t) => <StatusBadge value={t.priority} map={PRIORITY} />, sort: (t) => ({ high: 0, medium: 1, low: 2 })[t.priority], csv: (t) => t.priority, hideBelow: 'lg' },
    { key: 'due', header: 'Due', cell: (t) => <DueLabel task={t} />, sort: (t) => t.dueDate },
    {
      key: 'checklist',
      header: 'Checklist',
      align: 'end',
      cell: (t) => (t.checklist.length ? <span className="text-muted tabular">{t.checklist.filter((c) => c.done).length}/{t.checklist.length}</span> : <span className="text-muted">—</span>),
      csv: (t) => `${t.checklist.filter((c) => c.done).length}/${t.checklist.length}`,
      hideBelow: 'xl',
    },
  ]

  const mine = useMemo(() => {
    const t0 = dateFromNow(0)
    const weekEnd = addDays(weekStart(t0), 6)
    const own = filtered.filter((t) => t.assigneeId === CURRENT_USER_ID).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return [
      { id: 'overdue', title: 'Overdue', tone: 'text-danger dark:text-[#f07f7f]', items: own.filter(isTaskOverdue) },
      { id: 'today', title: 'Today', tone: 'text-[#b06d0f] dark:text-[#f0b25a]', items: own.filter(isTaskDueToday) },
      { id: 'week', title: 'Later this week', tone: 'text-fg', items: own.filter((t) => t.status !== 'done' && t.dueDate > t0 && t.dueDate <= weekEnd) },
      { id: 'later', title: 'Upcoming', tone: 'text-fg', items: own.filter((t) => t.status !== 'done' && t.dueDate > weekEnd) },
      { id: 'done', title: 'Completed', tone: 'text-muted', items: own.filter((t) => t.status === 'done') },
    ]
  }, [filtered])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Everything the team is working on, across projects."
        breadcrumbs={[{ label: 'Projects & Tasks', to: '/projects' }, { label: 'Tasks' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New task
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Open tasks" value={kpi.open} icon={<ListTodo />} footnote={`${kpi.mine} assigned to me`} />
            <StatCard label="Due today" value={kpi.today} icon={<AlarmClock />} tone="warning" footnote="Across all projects" />
            <StatCard label="Overdue" value={kpi.overdue} icon={<CircleAlert />} tone="danger" footnote={kpi.overdue ? 'Needs attention' : 'Nothing overdue'} />
            <StatCard label="Completed this week" value={kpi.doneWeek} icon={<CheckCircle2 />} tone="success" footnote="Since Monday" />
          </>
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks or tags…" className="w-full lg:w-[240px]" aria-label="Search tasks" />
        <Select value={project} onChange={(e) => setProject(e.target.value)} options={[...projs.map((p) => ({ value: p.id, label: p.name })), { value: 'none', label: 'General (no project)' }]} placeholder="All projects" className="min-w-0 flex-1 basis-[150px] lg:w-[200px] lg:flex-none" aria-label="Project" />
        {view !== 'mine' && <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} options={assigneeOptions} placeholder="All assignees" className="min-w-0 flex-1 basis-[150px] lg:w-[180px] lg:flex-none" aria-label="Assignee" />}
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={optionsOf(PRIORITY)} placeholder="Any priority" className="min-w-0 flex-1 basis-[120px] lg:w-[140px] lg:flex-none" aria-label="Priority" />
        <div className="ms-auto">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: <><Columns3 /> Board</> },
              { value: 'list', label: <><Rows3 /> List</> },
              { value: 'mine', label: <><UserRound /> My tasks</> },
            ]}
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-[290px] shrink-0 rounded-card" />
          ))}
        </div>
      ) : view === 'board' ? (
        <TaskBoard items={filtered} onOpen={setEditing} />
      ) : view === 'list' ? (
        <DataTable rows={filtered} columns={columns} onRowClick={setEditing} exportName="tasks" initialSort={{ key: 'due', dir: 'asc' }} pageSize={15} />
      ) : (
        <div className="space-y-4">
          {mine.every((g) => g.items.length === 0) ? (
            <Card>
              <EmptyState icon={<UserRound />} title="Nothing assigned to you" message="Tasks assigned to you will appear here." />
            </Card>
          ) : (
            mine.map((g) =>
              g.items.length === 0 ? null : (
                <MyGroup key={g.id} title={g.title} tone={g.tone} count={g.items.length}>
                  {g.items.map((t) => (
                    <li key={t.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditing(t)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditing(t)}
                        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70"
                      >
                        <DoneCheckbox task={t} onToggle={() => toggleDone(t)} />
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-[13.5px] font-semibold', t.status === 'done' && 'text-muted line-through')}>{t.title}</p>
                          <ProjectTag projectId={t.projectId} />
                        </div>
                        <span className="hidden sm:inline">
                          <StatusBadge value={t.status} map={TASK_STATUS} />
                        </span>
                        {t.priority === 'high' && (
                          <span className="hidden md:inline">
                            <StatusBadge value={t.priority} map={PRIORITY} />
                          </span>
                        )}
                        <DueLabel task={t} className="w-[104px] justify-end" />
                      </div>
                    </li>
                  ))}
                </MyGroup>
              ),
            )
          )}
        </div>
      )}

      <TaskDrawer open={creating || !!editing} task={editing} onClose={() => (editing ? setEditing(null) : setCreating(false))} />
    </div>
  )
}

function MyGroup({ title, tone, count, children }: { title: string; tone: string; count: number; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2/50 px-4 py-2.5">
        <h3 className={cn('text-[13px] font-semibold', tone)}>{title}</h3>
        <span className="rounded-full bg-surface px-1.5 text-[11px] font-semibold text-muted ring-1 ring-line">{count}</span>
      </div>
      <ul className="divide-y divide-line/70">{children}</ul>
    </Card>
  )
}
