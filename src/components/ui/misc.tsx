import { Link } from '@tanstack/react-router'
import { ChevronRight, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Page title row used at the top of every screen. */
export function PageHeader({ title, description, actions, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: { label: string; to?: string }[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1 text-[12.5px] text-muted">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 opacity-60" />}
                {b.to ? (
                  <Link to={b.to} className="hover:text-fg">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] md:text-[26px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, message, action, className }: { icon?: ReactNode; title: string; message?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted [&_svg]:size-6">{icon ?? <Inbox />}</span>
      <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-[13px] text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} />
}

export function Progress({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; className?: string }) {
  const color = tone === 'brand' ? 'bg-brand-gradient' : tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-danger'
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/** Label/value pair for detail panels. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[13.5px]">
      <span className="text-muted">{label}</span>
      <span className="text-end font-medium">{children}</span>
    </div>
  )
}

/** Small icon tile used in KPI cards and lists. */
export function IconTile({ children, tone = 'brand', className }: { children: ReactNode; tone?: 'brand' | 'royal' | 'cyan' | 'success' | 'warning' | 'danger'; className?: string }) {
  const t = {
    brand: 'bg-aura/10 text-aura dark:text-[#d6a8e3]',
    royal: 'bg-royal/10 text-royal dark:text-[#8db1e6]',
    cyan: 'bg-cyan/12 text-[#1f8fc0]',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/12 text-warning',
    danger: 'bg-danger/10 text-danger',
  }[tone]
  return <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5', t, className)}>{children}</span>
}

/** Simple underline tabs. */
export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: readonly { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-150',
            value === t.value ? 'border-aura text-fg' : 'border-transparent text-muted hover:text-fg',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cn('rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-aura/10 text-aura' : 'bg-surface-2 text-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
