import { ChevronDown, Search } from 'lucide-react'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-[10px] border border-line bg-surface px-3 text-[13.5px] text-fg placeholder:text-muted/70 transition-[border-color,box-shadow] duration-150 outline-none hover:border-aura/40 focus:border-aura focus:ring-3 focus:ring-aura/15 disabled:opacity-60 aria-[invalid=true]:border-danger'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-[96px] py-2.5', className)} {...rest} />
})

export interface Option {
  value: string
  label: string
}

/** Native select (fast, accessible, works on mobile) styled to match. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options: readonly Option[]; placeholder?: string }>(function Select(
  { className, options, placeholder, ...rest },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <select ref={ref} className={cn(control, 'h-10 cursor-pointer appearance-none pe-9')} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  )
})

/** Label + control + hint/error. Pass the control as children; `id` is wired automatically. */
export function Field({ label, hint, error, required, className, children }: { label: string; hint?: string; error?: string; required?: boolean; className?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[12.5px] font-semibold text-fg/85">
        {label}
        {required && <span className="ms-0.5 text-danger">*</span>}
      </label>
      {children(id)}
      {error ? <p className="text-[12px] text-danger">{error}</p> : hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  )
}

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input type="search" className={cn(control, 'h-10 ps-9')} {...rest} />
    </div>
  )
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-[13.5px]', className)}>
      <input type="checkbox" className="size-4 cursor-pointer rounded accent-[var(--color-aura)]" {...rest} />
      {label}
    </label>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-3 text-[13.5px]', disabled && 'cursor-not-allowed opacity-60')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-aura' : 'bg-line')}
      >
        <span className={cn('absolute top-[3px] start-[3px] size-4 rounded-full bg-white shadow transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]', checked && 'translate-x-[18px] rtl:-translate-x-[18px]')} />
      </button>
      {label}
    </label>
  )
}

/** Segmented control for small option sets (views, periods). */
export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: readonly { value: T; label: ReactNode }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-surface-2 p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 [&_svg]:size-4',
            size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[12.5px]',
            value === o.value ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
