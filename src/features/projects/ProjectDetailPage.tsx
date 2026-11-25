import { Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarClock, CheckCircle2, FolderKanban, ListTodo, Pencil, Plus, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DetailRow, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney, formatMoneyCompact } from '@/lib/format'
import { PRIORITY } from '@/lib/labels'
import { employeeById } from '@/mocks/core'
import { projectProgress, projects, tasks } from '@/mocks/projects'
import type { Task } from '@/types/projects'
import { PROJECT_STATUS } from './labels'
import { ProjectDrawer } from './ProjectDrawer'
import { daysLeft } from './ProjectsPage'
import { TaskBoard } from './TaskBoard'
import { TaskDrawer } from './TaskDrawer'
import { projectLink } from './link'

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { data: list, isLoading } = projects.useList()
  const { data: taskList = [] } = tasks.useList()
  const [editingProject, setEditingProject] = useState(false)
  const [task, setTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState(false)
  const p = list?.find((x) => x.id === projectId)
  const own = useMemo(() => taskList.filter((t) => t.projectId === projectId), [taskList, projectId])

  if (isLoading) return <Skeleton className="h-[480px] rounded-card" />
  if (!p)
    return (
      <Card>
        <EmptyState
          icon={<FolderKanban />}
          title="Project not found"
          action={
            <ButtonLink to="/projects" variant="outline" icon={<ArrowLeft />}>
              All projects
            </ButtonLink>
          }
        />
      </Card>
    )

  const prog = projectProgress(p.id, taskList)
  const left = daysLeft(p.dueDate)
  const remaining = p.budget - p.spent
  const budgetPct = p.budget ? (p.spent / p.budget) * 100 : 0
  const owner = employeeById(p.ownerId)
  const link = projectLink(p)
  const totalDays = Math.max(1, daysLeft(p.dueDate) - daysLeft(p.startDate))
  const elapsedPct = Math.min(100, Math.max(0, ((totalDays - Math.max(0, left)) / totalDays) * 100))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Projects & Tasks', to: '/projects' }, { label: 'Projects', to: '/projects' }, { label: p.code }]}
        title={
          <span className="flex items-center gap-3">
            <span className="size-3.5 shrink-0 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
        }
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge value={p.status} map={PROJECT_STATUS} />
            <StatusBadge value={p.priority} map={PRIORITY} />
            <span>
              {formatDate(p.startDate)} → {formatDate(p.dueDate)}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" icon={<Pencil />} onClick={() => setEditingProject(true)}>
              Edit
            </Button>
            <Button icon={<Plus />} onClick={() => setNewTask(true)}>
              New task
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Progress" value={`${prog.percent}%`} icon={<CheckCircle2 />} tone="success" footnote={`${prog.done} of ${prog.total} tasks done`} />
        <StatCard label="Open tasks" value={prog.open} icon={<ListTodo />} tone="royal" footnote={prog.overdue ? <span className="font-semibold text-danger">{prog.overdue} overdue</span> : 'None overdue'} />
        <StatCard label="Budget spent" value={formatMoneyCompact(p.spent)} icon={<Wallet />} tone={budgetPct > 90 ? 'warning' : 'brand'} footnote={`${Math.round(budgetPct)}% of ${formatMoneyCompact(p.budget)}`} />
        <StatCard
          label={p.status === 'completed' ? 'Finished' : left < 0 ? 'Past due' : 'Time left'}
          value={p.status === 'completed' ? formatDate(p.dueDate) : `${Math.abs(left)} days`}
          icon={<CalendarClock />}
          tone={p.status !== 'completed' && left < 0 ? 'danger' : 'cyan'}
          footnote={`Due ${formatDate(p.dueDate)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Overview" />
          <CardBody className="space-y-5">
            {link && (
              <div className="relative overflow-hidden rounded-xl">
                <img src={link.image} alt="" className="h-36 w-full object-cover sm:h-44" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute start-4 bottom-3 end-4 text-white">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-white/75 uppercase">{link.kind}</p>
                  <p className="truncate text-[16px] font-semibold">
                    {link.label}
                    {link.sub && <span className="font-normal text-white/80"> · {link.sub}</span>}
                  </p>
                </div>
              </div>
            )}
            <p className="text-[13.5px] leading-relaxed text-fg/85">{p.description || <span className="text-muted">No description.</span>}</p>
            <div>
              <div className="mb-1.5 flex justify-between text-[12.5px] text-muted">
                <span>Timeline</span>
                <span className="tabular">{Math.round(elapsedPct)}% elapsed</span>
              </div>
              <Progress value={elapsedPct} tone={p.status !== 'completed' && left < 0 ? 'danger' : 'brand'} />
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-line">
                <DetailRow label="Owner">{owner?.name ?? '—'}</DetailRow>
                <DetailRow label="Code">{p.code}</DetailRow>
              </div>
              <div className="divide-y divide-line">
                <DetailRow label={link?.kind ?? 'Linked to'}>{link ? link.label : 'Internal'}</DetailRow>
                <DetailRow label="Members">{p.memberIds.length}</DetailRow>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Team</p>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {p.memberIds.map((id) => {
                  const e = employeeById(id)
                  if (!e) return null
                  return (
                    <li key={id}>
                      <Link to="/hr/employees/$employeeId" params={{ employeeId: id }} className="block rounded-xl border border-line p-2.5 transition-colors hover:bg-surface-2">
                        <PersonCell name={e.name} hue={e.avatarHue} photo={e.photo} sub={id === p.ownerId ? `Owner · ${e.title}` : e.title} size={30} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Budget" subtitle="AED, approved vs spent" />
          <CardBody className="space-y-4">
            <div>
              <p className="text-[28px] leading-none font-bold tracking-[-0.02em] tabular">{formatMoney(p.spent)}</p>
              <p className="mt-1 text-[12.5px] text-muted">spent of {formatMoney(p.budget)}</p>
            </div>
            <Progress value={budgetPct} tone={budgetPct > 100 ? 'danger' : budgetPct > 90 ? 'warning' : 'brand'} className="h-2.5" />
            <div className="divide-y divide-line">
              <DetailRow label="Approved budget">{formatMoney(p.budget)}</DetailRow>
              <DetailRow label="Spent">{formatMoney(p.spent)}</DetailRow>
              <DetailRow label={remaining < 0 ? 'Over budget' : 'Remaining'}>
                <span className={cn(remaining < 0 ? 'text-danger' : 'text-success')}>{formatMoney(Math.abs(remaining))}</span>
              </DetailRow>
              <DetailRow label="Cost per task">{formatMoney(prog.total ? p.spent / prog.total : 0)}</DetailRow>
            </div>
          </CardBody>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">
            Tasks board <span className="ms-1 text-[13px] font-medium text-muted">{own.length}</span>
          </h2>
          <ButtonLink to="/projects/tasks" variant="ghost" size="sm">
            All tasks
          </ButtonLink>
        </div>
        {own.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ListTodo />}
              title="No tasks yet"
              message="Break the project down into tasks and assign them to the team."
              action={
                <Button icon={<Plus />} onClick={() => setNewTask(true)}>
                  Add first task
                </Button>
              }
            />
          </Card>
        ) : (
          <TaskBoard items={own} onOpen={setTask} showProject={false} />
        )}
      </section>

      <ProjectDrawer open={editingProject} project={p} onClose={() => setEditingProject(false)} />
      <TaskDrawer open={newTask || !!task} task={task} defaults={{ projectId: p.id, assigneeId: p.ownerId }} onClose={() => (task ? setTask(null) : setNewTask(false))} />
    </div>
  )
}
