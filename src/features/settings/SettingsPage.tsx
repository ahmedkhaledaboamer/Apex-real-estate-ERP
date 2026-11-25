import { Bell, Building2, Coins, Database, HandCoins, Palette, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { PageHeader, Skeleton, Tabs } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { AppearanceSection, CommissionSection, CompanySection, CurrencySection, DataSection, NotificationsSection, UsersSection } from './sections'
import { useSettings } from './shared'

const SECTIONS = [
  { value: 'company', label: 'Company profile', icon: Building2, hint: 'Name, RERA ORN, TRN, licence' },
  { value: 'commission', label: 'Commission', icon: HandCoins, hint: 'Rates and broker splits' },
  { value: 'users', label: 'Users & roles', icon: ShieldCheck, hint: 'Roles and permissions' },
  { value: 'currency', label: 'Currencies & taxes', icon: Coins, hint: 'Exchange rates, VAT' },
  { value: 'notifications', label: 'Notifications', icon: Bell, hint: 'Email and in-app' },
  { value: 'appearance', label: 'Appearance', icon: Palette, hint: 'Theme, sidebar' },
  { value: 'data', label: 'Data', icon: Database, hint: 'Export, reset demo' },
] as const
type Section = (typeof SECTIONS)[number]['value']

function initialSection(): Section {
  const h = location.hash.slice(1)
  return (SECTIONS.find((s) => s.value === h)?.value ?? 'company') as Section
}

export function SettingsPage() {
  const { s, isLoading } = useSettings()
  const [section, setSectionState] = useState<Section>(initialSection)
  const setSection = (v: Section) => {
    setSectionState(v)
    history.replaceState(null, '', `#${v}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company licences, commission rules, access control and preferences." />

      <Tabs className="lg:hidden" value={section} onChange={setSection} tabs={SECTIONS.map((x) => ({ value: x.value, label: x.label }))} />

      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="sticky top-20 hidden p-2 lg:block">
          <nav aria-label="Settings sections" className="space-y-0.5">
            {SECTIONS.map((x) => {
              const on = section === x.value
              return (
                <button
                  key={x.value}
                  type="button"
                  onClick={() => setSection(x.value)}
                  aria-current={on ? 'page' : undefined}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors', on ? 'bg-aura/10 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg')}
                >
                  <x.icon className={cn('size-[18px] shrink-0', on && 'text-aura dark:text-[#d6a8e3]')} />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{x.label}</span>
                    <span className="block truncate text-[11.5px] text-muted">{x.hint}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </Card>

        <div className="min-w-0">
          {isLoading || !s ? (
            <Skeleton className="h-[480px] rounded-card" />
          ) : section === 'company' ? (
            <CompanySection s={s} />
          ) : section === 'commission' ? (
            <CommissionSection s={s} />
          ) : section === 'users' ? (
            <UsersSection s={s} />
          ) : section === 'currency' ? (
            <CurrencySection s={s} />
          ) : section === 'notifications' ? (
            <NotificationsSection s={s} />
          ) : section === 'appearance' ? (
            <AppearanceSection s={s} />
          ) : (
            <DataSection />
          )}
        </div>
      </div>
    </div>
  )
}
