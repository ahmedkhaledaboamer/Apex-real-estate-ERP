import { useNavigate } from '@tanstack/react-router'
import { CornerDownLeft, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { NAV } from '@/lib/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCommandOpen } from '@/store/uiSlice'

/** Quick-create actions. List pages open their "new" drawer when the URL has `?new=1`. */
export const QUICK_ACTIONS = [
  { label: 'New lead', to: '/sales/leads' },
  { label: 'New deal', to: '/sales/deals' },
  { label: 'Book a viewing', to: '/sales/viewings' },
  { label: 'New listing', to: '/services' },
  { label: 'New off-plan project', to: '/services/offplan' },
  { label: 'New tenancy', to: '/services/property-management' },
  { label: 'New valuation', to: '/services/valuations' },
  { label: 'New invoice', to: '/finance/invoices' },
  { label: 'Record payment', to: '/finance/payments' },
  { label: 'New expense', to: '/finance/expenses' },
  { label: 'New campaign', to: '/marketing' },
  { label: 'New task', to: '/projects/tasks' },
  { label: 'New event', to: '/events' },
  { label: 'New employee', to: '/hr' },
] as const

interface Item {
  id: string
  label: string
  group: string
  to: string
  isNew?: boolean
  words: string
}

export function CommandPalette() {
  const open = useAppSelector((s) => s.ui.commandOpen)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  // Ctrl/Cmd + K anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        dispatch(setCommandOpen(true))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  useEffect(() => {
    if (open) {
      setQ('')
      setIndex(0)
      requestAnimationFrame(() => input.current?.focus())
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = NAV.flatMap((g) =>
      g.links ? g.links.map((l) => ({ id: l.to, label: l.label, group: g.label, to: l.to, words: `${l.label} ${g.label} ${l.keywords ?? ''}` })) : [{ id: g.to, label: g.label, group: 'Pages', to: g.to, words: g.label }],
    )
    const actions: Item[] = QUICK_ACTIONS.map((a) => ({ id: 'new:' + a.to, label: a.label, group: 'Create', to: a.to, isNew: true, words: a.label + ' create add' }))
    return [...actions, ...pages]
  }, [])

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return items
    return items.filter((i) => terms.every((t) => i.words.toLowerCase().includes(t)))
  }, [q, items])

  if (!open) return null
  const close = () => dispatch(setCommandOpen(false))
  const go = (it: Item) => {
    close()
    navigate({ to: it.to, search: it.isNew ? ({ new: 1 } as never) : undefined })
  }

  let lastGroup = ''
  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade bg-[#0d0812]/50 backdrop-blur-[2px]" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative w-full max-w-[560px] animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-[18px] text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setIndex(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIndex((i) => Math.min(results.length - 1, i + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIndex((i) => Math.max(0, i - 1))
              } else if (e.key === 'Enter' && results[index]) go(results[index])
            }}
            placeholder="Search pages or create something…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-muted">No matches</li>}
          {results.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null
            lastGroup = it.group
            return (
              <li key={it.id}>
                {header && <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">{header}</p>}
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(it)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-[13.5px]', i === index ? 'bg-aura/10 text-fg' : 'text-fg/85')}
                >
                  {it.isNew ? <Plus className="size-4 text-aura" /> : <span className="size-1.5 rounded-full bg-muted/50" />}
                  <span className="flex-1">{it.label}</span>
                  {i === index && <CornerDownLeft className="size-3.5 text-muted" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
