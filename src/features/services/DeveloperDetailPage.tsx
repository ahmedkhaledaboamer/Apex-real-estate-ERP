import { ArrowLeft, BadgeDollarSign, Building2, Handshake, Mail, Phone, Wallet } from 'lucide-react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DetailRow, EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/StatCard'
import { invoiceTotals } from '@/lib/calc'
import { formatDate, formatMoney, formatMoneyCompact } from '@/lib/format'
import { INVOICE_STATUS } from '@/lib/labels'
import { developerBySlug } from '@/mocks/core'
import { dealById, deals, invoices, offplanProjects } from '@/mocks/domain'
import type { Invoice } from '@/types/domain'
import { developerStats } from './developerStats'
import { ProjectCard } from './OffplanPage'
import { DealsCard, Photo } from './shared'

export function DeveloperDetailPage({ slug }: { slug: string }) {
  const { data: projects } = offplanProjects.useList()
  const { data: allDeals } = deals.useList()
  const { data: allInvoices } = invoices.useList()
  const dev = developerBySlug(slug)

  if (!dev)
    return (
      <Card>
        <EmptyState
          title="Developer not found"
          action={
            <ButtonLink to="/services/developers" variant="outline" icon={<ArrowLeft />}>
              Back to developers
            </ButtonLink>
          }
        />
      </Card>
    )
  const ready = projects && allDeals && allInvoices
  const s = ready ? developerStats(slug, projects, allDeals, allInvoices) : null

  const invColumns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice', sort: (i) => i.number, cell: (i) => <span className="font-semibold text-aura">{i.number}</span> },
    { key: 'deal', header: 'Deal', hideBelow: 'md', cell: (i) => <span className="text-muted">{dealById(i.dealId)?.code ?? '—'}</span> },
    { key: 'issue', header: 'Issued', sort: (i) => i.issueDate, hideBelow: 'sm', cell: (i) => <span className="tabular">{formatDate(i.issueDate)}</span> },
    { key: 'due', header: 'Due', sort: (i) => i.dueDate, hideBelow: 'lg', cell: (i) => <span className="tabular">{formatDate(i.dueDate)}</span> },
    { key: 'total', header: 'Total (incl. VAT)', align: 'end', sort: (i) => invoiceTotals(i).total, cell: (i) => <span className="tabular">{formatMoney(invoiceTotals(i).total)}</span> },
    { key: 'balance', header: 'Balance', align: 'end', sort: (i) => invoiceTotals(i).balance, cell: (i) => <span className="font-semibold tabular">{formatMoney(i.status === 'void' ? 0 : invoiceTotals(i).balance)}</span> },
    { key: 'status', header: 'Status', sort: (i) => i.status, cell: (i) => <StatusBadge value={i.status} map={INVOICE_STATUS} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: 'Services' }, { label: 'Developers', to: '/services/developers' }, { label: dev.name }]} title={dev.name} description={dev.summary} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <Photo src={dev.image} alt="" className="aspect-[16/8]" sizes="(min-width: 1024px) 60vw, 100vw" />
          <CardBody className="space-y-3">
            <p className="text-[14px] leading-relaxed">{dev.description}</p>
            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-[0.04em] text-muted uppercase">Signature projects</p>
              <div className="flex flex-wrap gap-1.5">
                {dev.signatureProjects.map((p) => (
                  <Badge key={p} tone="brand">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Profile" />
            <CardBody className="divide-y divide-line pt-2">
              <DetailRow label="Founded">{dev.founded}</DetailRow>
              <DetailRow label="Headquarters">{dev.hq}</DetailRow>
              <DetailRow label="Units delivered">{dev.deliveredUnits}</DetailRow>
              <DetailRow label="Projects with us">{s?.projects.length ?? '—'}</DetailRow>
            </CardBody>
          </Card>
          {s?.customer && (
            <Card>
              <CardHeader title="Broker relations" subtitle={`${s.customer.name} · ${s.customer.code}`} />
              <CardBody className="space-y-2 text-[13px]">
                <a href={`mailto:${s.customer.email}`} className="flex min-w-0 items-center gap-2 text-muted hover:text-fg">
                  <Mail className="size-4 shrink-0" /> <span className="truncate">{s.customer.email}</span>
                </a>
                <a href={`tel:${s.customer.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-muted hover:text-fg">
                  <Phone className="size-4" /> <span className="tabular">{s.customer.phone}</span>
                </a>
                {s.customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {s.customer.tags.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!s ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Projects" value={s.projects.length} icon={<Building2 />} footnote={`${s.projects.filter((p) => p.status === 'selling' || p.status === 'launching').length} live`} />
            <StatCard label="Deals" value={s.live.length} icon={<Handshake />} tone="royal" footnote={`${s.live.filter((d) => d.stage === 'closed').length} closed`} />
            <StatCard label="GCI earned" value={formatMoneyCompact(s.gci)} icon={<BadgeDollarSign />} tone="success" footnote="Closed off-plan deals" />
            <StatCard label="Outstanding commission" value={formatMoneyCompact(s.outstanding)} icon={<Wallet />} tone={s.overdue ? 'danger' : 'cyan'} footnote={s.overdue ? `${formatMoneyCompact(s.overdue)} overdue` : 'Nothing overdue'} />
          </>
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Projects</h3>
        {s && s.projects.length === 0 ? (
          <Card>
            <EmptyState icon={<Building2 />} title="No projects with this developer yet" />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{s ? s.projects.map((p) => <ProjectCard key={p.id} project={p} deals={allDeals ?? []} />) : <Skeleton className="h-[340px] rounded-card" />}</div>
        )}
      </section>

      <DealsCard deals={s?.deals} loading={!s} title="Deals" subtitle="Off-plan sales across this developer's projects" />

      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Commission invoices</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">Billed to {s?.customer?.name ?? dev.name} · 5% VAT</p>
        </div>
        <DataTable rows={s?.invoices} columns={invColumns} loading={!s} pageSize={8} initialSort={{ key: 'issue', dir: 'desc' }} exportName={`${dev.slug}-invoices`} empty={<EmptyState title="No invoices yet" />} />
      </div>
    </div>
  )
}
