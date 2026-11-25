import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from './Button'

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
}

/**
 * Side panel for create/edit forms and record details.
 * Put the form in `children`, buttons in `footer`. Width: md (480) | lg (640) | xl (820).
 */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: 'md' | 'lg' | 'xl' }) {
  useEscape(open, onClose)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) panel.current?.focus()
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 animate-fade bg-[#0d0812]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute inset-y-0 end-0 flex w-full animate-slide-in flex-col bg-surface shadow-lift outline-none rtl:[animation-direction:reverse]',
          width === 'md' ? 'max-w-[480px]' : width === 'lg' ? 'max-w-[640px]' : 'max-w-[820px]',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Modal({ open, onClose, title, children, footer, className }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 animate-fade bg-[#0d0812]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={cn('relative w-full max-w-[440px] animate-rise rounded-2xl border border-line bg-surface shadow-lift', className)}>
        {title && (
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="text-[16px] font-semibold">{title}</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <X />
            </Button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pb-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** "Are you sure?" dialog for destructive actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title?: string; message: ReactNode; confirmLabel?: string; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4 pt-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <div className="mt-1 text-[13.5px] text-muted">{message}</div>
        </div>
      </div>
    </Modal>
  )
}
