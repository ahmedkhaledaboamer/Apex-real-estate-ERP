import { useNavigate } from '@tanstack/react-router'
import { Bell, LogOut, Menu as MenuIcon, Moon, Plus, Search, Settings, Sun, User } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { currentUserId, signOut } from '@/lib/auth'
import { employeeById } from '@/mocks/core'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCommandOpen, setSidebarOpen, toggleTheme } from '@/store/uiSlice'
import { QUICK_ACTIONS } from './CommandPalette'
import { NotificationsPanel } from './Notifications'

export function Topbar() {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.ui.theme)
  const navigate = useNavigate()
  const me = employeeById(currentUserId())
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md print:hidden">
      <div className="flex h-[72px] items-center gap-3 px-4 md:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => dispatch(setSidebarOpen(true))} aria-label="Open menu">
          <MenuIcon className="!size-5" />
        </Button>

        <button
          type="button"
          onClick={() => dispatch(setCommandOpen(true))}
          className="flex h-10 w-full min-w-0 max-w-[420px] items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-[13.5px] text-muted transition-colors hover:border-aura/40"
        >
          <Search className="size-4" />
          <span className="flex-1 truncate text-start">Search or jump to…</span>
          <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold sm:inline">Ctrl K</kbd>
        </button>

        <div className="ms-auto flex items-center gap-1.5">
          <Menu
            items={QUICK_ACTIONS.map((a) => ({ label: a.label, onSelect: () => navigate({ to: a.to, search: { new: 1 } as never }) }))}
            trigger={(p) => (
              <Button {...p} size="md" icon={<Plus />} className="hidden sm:inline-flex">
                Create
              </Button>
            )}
          />
          <Button variant="ghost" size="icon" onClick={() => dispatch(toggleTheme())} aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun className="!size-[19px]" /> : <Moon className="!size-[19px]" />}
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications" aria-expanded={notifOpen}>
              <Bell className="!size-[19px]" />
              <span className="absolute top-2 end-2 size-2 rounded-full bg-danger ring-2 ring-bg" />
            </Button>
            {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
          </div>
          {me && (
            <Menu
              items={[
                { label: 'My profile', icon: <User />, onSelect: () => navigate({ to: '/hr/employees/$employeeId', params: { employeeId: me.id } }) },
                { label: 'Settings', icon: <Settings />, onSelect: () => navigate({ to: '/settings' }) },
                { label: 'Sign out', icon: <LogOut />, danger: true, onSelect: () => {
                    signOut()
                    toast.info('You have been signed out')
                    navigate({ to: '/login', replace: true })
                  },
                },
              ]}
              trigger={(p) => (
                <button type="button" {...p} className={cn('ms-1 flex items-center gap-2.5 rounded-xl p-1 pe-2 transition-colors hover:bg-surface-2')}>
                  <Avatar name={me.name} hue={me.avatarHue} size={34} />
                  <span className="hidden text-start leading-tight md:block">
                    <span className="block text-[13px] font-semibold">{me.name}</span>
                    <span className="block text-[11.5px] text-muted">{me.title}</span>
                  </span>
                </button>
              )}
            />
          )}
        </div>
      </div>
    </header>
  )
}
