import { useNavigate } from '@tanstack/react-router'
import { AlarmClock, Briefcase, CalendarClock, FolderKanban, ListTodo, Pencil, Plus, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AvatarStack } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchInput, Segmented } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { useCreateParam } from '@/hooks/useCreateParam'
import { cn } from '@/lib/cn'
import { formatMoneyCompact, formatShortDate } from '@/lib/format'
import { PRIORITY } from '@/lib/labels'
import { dateFromNow } from '@/lib/random'
import { employeeById } from '@/mocks/core'
import { parseDay } from '@/mocks/hr'
import { isTaskOverdue, projectProgress, projects, tasks } from '@/mocks/projects'
import type { Project, ProjectStatus, Task } from '@/types/projects'
import { PROJECT_STATUS } from './labels'
import { projectLink } from './link'
import { ProjectDrawer } from './ProjectDrawer'

export function daysLeft(due: string) {
  return Math.round((parseDay(due).getTime() - parseDay(dateFromNow(0)).getTime()) / 86_400_000)
}

export function ProjectCard({ project: p, taskList, onOpen, onEdit }: { project: Project; taskList: Task[]; onOpen: () => void; onEdit: () => void }) {
  const prog = projectProgress(p.id, taskList)
  const members = p.memberIds.map((id) => employeeById(id)).filter((e): e is NonNullable<typeof e> => !!e)
  const left = daysLeft(p.dueDate)
  const late = p.status !== 'completed' && left < 0
  const budgetPct = p.budget ? (p.spent / p.budget) * 100 : 0
  const link = projectLink(p)
  return (
    <Card className="group relative flex cursor-pointer flex-col overflow-hidden transition-[box-shadow,border-color] duration-150 hover:border-aura/30 hover:shadow-lift" onClick={onOpen}>
      <div className="h-1.5" style={{ background: p.color }} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={p.status} map={PROJECT_STATUS} />
              {p.priority === 'high' && <StatusBadge value="high" map={PRIORITY} />}
            </div>
            <h3 className="mt-2.5 text-[15.5px] leading-snug font-semibold tracking-[-0.01em]">{p.name}</h3>
          </div>
          <Menu items={[{ label: 'Open project', icon: <FolderKanban />, onSelect: onOpen }, { label: 'Edit', icon: <Pencil />, onSelect: onEdit }]} />
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] text-muted">{p.description}</p>
        {link && (
          <div className="mt-3 flex min-w-0 items-center gap-2.5 rounded-xl bg-surface-2/70 p-1.5 pe-3">
            <img src={link.image} alt="" loading="lazy" decoding="async" className="size-9 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 leading-tight">
              <span className="block text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">{link.kind}</span>
              <span className="block truncate text-[12.5px] font-semibold">
                {link.label}
                {link.sub && link.kind === 'Off-plan' && <span className="font-normal text-muted"> · {link.sub}</span>}
              </span>
            </span>
          </div>
        )}

        <div className="mt-4 mb-5">
          <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
            <span className="text-muted">
              <span className="font-semibold text-fg tabular">{prog.done}</span>/{prog.total} tasks
              {prog.overdue > 0 && <span className="ms-1.5 font-semibold text-danger dark:text-[#f07f7f]">· {prog.overdue} overdue</span>}
            </span>
            <span className="font-semibold tabular">{prog.percent}%</span>
          </div>
          <Progress value={prog.percent} tone={p.status === 'completed' ? 'success' : 'brand'} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
          <AvatarStack people={members} max={4} size={28} />
          <div className="text-end text-[12px] leading-tight">
            <p className={cn('inline-flex items-center gap-1 font-semibold', late ? 'text-danger dark:text-[#f07f7f]' : 'text-fg')}>
              <CalendarClock className="size-3.5" />
              {formatShortDate(p.dueDate)}
            </p>
            <p className={cn('mt-0.5 text-muted', budgetPct > 90 && 'text-[#b06d0f] dark:text-[#f0b25a]')}>
              {p.status === 'completed' ? 'Completed' : late ? `${-left}d late` : `${left}d left`} · {Math.round(budgetPct)}% budget
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { data: list, isLoading } = projects.useList()
  const { data: taskList = [] } = tasks.useList()
  const [creating, setCreating] = useCreateParam()
  const [editing, setEditing] = useState<Project | null>(null)
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [q, setQ] = useState('')

  const all = useMemo(() => list ?? [], [list])
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const order: Record<ProjectStatus, number> = { active: 0, planning: 1, 'on-hold': 2, completed: 3 }
    return all
      .filter((p) => (status === 'all' || p.status === status) && (!term || `${p.name} ${p.description} ${p.code} ${projectLink(p)?.label ?? ''}`.toLowerCase().includes(term)))
      .sort((a, b) => order[a.status] - order[b.status] || a.dueDate.localeCompare(b.dueDate))
  }, [all, status, q])

  const kpi = useMemo(() => {
    const live = all.filter((p) => p.status !== 'completed')
    const budget = live.reduce((a, p) => a + p.budget, 0)
    const spent = live.reduce((a, p) => a + p.spent, 0)
    return {
      active: all.filter((p) => p.status === 'active').length,
      planning: all.filter((p) => p.status === 'planning').length,
      open: taskList.filter((t) => t.status !== 'done').length,
      overdue: taskList.filter(isTaskOverdue).length,
      budget,
      spent,
    }
  }, [all, taskList])

  const count = (s: ProjectStatus) => all.filter((p) => p.status === s).length
  const open = (p: Project) => navigate({ to: '/projects/$projectId', params: { projectId: p.id } })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Launch campaigns, listing drives, compliance and internal initiatives."
        breadcrumbs={[{ label: 'Projects & Tasks' }, { label: 'Projects' }]}
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New project
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Active projects" value={kpi.active} icon={<Briefcase />} footnote={`${kpi.planning} in planning`} />
            <StatCard label="Open tasks" value={kpi.open} icon={<ListTodo />} tone="royal" footnote="Across all projects" />
            <StatCard label="Overdue tasks" value={kpi.overdue} icon={<AlarmClock />} tone="danger" footnote={kpi.overdue ? 'Past their due date' : 'All on schedule'} />
            <StatCard label="Budget used" value={`${kpi.budget ? Math.round((kpi.spent / kpi.budget) * 100) : 0}%`} icon={<Wallet />} tone="success" footnote={`${formatMoneyCompact(kpi.spent)} of ${formatMoneyCompact(kpi.budget)}`} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-full overflow-x-auto">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: `All · ${all.length}` },
              { value: 'active', label: `Active · ${count('active')}` },
              { value: 'planning', label: `Planning · ${count('planning')}` },
              { value: 'on-hold', label: `On hold · ${count('on-hold')}` },
              { value: 'completed', label: `Completed · ${count('completed')}` },
            ]}
          />
        </div>
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="w-full sm:ms-auto sm:w-[260px]" aria-label="Search projects" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px] rounded-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban />}
            title="No projects here"
            message={q ? `Nothing matches “${q}”.` : 'Create a project to group related tasks.'}
            action={
              <Button icon={<Plus />} onClick={() => setCreating(true)}>
                New project
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <ProjectCard key={p.id} project={p} taskList={taskList} onOpen={() => open(p)} onEdit={() => setEditing(p)} />
          ))}
        </div>
      )}

      <ProjectDrawer open={creating || !!editing} project={editing} onClose={() => (editing ? setEditing(null) : setCreating(false))} />
    </div>
  )
}
