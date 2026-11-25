import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'

/**
 * Create-drawer state kept in the URL as `?new=1`, so "Create → New booking" in the top bar
 * and the command palette open the right page with its form already open.
 *
 *   const [creating, setCreating] = useCreateParam()
 *   <Button onClick={() => setCreating(true)}>New booking</Button>
 *   <Drawer open={creating} onClose={() => setCreating(false)} …/>
 */
export function useCreateParam() {
  const search = useSearch({ strict: false }) as { new?: unknown }
  const navigate = useNavigate()
  const open = search.new !== undefined && search.new !== false && search.new !== '0'
  const set = useCallback(
    (v: boolean) => {
      navigate({ to: '.', search: ((prev: Record<string, unknown>) => {
        const next = { ...prev }
        if (v) next.new = 1
        else delete next.new
        return next
      }) as never, replace: true })
    },
    [navigate],
  )
  return [open, set] as const
}
