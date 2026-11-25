import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
}

/** Small dropdown menu (row actions "⋯", user menu…). Closes on outside click / Escape. */
export function Menu({ items, trigger, align = 'end', className }: { items: MenuItem[]; trigger?: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode; align?: 'start' | 'end'; className?: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const toggle = () => setOpen((o) => !o)
  return (
    <div ref={root} className={cn('relative inline-flex', className)} onClick={(e) => e.stopPropagation()}>
      {trigger ? (
        trigger({ onClick: toggle, 'aria-expanded': open })
      ) : (
        <Button variant="ghost" size="icon-sm" onClick={toggle} aria-expanded={open} aria-label="Actions">
          <MoreHorizontal />
        </Button>
      )}
      {open && (
        <div role="menu" className={cn('absolute top-full z-50 mt-1.5 min-w-[180px] origin-top animate-rise rounded-xl border border-line bg-surface p-1.5 shadow-lift', align === 'end' ? 'end-0' : 'start-0')}>
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                it.onSelect()
              }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13px] font-medium transition-colors [&_svg]:size-4', it.danger ? 'text-danger hover:bg-danger/10' : 'hover:bg-surface-2')}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
