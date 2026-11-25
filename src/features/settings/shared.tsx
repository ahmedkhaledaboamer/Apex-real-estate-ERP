import { RotateCcw, Save } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { settings } from '@/mocks/settings'
import type { AppSettings } from '@/types/settings'

export function useSettings() {
  const { data, isLoading } = settings.useList()
  const update = settings.useUpdate({ silent: true })
  const save = (patch: Partial<AppSettings>, message = 'Settings saved', onDone?: () => void) =>
    update.mutate(
      { id: 'app', patch },
      {
        onSuccess: () => {
          if (message) toast.success(message)
          onDone?.()
        },
      },
    )
  return { s: data?.[0], isLoading, save, saving: update.isPending }
}

/** Local editable copy of a settings value; `dirty` when it differs from the saved one. */
export function useDraft<T>(value: T | undefined) {
  const key = JSON.stringify(value ?? null)
  const [draft, setDraft] = useState<T | undefined>(value)
  useEffect(() => {
    setDraft(value)
  }, [key])
  const dirty = JSON.stringify(draft ?? null) !== key
  return [draft, setDraft as (v: T | ((prev: T) => T)) => void, dirty, () => setDraft(value)] as const
}

export function SectionCard({
  title,
  subtitle,
  dirty,
  saving,
  onSave,
  onReset,
  children,
  bodyClassName,
}: {
  title: string
  subtitle?: string
  dirty?: boolean
  saving?: boolean
  onSave?: () => void
  onReset?: () => void
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        actions={
          onSave && (
            <>
              {dirty && onReset && (
                <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={onReset}>
                  Discard
                </Button>
              )}
              <Button size="sm" icon={<Save />} onClick={onSave} disabled={!dirty} loading={saving}>
                Save changes
              </Button>
            </>
          )
        }
      />
      <CardBody className={bodyClassName}>{children}</CardBody>
    </Card>
  )
}
