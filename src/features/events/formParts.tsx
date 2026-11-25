import { useCallback, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { cn } from '@/lib/cn'

/* Small form helpers for the Events drawer and detail page (module-local). */

const pad = (n: number) => String(n).padStart(2, '0')
/** ISO → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** datetime-local value → ISO */
export const fromLocalInput = (v: string) => new Date(v).toISOString()

type Rules<T> = Partial<Record<keyof T, (v: T) => string | false | null | undefined>>

export function useForm<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const set = useCallback(<K extends keyof T>(k: K, v: T[K]) => {
    setValues((s) => ({ ...s, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }, [])
  const reset = useCallback((v: T) => {
    setValues(v)
    setErrors({})
  }, [])
  const validate = (rules: Rules<T>) => {
    const next: Partial<Record<keyof T, string>> = {}
    for (const k of Object.keys(rules) as (keyof T)[]) {
      const msg = rules[k]?.(values)
      if (msg) next[k] = msg
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }
  return { values, set, errors, reset, validate }
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}

export function FormFooter({ onCancel, onSave, saving, saveLabel = 'Save' }: { onCancel: () => void; onSave: () => void; saving?: boolean; saveLabel?: string }) {
  return (
    <>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onSave} loading={saving}>
        {saveLabel}
      </Button>
    </>
  )
}

export function NumberInput({ id, value, onChange, min = 0, step = 1, prefix, invalid }: { id?: string; value: number; onChange: (n: number) => void; min?: number; step?: number; prefix?: string; invalid?: boolean }) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted">{prefix}</span>}
      <Input id={id} type="number" min={min} step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} aria-invalid={invalid} className={cn('tabular', prefix && 'ps-12')} />
    </div>
  )
}

export function MiniStat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2/50 p-3">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[18px] font-bold tracking-[-0.01em] tabular">{value}</p>
      {sub && <p className="truncate text-[11.5px] text-muted">{sub}</p>}
    </div>
  )
}
