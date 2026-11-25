import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/Toast'
import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 md:px-8 md:py-8 print:max-w-none print:p-0">{children}</main>
      </div>
      <CommandPalette />
      <Toaster />
    </div>
  )
}
