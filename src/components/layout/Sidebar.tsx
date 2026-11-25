import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, ChevronsLeft, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { NAV, groupForPath, type NavGroup } from '@/lib/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSidebarOpen, toggleSidebarCollapsed } from '@/store/uiSlice'
import { Logo } from './Logo'

export function Sidebar() {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed)
  const mobileOpen = useAppSelector((s) => s.ui.sidebarOpen)
  const dispatch = useAppDispatch()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = groupForPath(pathname)
  const [expanded, setExpanded] = useState<string | null>(active?.id ?? null)

  // Follow navigation: open the group of the current page, close the mobile drawer.
  useEffect(() => {
    if (active) setExpanded(active.id)
    dispatch(setSidebarOpen(false))
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const nav = (isCollapsed: boolean) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV.map((g) => (
        <Group key={g.id} group={g} collapsed={isCollapsed} pathname={pathname} active={active?.id === g.id} expanded={expanded === g.id} onToggle={() => setExpanded((e) => (e === g.id ? null : g.id))} />
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop */}
      <aside className={cn('sticky top-0 hidden h-svh shrink-0 flex-col bg-sidebar print:!hidden text-white transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:flex', collapsed ? 'w-[84px]' : 'w-[264px]')}>
        <SidebarGlow />
        <div className={cn('relative flex h-[72px] items-center px-6', collapsed && 'justify-center px-0')}>
          <Link to="/" aria-label="Dashboard">
            <Logo collapsed={collapsed} />
          </Link>
        </div>
        {nav(collapsed)}
        <div className="relative border-t border-white/8 p-3">
          <button type="button" onClick={() => dispatch(toggleSidebarCollapsed())} className={cn('flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/6 hover:text-white', collapsed && 'justify-center px-0')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <ChevronsLeft className={cn('size-[18px] transition-transform duration-300 rtl:rotate-180', collapsed && 'rotate-180 rtl:rotate-0')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade bg-black/50" onClick={() => dispatch(setSidebarOpen(false))} />
          <aside className="absolute inset-y-0 start-0 flex w-[280px] animate-slide-in-start flex-col bg-sidebar text-white">
            <SidebarGlow />
            <div className="relative flex h-[68px] items-center justify-between px-5">
              <Logo />
              <button type="button" onClick={() => dispatch(setSidebarOpen(false))} className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            {nav(false)}
          </aside>
        </div>
      )}
    </>
  )
}

function SidebarGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-24 -start-24 size-72 rounded-full bg-aura/30 blur-3xl" />
      <div className="absolute -bottom-32 -end-24 size-72 rounded-full bg-royal/25 blur-3xl" />
    </div>
  )
}

function Group({ group, collapsed, pathname, active, expanded, onToggle }: { group: NavGroup; collapsed: boolean; pathname: string; active: boolean; expanded: boolean; onToggle: () => void }) {
  const Icon = group.icon
  const base = 'relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors duration-150'
  const state = active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/6 hover:text-white'
  const marker = active && <span className="absolute inset-y-2 -start-3 w-[3px] rounded-e-full bg-gradient-to-b from-[#c58fd6] to-cyan" />

  if (!group.links || collapsed) {
    return (
      <Link to={group.to} className={cn(base, state, collapsed && 'justify-center px-0')} title={collapsed ? group.label : undefined}>
        {marker}
        <Icon className="size-[19px] shrink-0" />
        {!collapsed && group.label}
      </Link>
    )
  }
  return (
    <div>
      <button type="button" onClick={onToggle} className={cn(base, state)} aria-expanded={expanded}>
        {marker}
        <Icon className="size-[19px] shrink-0" />
        <span className="flex-1 text-start">{group.label}</span>
        <ChevronDown className={cn('size-4 opacity-60 transition-transform duration-200', expanded && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="relative my-1 ms-[21px] space-y-0.5 border-s border-white/10 ps-3">
            {group.links.map((l) => {
              const on = pathname === l.to || (l.to !== group.to && pathname.startsWith(l.to + '/'))
              return (
                <Link key={l.to} to={l.to} className={cn('block rounded-lg px-3 py-2 text-[13px] transition-colors duration-150', on ? 'bg-white/8 font-semibold text-white' : 'text-white/55 hover:text-white')}>
                  {l.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
