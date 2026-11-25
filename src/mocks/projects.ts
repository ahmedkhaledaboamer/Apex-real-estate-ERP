import { createResource } from '@/api/resource'
import { code, createRng, dateFromNow, daysFromNow } from '@/lib/random'
import type { DepartmentId } from '@/types/core'
import type { Priority } from '@/types/domain'
import type { ChecklistItem, Project, ProjectStatus, Task, TaskStatus } from '@/types/projects'
import { CURRENT_USER_ID, employees } from './core'
import { deals, offplanProjects } from './domain'

/* Internal real-estate initiatives (launch campaigns, inventory drives, compliance, systems) and the
   team's tasks. Due dates cluster around today so the board always has something overdue, due today
   and coming up. Projects can link to an off-plan project and/or a community. */

/** Accent colours offered when creating a project. */
export const PROJECT_COLORS = ['#843f96', '#275ba8', '#3cb4e8', '#563d96', '#d9891a', '#1f9d64', '#d64545', '#a97cc4']

interface ProjectSeed {
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  ownerId: string
  team: [DepartmentId, number][]
  start: number
  due: number
  budget: number
  spent: number
  color: string
  /** Off-plan project name (looked up in `offplanProjects`) */
  offplan?: string
  community?: string
  tags: string[]
  tasks: string[]
}

function seeds(formFDeal: string, nocDeal: string): ProjectSeed[] {
  return [
    {
      name: 'Marina Sky Residences launch campaign',
      description: 'Launch of the Emaar Marina Sky Residences allocation: VIP preview evening, Meta & Google lead campaigns, EOI collection and the first-week reservation push for the 70/30 plan.',
      status: 'active', priority: 'high', ownerId: 'emp-4', team: [['offplan', 3], ['marketing', 2], ['sales', 2]], start: -25, due: 35, budget: 180000, spent: 74500, color: '#843f96',
      offplan: 'Marina Sky Residences', community: 'dubai-marina',
      tags: ['Launch', 'Off-plan', 'Paid media', 'EOI'],
      tasks: ['Upload price list & floor plans for Marina Sky to the CRM', 'Collect EOI cheques — first 25 units', 'Launch Meta lead-gen campaign (EN/AR/RU)', 'Brief brokers on payment plan & unit mix', 'Book Marina Yacht Club for VIP preview', 'Send launch WhatsApp broadcast to investor list', 'Shoot drone footage of the plot & marina views', 'Prepare reservation forms and SPA checklist'],
    },
    {
      name: 'Dubai Hills villa inventory drive',
      description: 'Win exclusive mandates for Sidra, Maple and Golf Place villas ahead of the spring peak; target 15 new exclusive listings with professional photography and 360° tours.',
      status: 'active', priority: 'high', ownerId: 'emp-2', team: [['sales', 4], ['marketing', 1]], start: -40, due: 50, budget: 60000, spent: 28400, color: '#1f9d64',
      community: 'dubai-hills',
      tags: ['Listings', 'Exclusive', 'Villas', 'Photography'],
      tasks: ['Call 30 Sidra & Maple owners from the owner database', 'Shoot 360° tour — Maple 2 villa', 'Prepare CMA for Golf Place 5BR', 'Sign Form A with 3 new villa owners', 'Renew Trakheesi permits for 12 listings', 'Door-drop flyers in Sidra 3', 'Publish Dubai Hills market report on the website'],
    },
    {
      name: 'Q1 landlord acquisition — JVC',
      description: 'Grow the leasing & property-management book in Jumeirah Village Circle: 40 landlord meetings, managed-service proposals and fast rent-ready turnarounds.',
      status: 'active', priority: 'medium', ownerId: 'emp-3', team: [['leasing', 3], ['property-management', 2]], start: -18, due: 70, budget: 35000, spent: 9600, color: '#3cb4e8',
      community: 'jvc',
      tags: ['Leasing', 'Landlords', 'Property management'],
      tasks: ['Call 20 JVC landlords with expiring tenancies', 'Send managed-service proposal to Bloom Towers owners', 'List 10 new JVC rentals on Property Finder', 'Snagging & handover check — Belgravia Heights 1BR', 'Run Bayut rental-yield ad for JVC', 'Prepare Ejari renewal reminders for Q1'],
    },
    {
      name: 'Property management portal rollout',
      description: 'Owner & tenant portal: rent statements, maintenance requests, cheque tracking and Ejari documents for all managed units.',
      status: 'active', priority: 'medium', ownerId: 'emp-6', team: [['property-management', 2], ['admin', 1], ['finance', 1]], start: -55, due: 25, budget: 95000, spent: 71200, color: '#275ba8',
      tags: ['Systems', 'Owners', 'Maintenance'],
      tasks: ['Import 180 managed units and tenancies', 'Configure maintenance vendors & SLAs', 'Owner statement template sign-off', 'UAT with 10 pilot landlords', 'Train the PM team on cheque tracking', 'Send portal invitations to owners'],
    },
    {
      name: 'RERA licence renewals 2027',
      description: 'Renew broker cards, the RERA office registration and DED trade licence; book RERA certification exams for new consultants.',
      status: 'active', priority: 'high', ownerId: 'emp-8', team: [['hr', 1], ['admin', 2], ['management', 1]], start: -10, due: 40, budget: 42000, spent: 11800, color: '#d64545',
      tags: ['Compliance', 'RERA', 'Licences'],
      tasks: ['List broker cards expiring in the next 60 days', 'Book RERA exam for 3 new consultants', 'Renew DED trade licence', 'Renew RERA office registration (ORN)', 'Collect updated Emirates ID copies', 'Upload renewed BRN cards to HR files'],
    },
    {
      name: 'Website & CRM integration',
      description: 'Push website enquiries and portal leads straight into the ERP pipeline with auto-assignment by community and language.',
      status: 'planning', priority: 'medium', ownerId: 'emp-5', team: [['marketing', 2], ['admin', 1], ['sales', 1]], start: 7, due: 90, budget: 70000, spent: 4500, color: '#563d96',
      tags: ['Website', 'CRM', 'Leads'],
      tasks: ['Map website enquiry form fields to leads', 'Property Finder & Bayut lead webhooks', 'Auto-assign rules by community & language', 'WhatsApp click-to-chat tracking', 'Sync website listings from the ERP'],
    },
    {
      name: 'Cityscape Global stand',
      description: 'Apex Aora stand at Cityscape Global (Dubai Exhibition Centre): developer co-branding, off-plan launches, lead capture and broker rota.',
      status: 'active', priority: 'high', ownerId: 'emp-5', team: [['marketing', 3], ['offplan', 2], ['sales', 2]], start: -35, due: 20, budget: 220000, spent: 148000, color: '#d9891a',
      tags: ['Events', 'Off-plan', 'Leads'],
      tasks: ['Approve stand design with the fabricator', 'Confirm developer co-branding (Emaar, Sobha, DAMAC)', 'Print brochures for Lagoon Breeze & Hillcrest Park', 'Set up iPad lead-capture forms', 'Publish broker rota for the 3 days', 'Upload price list for Lagoon Breeze'],
    },
    {
      name: 'Lagoon Breeze townhouse sell-out',
      description: 'Sell the remaining DAMAC Lagoon Breeze allocation before the price increase, with a broker incentive and investor webinars.',
      status: 'active', priority: 'medium', ownerId: 'emp-4', team: [['offplan', 2], ['sales', 2]], start: -30, due: 15, budget: 30000, spent: 18900, color: '#a97cc4',
      offplan: 'Lagoon Breeze Townhouses', community: 'damac-lagoons',
      tags: ['Off-plan', 'Townhouses', 'Incentive'],
      tasks: ['Investor webinar — Lagoon Breeze payment plan', `Prepare Form F for ${formFDeal}`, 'Chase developer for 20% instalment confirmation', 'Update availability sheet with DAMAC'],
    },
    {
      name: 'Q3 secondary transfers backlog',
      description: 'Clear the backlog of sale transfers: NOCs, mortgage clearances and trustee-office appointments.',
      status: 'completed', priority: 'medium', ownerId: 'emp-9', team: [['admin', 2], ['finance', 1]], start: -120, due: -20, budget: 12000, spent: 11200, color: '#6b6178',
      tags: ['Conveyancing', 'Transfers'],
      tasks: [`Obtain developer NOC for ${nocDeal}`, 'Book trustee-office transfer appointments', 'Collect manager cheques for 4 transfers', 'Reconcile transfer fees with finance'],
    },
  ]
}

const STANDALONE: [string, string, string[]][] = [
  ['Prepare board report — monthly GCI & pipeline', CURRENT_USER_ID, ['Management']],
  ['Approve Q1 broker hiring plan', CURRENT_USER_ID, ['HR']],
  ['Review commission disputes (2 open)', CURRENT_USER_ID, ['Commission']],
  ['Sign off portal budget — Property Finder & Bayut', CURRENT_USER_ID, ['Marketing']],
  ['Quarterly VAT return preparation', 'emp-7', ['Finance', 'VAT']],
  ['Pay broker commissions for closed deals', 'emp-7', ['Finance', 'Commission']],
  ['Update employee handbook — commission policy', 'emp-8', ['HR']],
  ['Collect 12 post-dated rent cheques — managed units', 'emp-6', ['Property management']],
  ['Train new consultants on Form A/B/F', 'emp-2', ['Training']],
  ['Renew office Ejari & landlord NOC', 'emp-9', ['Admin']],
  ['Plan December sales kick-off', 'emp-8', ['HR']],
  ['Refresh listing photos for top 10 portal listings', 'emp-5', ['Listings']],
]

const DESCRIPTIONS = [
  'Coordinate with the team and keep the checklist up to date.',
  'Share the outcome in the project channel once done.',
  'Check with finance before committing any spend.',
  'Use the latest templates in the shared drive.',
  'Loop in the listing broker for anything owner-facing.',
  'Keep the RERA forms and Trakheesi permit numbers on file.',
]
const CHECKLIST = ['Draft first version', 'Review with manager', 'Share with the owner', 'Get approval', 'Upload to the listing file', 'Update the ERP record', 'Send confirmation email', 'Collect Emirates ID & title deed copies']

function makeData() {
  const r = createRng(1410)
  const liveDeals = deals.collection.all()
  const formFDeal = liveDeals.find((d) => d.stage === 'offer' && d.type !== 'rent')?.code ?? 'DL-3410'
  const nocDeal = liveDeals.find((d) => d.stage === 'closed' && d.type === 'sale')?.code ?? 'DL-3122'
  const opProjects = offplanProjects.collection.all()
  const emps = employees.collection.all().filter((e) => e.status !== 'terminated')
  const projectRows: Project[] = []
  const taskRows: Task[] = []
  let taskNo = 0
  const statusFor = (p: ProjectStatus): TaskStatus =>
    p === 'completed' ? 'done' : p === 'planning' ? r.weighted([['todo', 6], ['in-progress', 2], ['done', 1]] as const) : r.weighted([['todo', 3], ['in-progress', 3], ['review', 1.4], ['done', 3]] as const)
  let openIdx = 0
  const dueFor = (status: TaskStatus, max: number) => {
    if (status === 'done') return Math.min(max, -r.int(1, 25))
    const slot = openIdx++ % 7
    const off = slot === 0 ? -r.int(1, 9) : slot === 1 ? 0 : slot <= 3 ? r.int(1, 6) : r.int(7, 28)
    return Math.min(off, Math.max(max, 0))
  }
  const makeTask = (title: string, projectId: string | null, assigneeId: string, status: TaskStatus, due: number, tagPool: string[]) => {
    taskNo++
    const n = r.int(0, 5)
    const doneRatio = status === 'done' ? 1 : status === 'review' ? 0.85 : status === 'in-progress' ? 0.5 : 0.1
    const checklist: ChecklistItem[] = r.sample(CHECKLIST, n).map((text, i) => ({ id: `ck-${taskNo}-${i}`, text, done: r.next() < doneRatio }))
    const created = -r.int(Math.max(3, -due + 2), Math.max(8, -due + 30))
    taskRows.push({
      id: `tsk-${taskNo}`,
      code: code('TSK', taskNo),
      title,
      description: r.pick(DESCRIPTIONS),
      projectId,
      assigneeId,
      status,
      priority: r.weighted([['low', 2], ['medium', 4], ['high', 2.5]] as const),
      dueDate: dateFromNow(due),
      tags: r.sample(tagPool, r.int(0, 2)),
      checklist,
      comments: r.int(0, 9),
      createdAt: daysFromNow(created, r.int(8, 17), r.int(0, 59)),
      completedAt: status === 'done' ? (r.bool(0.35) ? daysFromNow(-r.int(0, 2), r.int(9, 16), r.int(0, 59)) : daysFromNow(Math.min(due, -1) + r.int(-2, 0), r.int(9, 18), r.int(0, 59))) : null,
    })
  }

  seeds(formFDeal, nocDeal).forEach((s, i) => {
    const members = new Set<string>([s.ownerId])
    for (const [dep, n] of s.team) for (const e of r.sample(emps.filter((x) => x.departmentId === dep), n)) members.add(e.id)
    if (s.team.some(([d]) => d === 'management')) members.add(CURRENT_USER_ID)
    const memberIds = [...members]
    const id = `proj-${i + 1}`
    projectRows.push({
      id,
      code: code('PRJ', i + 1, 3),
      name: s.name,
      description: s.description,
      status: s.status,
      priority: s.priority,
      ownerId: s.ownerId,
      memberIds,
      startDate: dateFromNow(s.start),
      dueDate: dateFromNow(s.due),
      budget: s.budget,
      spent: s.spent,
      color: s.color,
      offplanId: (s.offplan && opProjects.find((p) => p.name === s.offplan)?.id) || null,
      communitySlug: s.community ?? null,
      createdAt: daysFromNow(s.start - r.int(3, 20)),
    })
    for (const title of s.tasks) {
      const status = statusFor(s.status)
      const assignee = memberIds.includes(CURRENT_USER_ID) && r.bool(0.25) ? CURRENT_USER_ID : r.pick(memberIds)
      makeTask(title, id, assignee, status, dueFor(status, s.due), s.tags)
    }
  })
  for (const [title, assignee, tags] of STANDALONE) {
    const status = r.weighted([['todo', 4], ['in-progress', 3], ['review', 1], ['done', 2]] as const)
    makeTask(title, null, assignee, status, dueFor(status, 40), tags)
  }
  return { projectRows, taskRows }
}

let cache: ReturnType<typeof makeData> | null = null
const seeded = () => (cache ??= makeData())

export const projects = createResource<Project>('re-projects', () => seeded().projectRows, { label: 'Project' })
export const tasks = createResource<Task>('re-tasks', () => seeded().taskRows, { label: 'Task' })

export const projectById = (id: string | null | undefined) => (id ? projects.collection.byId(id) : undefined)

/** Open task whose due date is before today. */
export const isTaskOverdue = (t: Pick<Task, 'status' | 'dueDate'>) => t.status !== 'done' && t.dueDate < dateFromNow(0)
/** Open task due today. */
export const isTaskDueToday = (t: Pick<Task, 'status' | 'dueDate'>) => t.status !== 'done' && t.dueDate === dateFromNow(0)

/** Completion of a project from its tasks (0–100) plus counts. */
export function projectProgress(projectId: string, list: readonly Task[] = tasks.collection.all()) {
  const own = list.filter((t) => t.projectId === projectId)
  const done = own.filter((t) => t.status === 'done').length
  return { total: own.length, done, open: own.length - done, overdue: own.filter(isTaskOverdue).length, percent: own.length ? Math.round((done / own.length) * 100) : 0 }
}

/** Open tasks sorted by due date (soonest / most overdue first). Used by the dashboard. */
export function tasksDueSoon(n = 5, opts: { assigneeId?: string } = {}): Task[] {
  return tasks.collection
    .all()
    .filter((t) => t.status !== 'done' && (!opts.assigneeId || t.assigneeId === opts.assigneeId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0))
    .slice(0, n)
}
